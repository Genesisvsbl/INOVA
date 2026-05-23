from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import models_5s
from database import engine
from router_5s import ensure_columns, router


models_5s.Base.metadata.create_all(bind=engine)
ensure_columns()

app = FastAPI(title="INOVA 5S API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/")
def root():
    return {
        "mensaje": "INOVA 5S API funcionando correctamente",
        "docs": "/docs",
        "status": "ok",
    }
