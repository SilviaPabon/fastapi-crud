from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.auth.router import router as auth_router
from app.core.config import CORS_ORIGINS
from app.resources.router import router as resources_router

app = FastAPI(title="Tech Test API")

# CORS: sin esto, el navegador bloquea las llamadas del frontend (otro
# origen: puerto distinto) por la Same-Origin Policy. allow_credentials=True
# porque mas adelante podriamos necesitar cookies; con solo Bearer token
# en el header no seria estrictamente necesario.
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(resources_router)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}
