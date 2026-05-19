"""
Sales service: create_sale() orchestrates sale creation, stock deduction, receipt generation.
"""
import logging
from decimal import Decimal

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
    tax_amount: Decimal = Decimal("0"),
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
        tax_amount: Overall tax amount.
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

    # Calculate net amount
    net_amount = total_amount - discount_amount + tax_amount

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
