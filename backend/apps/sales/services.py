"""
Sales service: create_sale() orchestrates sale creation, stock deduction, receipt generation.
"""
import logging
from decimal import Decimal, ROUND_HALF_UP

from django.db import transaction

from apps.core.exceptions import BankakAccountRequiredError, BusinessLogicError
from apps.core.utils import generate_receipt_number
from apps.inventory.services import deduct_stock, add_stock
from apps.inventory.models import MovementType, StockLevel
from apps.products.models import Product
from apps.tenants.models import Business, BusinessType, Shop
from .models import PaymentMethod, Sale, SaleItem, SaleStatus

logger = logging.getLogger(__name__)


@transaction.atomic
def create_sale(
    tenant: Business,
    shop: Shop,
    cashier,
    items: list[dict],
    payment_method: str = PaymentMethod.CASH,
    customer=None,
    discount_amount: Decimal = Decimal("0"),
    notes: str = "",
    client_sale_id: str | None = None,
    synced_at=None,
) -> Sale:
    """
    Create a complete sale transaction.

    Args:
        tenant: The business making the sale.
        shop: The shop where the sale is made.
        cashier: The user (cashier) processing the sale.
        items: List of dicts: [{product_id, quantity, unit_price, discount}]
        payment_method: Payment method string.
        customer: Optional Customer instance.
        discount_amount: Overall sale discount.
        notes: Optional notes.
        client_sale_id: Mobile UUID for offline idempotency (None for online sales).
        synced_at: Timestamp when this offline sale was received by the server.

    Returns:
        Created Sale instance with all items.

    Raises:
        BusinessLogicError: If any product is not found or out of stock.
    """
    if not items:
        raise BusinessLogicError("Sale must have at least one item.")

    # Cashiers can only sell at their assigned shop
    if cashier.role == "cashier" and cashier.default_shop_id:
        if str(cashier.default_shop_id) != str(shop.id):
            raise BusinessLogicError(
                "You can only create sales for your assigned shop.",
                code="SHOP_MISMATCH",
            )

    # Bankak requires a configured account on the business owner
    bankak_snapshot = ""
    if payment_method == PaymentMethod.BANKAK:
        from apps.accounts.services import get_default_bankak_account
        bankak_account = get_default_bankak_account(tenant.owner)
        if not bankak_account:
            raise BankakAccountRequiredError()
        bankak_snapshot = bankak_account.account_number

    # Resolve products and calculate totals
    total_amount = Decimal("0")
    sale_items_data = []

    for item_data in items:
        try:
            product = Product.objects.select_for_update().get(
                pk=item_data["product_id"],
                tenant=tenant,
                is_active=True,
            )
        except Product.DoesNotExist:
            raise BusinessLogicError(f"Product with ID {item_data['product_id']} not found.")

        quantity = Decimal(str(item_data.get("quantity", 1)))
        # unit_price may be None when client omits it → fall back to product price
        _price = item_data.get("unit_price")
        unit_price = Decimal(str(_price if _price is not None else product.price))
        item_discount = Decimal(str(item_data.get("discount", 0)))
        subtotal = (unit_price * quantity) - item_discount
        total_amount += subtotal

        sale_items_data.append({
            "product": product,
            "quantity": quantity,
            "unit_price": unit_price,
            "discount": item_discount,
            "subtotal": subtotal,
        })

    # Calculate tax and net amount (server-side, single business-wide rate)
    taxable_amount = total_amount - discount_amount

    if tenant.tax_enabled:
        rate = tenant.tax_rate / Decimal("100")
        if tenant.tax_inclusive:
            # Product price already includes tax — extract it for reporting.
            tax_amount = taxable_amount - (taxable_amount / (Decimal("1") + rate))
            net_amount = taxable_amount
        else:
            # Tax added on top of the listed price.
            tax_amount = taxable_amount * rate
            net_amount = taxable_amount + tax_amount

        tax_amount = tax_amount.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        net_amount = net_amount.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    else:
        tax_amount = Decimal("0")
        net_amount = taxable_amount

    # Create the Sale record
    sale = Sale.objects.create(
        tenant=tenant,
        shop=shop,
        cashier=cashier,
        customer=customer,
        receipt_number=generate_receipt_number("REC"),
        total_amount=total_amount,
        discount_amount=discount_amount,
        tax_amount=tax_amount,
        tax_rate=tenant.tax_rate,
        tax_inclusive=tenant.tax_inclusive,
        net_amount=net_amount,
        payment_method=payment_method,
        bankak_account_snapshot=bankak_snapshot,
        status=SaleStatus.COMPLETED,
        notes=notes,
        client_sale_id=client_sale_id or None,
        synced_at=synced_at,
    )

    # Create SaleItem records and deduct stock
    for item_data in sale_items_data:
        product = item_data["product"]

        SaleItem.objects.create(
            sale=sale,
            product=product,
            quantity=item_data["quantity"],
            unit_price=item_data["unit_price"],
            discount=item_data["discount"],
            subtotal=item_data["subtotal"],
        )

        # Skip stock operations entirely for restaurant businesses.
        # Restaurants sell menu items with no inventory concept.
        if tenant.business_type == BusinessType.RESTAURANT:
            continue

        # Deduct inventory if tracking is enabled, or a stock record already exists.
        # track_inventory=False only means "don't enforce sell limits/warnings",
        # not "ignore qty changes entirely".
        has_stock_record = StockLevel.objects.filter(product=product, shop=shop).exists()
        if product.track_inventory or has_stock_record:
            deduct_stock(
                product=product,
                shop=shop,
                quantity=item_data["quantity"],
                reference=sale.receipt_number,
                notes=f"Sale {sale.receipt_number}",
                created_by=cashier,
                movement_type=MovementType.SALE,
                allow_negative=not product.track_inventory,
            )

    # Award loyalty points to customer
    if customer:
        _award_loyalty_points(customer=customer, amount=net_amount)

    logger.info(
        "Sale created: %s | tenant=%s | shop=%s | amount=%s | offline=%s",
        sale.receipt_number, tenant.id, shop.id, net_amount,
        bool(client_sale_id),
    )
    return sale


