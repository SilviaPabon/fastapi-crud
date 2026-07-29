"""Endpoints de ejemplo para verificar las reglas de autorizacion (401/403).

Almacenamiento en memoria (lista de Python), sin base de datos. En la
siguiente fase esto se reemplaza por el catalogo real de productos, pero
las reglas de acceso (GET para cualquiera, POST/PATCH solo ADMIN) se
mantienen igual.
"""

from fastapi import APIRouter, Depends, HTTPException, status

from app.auth.dependencies import get_current_user, require_role
from app.resources.schemas import Item, ItemCreate, ItemUpdate

router = APIRouter(prefix="/resources", tags=["resources"])

_items: list[Item] = [Item(id=1, name="Sample item")]
_next_id = 2


@router.get("", response_model=list[Item], dependencies=[Depends(get_current_user)])
def list_items() -> list[Item]:
    # GET: cualquier usuario autenticado (ADMIN o USER) puede acceder.
    return _items


@router.post(
    "",
    response_model=Item,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_role("ADMIN"))],
)
def create_item(payload: ItemCreate) -> Item:
    # POST: require_role("ADMIN") devuelve 403 si el usuario no es ADMIN.
    global _next_id
    item = Item(id=_next_id, name=payload.name)
    _items.append(item)
    _next_id += 1
    return item


@router.patch(
    "/{item_id}",
    response_model=Item,
    dependencies=[Depends(require_role("ADMIN"))],
)
def update_item(item_id: int, payload: ItemUpdate) -> Item:
    # PATCH: misma regla que POST, solo ADMIN.
    for item in _items:
        if item.id == item_id:
            item.name = payload.name
            return item
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
