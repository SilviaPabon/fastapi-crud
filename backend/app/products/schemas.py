from pydantic import BaseModel, Field, field_validator


class ProductCreate(BaseModel):
    # No hay campo "id" aqui a proposito: si el cliente lo envia en el body,
    # Pydantic lo ignora (comportamiento por defecto), asi que el id siempre
    # lo asigna el backend.
    name: str = Field(min_length=1)
    category: str = Field(min_length=1)
    price: float = Field(gt=0)
    stock: int = Field(ge=0, default=0)

    @field_validator("name", "category")
    @classmethod
    def not_blank(cls, value: str) -> str:
        # Field(min_length=1) deja pasar strings de solo espacios (" ");
        # este validator los rechaza tambien (dispara el mismo 422).
        stripped = value.strip()
        if not stripped:
            raise ValueError("must not be blank")
        return stripped


class StockAdjust(BaseModel):
    delta: int


class Product(BaseModel):
    id: int
    name: str
    category: str
    price: float
    stock: int