def cancel_sale(sale: Sale, reason: str = "", cancelled_by=None) -> Sale:
    """Cancel a sale and return stock to inventory."""
    if sale.status in (SaleStatus.CANCELLED, SaleStatus.REFUNDED):
        raise BusinessLogicError(f"Sale {sale.receipt_number} is already {sale.status}.")

    with transaction.atomic():
        # Restaurants have no inventory — skip stock restoration on cancel.
        is_restaurant = sale.tenant.business_type == BusinessType.RESTAURANT

        for item in sale.items.select_related("product").all():
            if not is_restaurant:
                has_stock_record = StockLevel.objects.filter(
                    product=item.product, shop=sale.shop
                ).exists()
                if item.product.track_inventory or has_stock_record:
                    add_stock(
                        product=item.product,
                        shop=sale.shop,
                        quantity=item.quantity,
                        reference=sale.receipt_number,
                        notes=f"Cancellation of sale {sale.receipt_number}: {reason}",
                        created_by=cancelled_by,
                        movement_type=MovementType.RETURN,
                    )

        sale.status = SaleStatus.CANCELLED
        sale.notes = f"{sale.notes}\n[CANCELLED] {reason}".strip()
        sale.save(update_fields=["status", "notes", "updated_at"])

    logger.info("Sale cancelled: %s", sale.receipt_number)
    return sale


def _award_loyalty_points(customer, amount: Decimal) -> None:
    """Award loyalty points: 1 point per 10 currency units spent."""
    points_earned = int(amount / 10)
    if points_earned > 0:
        customer.loyalty_points = (customer.loyalty_points or 0) + points_earned
        customer.save(update_fields=["loyalty_points"])
        logger.debug("Awarded %d loyalty points to customer %s", points_earned, customer.id)


