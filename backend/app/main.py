import importlib
import os
import pkgutil

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

from app import apps

app = FastAPI(title="AI Workbench API")

origins = [
    origin.strip().rstrip("/")
    for origin in os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https://manav-mishra-genai-portfolio(-[a-z0-9-]+)?\.vercel\.app",
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
