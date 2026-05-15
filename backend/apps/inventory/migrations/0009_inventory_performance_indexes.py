from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("inventory", "0008_inboundtransaction_vendor"),
    ]

    operations = [
        # ProductBatch: filter by shop+expiry together (expiry report)
        migrations.AddIndex(
            model_name="productbatch",
            index=models.Index(
                fields=["shop", "expiry_date"],
                name="inv_batch_shop_expiry_idx",
            ),
        ),
        # ProductBatch: filter by product+expiry (batch lookups per product)
        migrations.AddIndex(
            model_name="productbatch",
            index=models.Index(
                fields=["product", "expiry_date"],
                name="inv_batch_prod_expiry_idx",
            ),
        ),
        # StockLevel: low-stock queries compare quantity against min_stock_level
        migrations.AddIndex(
            model_name="stocklevel",
            index=models.Index(
                fields=["shop", "quantity"],
                name="inv_sl_shop_qty_idx",
            ),
        ),
    ]
