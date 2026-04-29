"""
Inventory service functions.
"""
import logging
from decimal import Decimal

from django.db import transaction

from apps.core.exceptions import InsufficientStockError
from apps.products.models import Product
from apps.tenants.models import Shop
from .models import MovementType, StockLevel, StockMovement

logger = logging.getLogger(__name__)


def add_stock(
    product: Product,
    shop: Shop,
    quantity: Decimal | float | int,
    reference: str = "",
    notes: str = "",
    created_by=None,
    movement_type: str = MovementType.IN,
) -> StockMovement:
    """
    Add stock to a product at a specific shop.

    Args:
        product: The product to add stock to.
        shop: The shop where stock is added.
        quantity: Amount to add (must be positive).
        reference: Optional reference (PO number, etc.).
        notes: Optional notes.
        created_by: The user performing the action.
        movement_type: Defaults to MovementType.IN.

    Returns:
        The created StockMovement record.
    """
    quantity = Decimal(str(quantity))
    if quantity <= 0:
        raise ValueError("Quantity to add must be a positive number.")

    movement = StockMovement.objects.create(
        product=product,
        shop=shop,
        movement_type=movement_type,
        quantity=quantity,
        reference=reference,
        notes=notes,
        created_by=created_by,
    )
    logger.info("Stock added: product=%s shop=%s qty=%s", product.id, shop.id, quantity)
    return movement


def deduct_stock(
    product: Product,
    shop: Shop,
    quantity: Decimal | float | int,
    reference: str = "",
    notes: str = "",
    created_by=None,
    movement_type: str = MovementType.OUT,
    allow_negative: bool = False,
) -> StockMovement:
    """
    Deduct stock from a product at a specific shop.

    Args:
        product: The product to deduct from.
        shop: The shop where stock is deducted.
        quantity: Amount to deduct (must be positive).
        reference: Optional reference.
        notes: Optional notes.
        created_by: The user performing the action.
        movement_type: Defaults to MovementType.OUT.
        allow_negative: Whether to allow stock going below 0.

    Returns:
        The created StockMovement record.

    Raises:
        InsufficientStockError: If stock would go below 0 and allow_negative is False.
    """
    quantity = Decimal(str(quantity))
    if quantity <= 0:
        raise ValueError("Quantity to deduct must be a positive number.")

    if not allow_negative and product.track_inventory:
        current_qty = get_stock_level(product=product, shop=shop)
        if current_qty < quantity:
            raise InsufficientStockError(
                f"Insufficient stock for '{product.name}'. "
                f"Available: {current_qty}, Requested: {quantity}."
            )

    movement = StockMovement.objects.create(
        product=product,
        shop=shop,
        movement_type=movement_type,
        quantity=-quantity,  # Negative = deduction
        reference=reference,
        notes=notes,
        created_by=created_by,
    )
    logger.info("Stock deducted: product=%s shop=%s qty=%s", product.id, shop.id, quantity)
    return movement


def adjust_stock(
    product: Product,
    shop: Shop,
    new_quantity: Decimal | float | int,
    notes: str = "",
    created_by=None,
) -> StockMovement:
    """
    Set the stock level to a specific quantity (absolute adjustment).

    Args:
        product: The product to adjust.
        shop: The shop where the adjustment is made.
        new_quantity: The target quantity.
        notes: Optional notes.
        created_by: The user performing the action.

    Returns:
        The created StockMovement record.
    """
    new_quantity = Decimal(str(new_quantity))
    current_qty = get_stock_level(product=product, shop=shop)
    difference = new_quantity - current_qty

    movement = StockMovement.objects.create(
        product=product,
        shop=shop,
        movement_type=MovementType.ADJUSTMENT,
        quantity=difference,
        notes=notes or f"Adjustment: {current_qty} → {new_quantity}",
        created_by=created_by,
    )
    logger.info(
        "Stock adjusted: product=%s shop=%s from=%s to=%s",
        product.id, shop.id, current_qty, new_quantity,
    )
    return movement


def get_stock_level(product: Product, shop: Shop) -> Decimal:
    """
    Get the current stock level for a product at a shop.

    Returns:
        Current stock quantity as Decimal. Returns 0 if no record found.
    """
    try:
        stock = StockLevel.objects.get(product=product, shop=shop)
        return stock.quantity
    except StockLevel.DoesNotExist:
        return Decimal("0")


def get_stock_level_by_ids(product_id: str, shop_id: str) -> Decimal:
    """Get stock level using string IDs (useful in Celery tasks)."""
    try:
        stock = StockLevel.objects.get(product_id=product_id, shop_id=shop_id)
        return stock.quantity
    except StockLevel.DoesNotExist:
        return Decimal("0")


def transfer_stock(
    product: Product,
    from_shop: Shop,
    to_shop: Shop,
    quantity: Decimal | float | int,
    notes: str = "",
    created_by=None,
) -> tuple[StockMovement, StockMovement]:
    """
    Transfer stock from one shop to another.

    Returns:
        Tuple of (outgoing_movement, incoming_movement).
    """
    quantity = Decimal(str(quantity))
    reference = f"TRANSFER-{from_shop.id}-to-{to_shop.id}"

    with transaction.atomic():
        out_movement = deduct_stock(
            product=product,
            shop=from_shop,
            quantity=quantity,
            reference=reference,
            notes=notes,
            created_by=created_by,
            movement_type=MovementType.TRANSFER_OUT,
        )
        in_movement = add_stock(
            product=product,
            shop=to_shop,
            quantity=quantity,
            reference=reference,
            notes=notes,
            created_by=created_by,
            movement_type=MovementType.TRANSFER_IN,
        )

    logger.info(
        "Stock transferred: product=%s from=%s to=%s qty=%s",
        product.id, from_shop.id, to_shop.id, quantity,
    )
    return out_movement, in_movement
