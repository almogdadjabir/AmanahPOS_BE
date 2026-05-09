#!/usr/bin/env python3
"""
Update AmanaPOS.postman_collection.json to add business_type support.
Loads the file, applies targeted modifications, writes it back.
"""

import json
import sys

COLLECTION_PATH = "/Users/almogdadjabir/Documents/projects/AmanaPOS/AmanaPOS.postman_collection.json"


def load_collection(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def save_collection(path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def find_folder(items, name):
    """Return the folder dict with the given name."""
    for item in items:
        if item.get("name") == name and "item" in item:
            return item
    raise KeyError(f"Folder '{name}' not found")


def find_item(items, name):
    """Return (index, item) tuple for a named item."""
    for i, item in enumerate(items):
        if item.get("name") == name:
            return i, item
    raise KeyError(f"Item '{name}' not found")


# ── helpers to build Postman request structures ──────────────────────────────

def auth_bearer():
    return {
        "type": "bearer",
        "bearer": [{"key": "token", "value": "{{access_token}}", "type": "string"}]
    }


def header_auth_content():
    """Authorization + Content-Type headers (without type field — matches admin items)."""
    return [
        {"key": "Authorization", "value": "Bearer {{access_token}}", "type": "text"},
        {"key": "Content-Type",  "value": "application/json",        "type": "text"},
    ]


def header_auth_content_tenant_disabled():
    """Authorization + Content-Type + X-Tenant-ID (disabled) — matches sales/inventory items."""
    return [
        {"key": "Authorization", "value": "Bearer {{access_token}}"},
        {"key": "Content-Type",  "value": "application/json"},
        {
            "key": "X-Tenant-ID",
            "value": "{{business_id}}",
            "description": "Override active business (owners only). Defaults to user.business_id.",
            "disabled": True,
        },
    ]


def url_post(path_parts):
    """Build a POST-style URL object. path_parts is a list of path segments (last '' = trailing slash)."""
    raw = "http://localhost:8080/" + "/".join(p for p in path_parts if p != "")
    if not raw.endswith("/"):
        raw += "/"
    return {
        "raw": raw,
        "protocol": "http",
        "host": ["localhost"],
        "port": "8080",
        "path": path_parts,
    }


def url_get_simple(raw_url):
    """Build a simple GET URL with no query params (matches admin GET items)."""
    return {
        "raw": raw_url,
        "host": [raw_url],
        "query": [],
    }


def url_get_structured(path_parts):
    """Build a GET URL like the inventory items."""
    raw = "http://localhost:8080/" + "/".join(p for p in path_parts if p != "") + "/"
    return {
        "raw": raw,
        "protocol": "http",
        "host": ["localhost"],
        "port": "8080",
        "path": path_parts,
    }


def body_raw_json(obj):
    return {
        "mode": "raw",
        "raw": json.dumps(obj, indent=2),
        "options": {"raw": {"language": "json"}},
    }


def event_test(exec_lines):
    return [{"listen": "test", "script": {"type": "text/javascript", "exec": exec_lines}}]


# ── 1. Add collection variable ────────────────────────────────────────────────

def add_restaurant_business_id_variable(data):
    variables = data["variable"]
    # Check it doesn't already exist
    if any(v["key"] == "restaurant_business_id" for v in variables):
        print("  [skip] restaurant_business_id variable already exists")
        return
    # Insert after business_id
    idx_business_id = next(i for i, v in enumerate(variables) if v["key"] == "business_id")
    variables.insert(idx_business_id + 1, {
        "key": "restaurant_business_id",
        "value": "",
        "type": "string",
    })
    print("  [ok] Added restaurant_business_id variable after business_id")


# ── 2. Admin Panel — new items ────────────────────────────────────────────────

def make_admin_create_shop():
    return {
        "name": "Admin — Create Business (shop)",
        "request": {
            "method": "POST",
            "header": header_auth_content(),
            "url": url_post(["api", "v1", "admin", "businesses", "create", ""]),
            "body": body_raw_json({
                "owner_phone": "{{phone}}",
                "name": "Al-Hassan Trading",
                "address": "Khartoum North, Block 5",
                "phone": "+249912345678",
                "email": "shop@example.com",
                "business_type": "shop",
            }),
            "description": "Create a shop-type business. Inventory and stock tracking are enabled. business_type defaults to 'shop' if omitted.",
        },
        "response": [],
        "event": event_test([
            "var r = pm.response.json();",
            "if (r.data && r.data.id) pm.collectionVariables.set('business_id', r.data.id);",
        ]),
    }


def make_admin_create_restaurant():
    return {
        "name": "Admin — Create Business (restaurant)",
        "request": {
            "method": "POST",
            "header": header_auth_content(),
            "url": url_post(["api", "v1", "admin", "businesses", "create", ""]),
            "body": body_raw_json({
                "owner_phone": "{{phone}}",
                "name": "Café Nile",
                "address": "Downtown Khartoum",
                "phone": "+249912345679",
                "email": "cafe@example.com",
                "business_type": "restaurant",
            }),
            "description": "Create a restaurant-type business. Inventory is disabled. Sales do not require or deduct stock. stock[] in bootstrap will be empty.",
        },
        "response": [],
        "event": event_test([
            "var r = pm.response.json();",
            "if (r.data && r.data.id) pm.collectionVariables.set('restaurant_business_id', r.data.id);",
        ]),
    }


def make_admin_update_business_type():
    return {
        "name": "Admin — Update Business Type (to restaurant)",
        "request": {
            "method": "PATCH",
            "header": header_auth_content(),
            "url": {
                "raw": "http://localhost:8080/api/v1/admin/businesses/{{business_id}}/",
                "host": ["http://localhost:8080/api/v1/admin/businesses/{{business_id}}/"],
                "query": [],
            },
            "body": body_raw_json({"business_type": "restaurant"}),
            "description": "Change an existing business to restaurant type. Valid values: shop, restaurant.",
        },
        "response": [],
    }


def make_admin_get_business_detail():
    return {
        "name": "Admin — Get Business Detail (shows business_type)",
        "request": {
            "method": "GET",
            "header": header_auth_content(),
            "url": {
                "raw": "http://localhost:8080/api/v1/admin/businesses/{{business_id}}/",
                "host": ["http://localhost:8080/api/v1/admin/businesses/{{business_id}}/"],
                "query": [],
            },
            "description": "Full business detail including business_type, shops, active subscription.",
        },
        "response": [],
    }


def add_admin_panel_items(data):
    admin_folder = find_folder(data["item"], "Admin Panel")
    existing_names = {item["name"] for item in admin_folder["item"]}

    new_items = [
        ("Admin — Create Business (shop)",                  make_admin_create_shop),
        ("Admin — Create Business (restaurant)",             make_admin_create_restaurant),
        ("Admin — Update Business Type (to restaurant)",     make_admin_update_business_type),
        ("Admin — Get Business Detail (shows business_type)", make_admin_get_business_detail),
    ]

    for name, factory in new_items:
        if name in existing_names:
            print(f"  [skip] '{name}' already exists in Admin Panel")
        else:
            admin_folder["item"].append(factory())
            print(f"  [ok] Appended '{name}' to Admin Panel")


# ── 3. Businesses — update Create Business body ───────────────────────────────

def update_create_business_body(data):
    businesses_folder = find_folder(data["item"], "Businesses")
    _, item = find_item(businesses_folder["item"], "Create Business")
    current_raw = item["request"]["body"]["raw"]
    if "business_type" in current_raw:
        print("  [skip] Create Business body already has business_type")
        return
    new_body = {
        "name": "Amana Store",
        "address": "Khartoum, Sudan",
        "phone": "+249912345678",
        "email": "store@example.com",
        "business_type": "shop",
    }
    item["request"]["body"]["raw"] = json.dumps(new_body, indent=2)
    print("  [ok] Updated Create Business body to include business_type")


# ── 4. Sales — new items ──────────────────────────────────────────────────────

def make_sale_shop():
    return {
        "name": "Create Sale — Shop (with stock deduction)",
        "request": {
            "method": "POST",
            "header": header_auth_content_tenant_disabled(),
            "url": url_post(["api", "v1", "sales", ""]),
            "body": body_raw_json({
                "shop": "{{shop_id}}",
                "customer": "{{customer_id}}",
                "payment_method": "cash",
                "items": [{"product_id": "{{product_id}}", "quantity": "2"}],
                "discount_amount": "0",
                "tax_amount": "0",
            }),
            "auth": auth_bearer(),
            "description": "Sale for a SHOP business. If product.track_inventory=true, stock is validated and deducted. Returns error if insufficient stock.",
        },
        "response": [],
        "event": event_test([
            "",
            "var d = pm.response.json();",
            "if (d.data && d.data.id) pm.collectionVariables.set(\"sale_id\", d.data.id);",
            "",
        ]),
    }


def make_sale_restaurant():
    return {
        "name": "Create Sale — Restaurant (no stock check)",
        "request": {
            "method": "POST",
            "header": header_auth_content_tenant_disabled(),
            "url": url_post(["api", "v1", "sales", ""]),
            "body": body_raw_json({
                "shop": "{{shop_id}}",
                "payment_method": "cash",
                "items": [{"product_id": "{{product_id}}", "quantity": "2"}],
                "discount_amount": "0",
                "tax_amount": "0",
            }),
            "auth": auth_bearer(),
            "description": "Sale for a RESTAURANT business. No StockLevel required. No stock deduction occurs. Sale always succeeds regardless of inventory state.",
        },
        "response": [],
        "event": event_test([
            "var r = pm.response.json();",
            "if (r.data && r.data.id) pm.collectionVariables.set('sale_id', r.data.id);",
        ]),
    }


def add_sales_items(data):
    sales_folder = find_folder(data["item"], "Sales")
    existing_names = {item["name"] for item in sales_folder["item"]}

    new_items = [
        ("Create Sale — Shop (with stock deduction)",    make_sale_shop),
        ("Create Sale — Restaurant (no stock check)",    make_sale_restaurant),
    ]

    for name, factory in new_items:
        if name in existing_names:
            print(f"  [skip] '{name}' already exists in Sales")
        else:
            sales_folder["item"].append(factory())
            print(f"  [ok] Appended '{name}' to Sales")


# ── 5. Inventory — new items ──────────────────────────────────────────────────

def make_stock_levels_restaurant():
    return {
        "name": "Stock Levels — Restaurant (returns empty)",
        "request": {
            "method": "GET",
            "header": [{"key": "Authorization", "value": "Bearer {{access_token}}"}],
            "url": url_get_structured(["api", "v1", "inventory", "stock", ""]),
            "auth": auth_bearer(),
            "description": "For a RESTAURANT tenant, this always returns an empty paginated list: {count:0, results:[]}. Inventory is not applicable for restaurant businesses.",
        },
        "response": [],
    }


def make_add_stock_restaurant():
    return {
        "name": "Add Stock — Restaurant (blocked)",
        "request": {
            "method": "POST",
            "header": [
                {"key": "Authorization", "value": "Bearer {{access_token}}"},
                {"key": "Content-Type",  "value": "application/json"},
            ],
            "url": url_post(["api", "v1", "inventory", "stock", "add", ""]),
            "body": body_raw_json({
                "product": "{{product_id}}",
                "shop": "{{shop_id}}",
                "quantity": "10",
                "movement_type": "restock",
            }),
            "auth": auth_bearer(),
            "description": "For a RESTAURANT tenant, this returns a 400 error: 'Inventory management is not available for restaurant businesses.'",
        },
        "response": [],
    }


def add_inventory_items(data):
    inventory_folder = find_folder(data["item"], "Inventory")
    existing_names = {item["name"] for item in inventory_folder["item"]}

    new_items = [
        ("Stock Levels — Restaurant (returns empty)", make_stock_levels_restaurant),
        ("Add Stock — Restaurant (blocked)",          make_add_stock_restaurant),
    ]

    for name, factory in new_items:
        if name in existing_names:
            print(f"  [skip] '{name}' already exists in Inventory")
        else:
            inventory_folder["item"].append(factory())
            print(f"  [ok] Appended '{name}' to Inventory")


# ── main ──────────────────────────────────────────────────────────────────────

def main():
    print(f"Loading collection from:\n  {COLLECTION_PATH}\n")
    data = load_collection(COLLECTION_PATH)

    print("Step 1: Collection variables")
    add_restaurant_business_id_variable(data)

    print("\nStep 2: Admin Panel items")
    add_admin_panel_items(data)

    print("\nStep 3: Businesses — Create Business body")
    update_create_business_body(data)

    print("\nStep 4: Sales items")
    add_sales_items(data)

    print("\nStep 5: Inventory items")
    add_inventory_items(data)

    print("\nSaving collection …")
    save_collection(COLLECTION_PATH, data)

    # Verify the written file is valid JSON
    print("Verifying JSON …")
    with open(COLLECTION_PATH, "r", encoding="utf-8") as f:
        verified = json.load(f)
    print(f"  [ok] Valid JSON. Collection name: '{verified['info']['name']}'")
    print(f"  [ok] Top-level folders: {[i['name'] for i in verified['item']]}")

    # Quick sanity checks
    vars_keys = [v["key"] for v in verified["variable"]]
    assert "restaurant_business_id" in vars_keys, "MISSING: restaurant_business_id variable"

    admin = find_folder(verified["item"], "Admin Panel")
    admin_names = [i["name"] for i in admin["item"]]
    assert "Admin — Create Business (shop)" in admin_names
    assert "Admin — Create Business (restaurant)" in admin_names
    assert "Admin — Update Business Type (to restaurant)" in admin_names
    assert "Admin — Get Business Detail (shows business_type)" in admin_names

    businesses = find_folder(verified["item"], "Businesses")
    _, cb = find_item(businesses["item"], "Create Business")
    assert "business_type" in cb["request"]["body"]["raw"], "MISSING business_type in Create Business body"

    sales = find_folder(verified["item"], "Sales")
    sales_names = [i["name"] for i in sales["item"]]
    assert "Create Sale — Shop (with stock deduction)" in sales_names
    assert "Create Sale — Restaurant (no stock check)" in sales_names

    inventory = find_folder(verified["item"], "Inventory")
    inv_names = [i["name"] for i in inventory["item"]]
    assert "Stock Levels — Restaurant (returns empty)" in inv_names
    assert "Add Stock — Restaurant (blocked)" in inv_names

    print("\nAll assertions passed. Done.")


if __name__ == "__main__":
    main()
