from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from contextlib import asynccontextmanager
from .core.config import settings
from .db.database import engine
from .api.api import api_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Test DB Connection on startup
    try:
        async with engine.begin() as conn:
            await conn.execute(text("SELECT 1"))
        print("SUCCESS: Database connection successful!")
    except Exception as e:
        print(f"FAILED: Database connection failed: {e}")
    yield
    await engine.dispose()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    return {"status": "ok", "app": settings.PROJECT_NAME}

app.include_router(api_router, prefix="/api")
