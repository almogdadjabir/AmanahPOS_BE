from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("tenants", "0002_business_biz_created_at_idx"),
    ]

    operations = [
        migrations.AddField(
            model_name="shop",
            name="is_main",
            field=models.BooleanField(default=False, db_index=True),
        ),
        migrations.AddIndex(
            model_name="shop",
            index=models.Index(fields=["business", "is_main"], name="tenants_sho_busines_is_main_idx"),
        ),
        # Mark the first shop of each business as the main branch
        migrations.RunSQL(
            sql="""
                UPDATE tenants_shops
                SET is_main = TRUE
                WHERE id IN (
                    SELECT DISTINCT ON (business_id) id
                    FROM tenants_shops
                    ORDER BY business_id, created_at ASC
                );
            """,
            reverse_sql="""
                UPDATE tenants_shops SET is_main = FALSE;
            """,
        ),
    ]
