# Ejercicio de depuración

## Errores

- `if new_stock <= 0:`

Supongamos que nuestro stock es 5, si ponemos como delta -5, nos dará 0 y arrojará la exepción, generando que nunca podamos establecer que tenemos stock 0.

- `options={"verify_exp": False}`

Esto está desactivando la verificación de expiración, debe de ponerse en True para que se cuide el ciclo de vida del token como se ha definido.

- `adjust_stock` sin ningún principio acid

Esta función no está considerando múltiples llamados al stock, mientras alguien solicita un producto y se retira del stock, alguien más puede estar intentando lo mismo, creyendo que aún hay pero no es así. Hace falta algún tipo de manejo async await para prevenir esto.