@transaction.atomic
def process_refund(sale: Sale, items: list[dict], notes: str = "", refunded_by=None) -> dict:
    """
    Process a full or partial customer return.

    Returns dict with: refund_reference, refund_total, returned_items, sale
    Raises BusinessLogicError for: cancelled/refunded sale, unknown product, excess quantity.
    """
    # Re-fetch with row lock inside the atomic transaction to prevent concurrent refunds
    sale = Sale.objects.select_for_update().get(pk=sale.pk)

    if sale.status in (SaleStatus.CANCELLED, SaleStatus.REFUNDED):
        raise BusinessLogicError(
            f"Cannot refund a sale with status '{sale.status}'.",
            code="INVALID_SALE_STATUS",
        )

    sale_items_map: dict[str, "SaleItem"] = {
        str(si.product_id): si
        for si in sale.items.select_related("product").all()
    }

    # Sum already-returned qty per product from prior refund stock movements
    from apps.inventory.models import StockMovement
    from django.db.models import Sum
    already_returned: dict[str, Decimal] = {}
    prior_movements = (
        StockMovement.objects
        .filter(
            shop=sale.shop,
            movement_type=MovementType.RETURN,
            reference__startswith=f"{sale.receipt_number}-R",
        )
        .values("product_id")
        .annotate(total=Sum("quantity"))
    )
    for row in prior_movements:
        already_returned[str(row["product_id"])] = row["total"]

    for item_data in items:
        pid = str(item_data["product_id"])
        if pid not in sale_items_map:
            raise BusinessLogicError(
                f"Product {pid} was not part of sale {sale.receipt_number}.",
                code="PRODUCT_NOT_IN_SALE",
            )
        original_qty = sale_items_map[pid].quantity
        returned_so_far = already_returned.get(pid, Decimal("0"))
        remaining_qty = original_qty - returned_so_far
        if Decimal(str(item_data["quantity"])) > remaining_qty:
            raise BusinessLogicError(
                f"Return quantity {item_data['quantity']} exceeds remaining returnable quantity "
                f"{remaining_qty} for product {pid}.",
                code="QUANTITY_EXCEEDED",
            )

    prior_refunds = sale.notes.count("[REFUND]")
    refund_n = prior_refunds + 1
    refund_reference = f"{sale.receipt_number}-R{refund_n}"

    is_restaurant = sale.tenant.business_type == BusinessType.RESTAURANT

    refund_total = Decimal("0")
    returned_items = []

    for item_data in items:
        pid = str(item_data["product_id"])
        original_item = sale_items_map[pid]
        qty = Decimal(str(item_data["quantity"]))
        subtotal = original_item.unit_price * qty

        refund_total += subtotal
        returned_items.append({
            "product_id": pid,
            "product_name": original_item.product.name,
            "quantity": qty,
            "unit_price": original_item.unit_price,
            "subtotal": subtotal,
        })

        if not is_restaurant:
            has_stock_record = StockLevel.objects.filter(
                product=original_item.product, shop=sale.shop
            ).exists()
            if original_item.product.track_inventory or has_stock_record:
                add_stock(
                    product=original_item.product,
                    shop=sale.shop,
                    quantity=qty,
                    reference=refund_reference,
                    notes=f"Return for {refund_reference}: {notes}",
                    created_by=refunded_by,
                    movement_type=MovementType.RETURN,
                )

    total_sold = sum(si.quantity for si in sale_items_map.values())
    total_returned = sum(Decimal(str(i["quantity"])) for i in items)
    new_status = (
        SaleStatus.REFUNDED if total_returned >= total_sold
        else SaleStatus.PARTIAL_REFUND
    )

    refund_note = f"[REFUND] {refund_reference}: {notes}".strip()
    sale.notes = f"{sale.notes}\n{refund_note}".strip()
    sale.status = new_status
    sale.save(update_fields=["status", "notes", "updated_at"])

    logger.info(
        "Refund processed: %s | sale=%s | total=%s",
        refund_reference, sale.receipt_number, refund_total,
    )
    return {
        "refund_reference": refund_reference,
        "refund_total": refund_total,
        "returned_items": returned_items,
        "sale": sale,
    }


