"""Almacenamiento en memoria del catalogo (sin base de datos, como el resto
del proyecto). Se reinicia si el servidor se reinicia.
"""

from app.products.schemas import Product, ProductCreate

_products: list[Product] = []
_next_id = 1


def _seed() -> None:
    global _next_id
    seed_data = [
        ("Camiseta", "ropa", 3400, 19),
        ("Pantalon", "ropa", 8900, 12),
        ("Taza", "hogar", 1500, 0),
        ("Teclado mecanico", "tecnologia", 45900, 7),
    ]
    for name, category, price, stock in seed_data:
        _products.append(Product(id=_next_id, name=name, category=category, price=price, stock=stock))
        _next_id += 1


_seed()


def list_products(category: str | None = None) -> list[Product]:
    if category is None:
        return list(_products)
    normalized = category.strip().lower()
    return [p for p in _products if p.category.lower() == normalized]


def get_product(product_id: int) -> Product | None:
    for product in _products:
        if product.id == product_id:
            return product
    return None


def name_exists(name: str) -> bool:
    normalized = name.strip().lower()
    return any(p.name.strip().lower() == normalized for p in _products)


def create_product(data: ProductCreate) -> Product:
    global _next_id
    product = Product(
        id=_next_id,
        name=data.name,
        category=data.category,
        price=data.price,
        stock=data.stock,
    )
    _products.append(product)
    _next_id += 1
    return product
