from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from app.config import settings

# Create async engine
engine = create_async_engine(
    settings.DATABASE_URL,
    pool_recycle=3600,
    pool_size=5,
    max_overflow=10,
    echo=False
)

# CRITICAL: Verify pool_pre_ping is NOT set (causes MissingGreenlet errors with asyncpg)
# Note: We check the engine URL string to ensure pool_pre_ping was not accidentally added
assert 'pool_pre_ping' not in str(engine.url), "pool_pre_ping must not be set with asyncpg"

# Create async session factory
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)

# Base class for models
Base = declarative_base()


# Dependency for FastAPI routes
async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