def get_sales_report(
    tenant: Business,
    date_from,
    date_to,
    shop: Shop | None = None,
    tz=None,
    request=None,
    top_n: int = 5,
) -> dict:
    """
    Aggregate sales analytics for the mobile dashboard's bento grid:
    summary totals, a trend series, payment method/category/product
    breakdowns, and peak-hour / day-of-week heatmap data.

    date_from/date_to are inclusive `date` objects in `tz` (defaults to
    the tenant's timezone).
    """
    import zoneinfo
    from datetime import datetime, time as dt_time, timedelta

    from django.db.models import Count, Sum
    from django.db.models.functions import (
        ExtractHour,
        ExtractIsoWeekDay,
        TruncDate,
        TruncHour,
    )

    from apps.core.image_service import build_image_url

    tz = tz or zoneinfo.ZoneInfo(tenant.timezone)

    local_start = datetime.combine(date_from, dt_time.min, tzinfo=tz)
    local_end = datetime.combine(date_to, dt_time.min, tzinfo=tz) + timedelta(days=1)
    start_utc = local_start.astimezone(zoneinfo.ZoneInfo("UTC"))
    end_utc = local_end.astimezone(zoneinfo.ZoneInfo("UTC"))

    base_filter = {
        "tenant": tenant,
        "status": SaleStatus.COMPLETED,
        "created_at__gte": start_utc,
        "created_at__lt": end_utc,
    }
    if shop:
        base_filter["shop"] = shop
    base_qs = Sale.objects.filter(**base_filter)

    refund_filter = {
        "tenant": tenant,
        "status__in": [SaleStatus.REFUNDED, SaleStatus.PARTIAL_REFUND],
        "created_at__gte": start_utc,
        "created_at__lt": end_utc,
    }
    if shop:
        refund_filter["shop"] = shop
    refund_qs = Sale.objects.filter(**refund_filter)

    # ── Summary ──────────────────────────────────────────────────────────────
    totals = base_qs.aggregate(gross=Sum("total_amount"), net=Sum("net_amount"), count=Count("id"))
    refund_totals = refund_qs.aggregate(amount=Sum("net_amount"), count=Count("id"))

    gross = totals["gross"] or Decimal("0")
    net = totals["net"] or Decimal("0")
    sales_count = totals["count"] or 0
    avg_sale = (net / sales_count) if sales_count else Decimal("0")

    summary = {
        "gross_sales_amount": float(gross),
        "net_sales_amount": float(net),
        "sales_count": sales_count,
        "average_sale_amount": float(round(avg_sale, 2)),
        "refund_amount": float(refund_totals["amount"] or 0),
        "refund_count": refund_totals["count"] or 0,
    }

    # ── Trend ────────────────────────────────────────────────────────────────
    if date_from == date_to:
        rows = (
            base_qs.annotate(bucket=TruncHour("created_at", tzinfo=tz))
            .values("bucket")
            .annotate(gross=Sum("total_amount"), net=Sum("net_amount"), count=Count("id"))
        )
        bucket_map = {row["bucket"].astimezone(tz).hour: row for row in rows}
        points = [
            {
                "label": f"{hour:02d}:00",
                "gross_amount": float(bucket_map.get(hour, {}).get("gross") or 0),
                "net_amount": float(bucket_map.get(hour, {}).get("net") or 0),
                "sales_count": bucket_map.get(hour, {}).get("count", 0),
            }
            for hour in range(24)
        ]
        interval = "hour"
    else:
        rows = (
            base_qs.annotate(bucket=TruncDate("created_at", tzinfo=tz))
            .values("bucket")
            .annotate(gross=Sum("total_amount"), net=Sum("net_amount"), count=Count("id"))
        )
        bucket_map = {row["bucket"]: row for row in rows}
        points = []
        current = date_from
        while current <= date_to:
            row = bucket_map.get(current, {})
            points.append({
                "label": current.isoformat(),
                "gross_amount": float(row.get("gross") or 0),
                "net_amount": float(row.get("net") or 0),
                "sales_count": row.get("count", 0),
            })
            current += timedelta(days=1)
        interval = "day"

    # ── Payment methods ──────────────────────────────────────────────────────
    payment_methods = [
        {
            "method": row["payment_method"],
            "amount": float(row["amount"] or 0),
            "count": row["count"],
        }
        for row in (
            base_qs.values("payment_method")
            .annotate(amount=Sum("net_amount"), count=Count("id"))
            .order_by("-amount")
        )
    ]

    # ── Top products / categories (from sale items) ─────────────────────────
    item_filter = {
        "sale__tenant": tenant,
        "sale__status": SaleStatus.COMPLETED,
        "sale__created_at__gte": start_utc,
        "sale__created_at__lt": end_utc,
    }
    if shop:
        item_filter["sale__shop"] = shop

    product_rows = list(
        SaleItem.objects.filter(**item_filter)
        .values("product_id")
        .annotate(quantity_sold=Sum("quantity"), gross_amount=Sum("subtotal"))
        .order_by("-gross_amount")[:top_n]
    )
    product_ids = [row["product_id"] for row in product_rows]
    products_map = {p.id: p for p in Product.objects.filter(id__in=product_ids, tenant=tenant)}
    top_products = [
        {
            "product_id": str(row["product_id"]),
            "name": products_map[row["product_id"]].name,
            "quantity_sold": float(row["quantity_sold"] or 0),
            "gross_amount": float(row["gross_amount"] or 0),
            "thumbnail_url": build_image_url(
                products_map[row["product_id"]].thumbnail, request=request,
            ),
        }
        for row in product_rows
        if row["product_id"] in products_map
    ]

    top_categories = [
        {
            "category_id": str(row["product__category_id"]),
            "name": row["product__category__name"],
            "quantity_sold": float(row["quantity_sold"] or 0),
            "gross_amount": float(row["gross_amount"] or 0),
        }
        for row in (
            SaleItem.objects.filter(**item_filter, product__category__isnull=False)
            .values("product__category_id", "product__category__name")
            .annotate(quantity_sold=Sum("quantity"), gross_amount=Sum("subtotal"))
            .order_by("-gross_amount")[:top_n]
        )
    ]

    # ── Peak hours (0-23, local tz) ──────────────────────────────────────────
    hour_map = {
        row["hour"]: row
        for row in (
            base_qs.annotate(hour=ExtractHour("created_at", tzinfo=tz))
            .values("hour")
            .annotate(amount=Sum("net_amount"), count=Count("id"))
        )
    }
    peak_hours = [
        {
            "hour": hour,
            "sales_count": hour_map.get(hour, {}).get("count", 0),
            "amount": float(hour_map.get(hour, {}).get("amount") or 0),
        }
        for hour in range(24)
    ]

    # ── Day of week (ISO 1=Mon..7=Sun, local tz) ─────────────────────────────
    dow_map = {
        row["weekday"]: row
        for row in (
            base_qs.annotate(weekday=ExtractIsoWeekDay("created_at", tzinfo=tz))
            .values("weekday")
            .annotate(amount=Sum("net_amount"), count=Count("id"))
        )
    }
    day_of_week = [
        {
            "weekday": weekday,
            "sales_count": dow_map.get(weekday, {}).get("count", 0),
            "amount": float(dow_map.get(weekday, {}).get("amount") or 0),
        }
        for weekday in range(1, 8)
    ]

    return {
        "range": {"from": date_from.isoformat(), "to": date_to.isoformat()},
        "currency": tenant.currency,
        "summary": summary,
        "trend": {"interval": interval, "points": points},
        "payment_methods": payment_methods,
        "top_products": top_products,
        "top_categories": top_categories,
        "peak_hours": peak_hours,
        "day_of_week": day_of_week,
    }
