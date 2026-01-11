# apps/api/ml_utils.py

GROCERY_MERCHANTS = {
    "walmart",
    "no frills",
    "freshco",
    "loblaws",
    "real canadian superstore",
    "shoppers drug mart",
    "sobeys",
    "metro",
    "food basics",
    "costco",
    "longo's",
    "save-on-foods",
}

def normalize(text: str) -> str:
    return (text or "").strip().lower()

def merchant_to_category(merchant_or_category: str) -> str:
    m = normalize(merchant_or_category)

    if m in {"dining", "restaurant", "restaurants"}:
        return "dining"

    if m in {"flights", "flight", "airline", "airlines"}:
        return "flights"

    if m in GROCERY_MERCHANTS:
        return "groceries"

    return "other"