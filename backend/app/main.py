import importlib
import os
import pkgutil

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import apps

app = FastAPI(title="AI Workbench API")

frontend_origin = os.getenv("FRONTEND_URL", "https://<your-app>.vercel.app")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", frontend_origin],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health():
    return {"status": "ok"}


for module_info in pkgutil.iter_modules(apps.__path__):
    module = importlib.import_module(f"app.apps.{module_info.name}")
    if hasattr(module, "router"):
        app.include_router(module.router, prefix=f"/api/{module_info.name}")
