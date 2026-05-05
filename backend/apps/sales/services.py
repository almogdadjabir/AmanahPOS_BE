"""
Sales service: create_sale() orchestrates sale creation, stock deduction, receipt generation.
"""
import logging
from decimal import Decimal

from django.db import transaction

from apps.core.exceptions import BankakAccountRequiredError, BusinessLogicError
from apps.core.utils import generate_receipt_number
from apps.inventory.services import deduct_stock
from apps.inventory.models import MovementType
from apps.products.models import Product
from apps.tenants.models import Business, Shop
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

        # Deduct inventory
        if product.track_inventory:
            deduct_stock(
                product=product,
                shop=shop,
                quantity=item_data["quantity"],
                reference=sale.receipt_number,
                notes=f"Sale {sale.receipt_number}",
                created_by=cashier,
                movement_type=MovementType.SALE,
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
        for item in sale.items.select_related("product").all():
            if item.product.track_inventory:
                from apps.inventory.services import add_stock
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
