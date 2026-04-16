import sys
import subprocess
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from fastapi.staticfiles import StaticFiles
from sqlalchemy.exc import IntegrityError
from pathlib import Path

from app.config import settings

app = FastAPI(title="TS Document Generator API")

# Ensure upload directory exists
Path(settings.UPLOAD_DIR).mkdir(parents=True, exist_ok=True)

# Mount static files for uploads
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Global exception handlers
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors()}
    )


@app.exception_handler(IntegrityError)
async def integrity_exception_handler(request: Request, exc: IntegrityError):
    return JSONResponse(
        status_code=409,
        content={"detail": "Database integrity constraint violated"}
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc)}
    )


# Startup event to run Alembic migrations
@app.on_event("startup")
async def run_migrations():
    try:
        result = subprocess.run(
            ["alembic", "upgrade", "head"],
            cwd="/app",
            capture_output=True,
            text=True,
            check=True
        )
        print("Alembic migrations completed successfully")
        print(result.stdout)
    except subprocess.CalledProcessError as e:
        print(f"Alembic migration failed: {e.stderr}")
        sys.exit(1)


# Import routers
from app.projects.router import router as projects_router
from app.sections.router import router as sections_router
from app.generation.router import router as generation_router
from app.images.router import router as images_router
from app.ai_prompts.router import router as ai_prompts_router

# Register routers
app.include_router(projects_router)
app.include_router(sections_router)
app.include_router(generation_router)
app.include_router(images_router)
app.include_router(ai_prompts_router)


@app.get("/")
async def root():
    return {"message": "TS Document Generator API"}
