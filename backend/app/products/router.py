"""Endpoints del catalogo de productos.

Reglas de autorizacion (mismas dependencias que /resources en la fase
anterior): GET requiere solo estar autenticado (get_current_user), POST y
PATCH requieren ademas rol ADMIN (require_role("ADMIN") -> 403 si es USER).
"""

import asyncio

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.auth.dependencies import get_current_user, require_role
from app.products import store
from app.products.schemas import Product, ProductCreate, StockAdjust

router = APIRouter(prefix="/products", tags=["products"])

# Protege las dos operaciones que hacen "leer -> decidir -> escribir" sobre
# la lista en memoria compartida (_products en store.py): crear producto
# (chequeo de nombre duplicado) y ajustar stock (chequeo de que no quede
# negativo). Con el codigo actual, sin ningun `await` dentro de la seccion
# critica, asyncio no cede el control entre el read y el write, asi que dos
# requests concurrentes no podrian entrelazarse igual. El lock no deja de
# ser necesario: es lo que garantiza que la seccion siga siendo atomica el
# dia que agregue algo con `await` ahi adentro (ej. una DB real), y es
# practicamente gratis mientras tanto.
_products_lock = asyncio.Lock()


@router.get("", response_model=list[Product], dependencies=[Depends(get_current_user)])
def list_products(category: str | None = Query(default=None)) -> list[Product]:
    return store.list_products(category)


@router.get("/{product_id}", response_model=Product, dependencies=[Depends(get_current_user)])
def get_product(product_id: int) -> Product:
    product = store.get_product(product_id)
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return product


@router.post(
    "",
    response_model=Product,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_role("ADMIN"))],
)
async def create_product(payload: ProductCreate) -> Product:
    # price > 0, name/category no vacios: ya los valida ProductCreate y
    # FastAPI responde 422 automaticamente si no se cumplen. Aqui solo
    # queda la regla de negocio que Pydantic no puede expresar: nombre
    # duplicado -> 409. El lock evita que dos POST concurrentes con el
    # mismo nombre pasen ambos el chequeo antes de que ninguno haya
    # insertado (check-then-act clasico).
    async with _products_lock:
        if store.name_exists(payload.name):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"A product named '{payload.name}' already exists",
            )
        return store.create_product(payload)


@router.patch(
    "/{product_id}/stock",
    response_model=Product,
    dependencies=[Depends(require_role("ADMIN"))],
)
async def adjust_stock(product_id: int, payload: StockAdjust) -> Product:
    async with _products_lock:
        product = store.get_product(product_id)
        if product is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

        new_stock = product.stock + payload.delta
        if new_stock < 0:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Insufficient stock: available {product.stock}, requested delta {payload.delta}",
            )

        product.stock = new_stock
        return product
