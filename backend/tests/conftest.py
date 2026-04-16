"""
Pytest configuration and fixtures for backend tests.
"""
import asyncio
import os
import pytest
import pytest_asyncio
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from httpx import AsyncClient

# Set test environment variables before importing app modules
os.environ["DATABASE_URL"] = "postgresql+asyncpg://postgres:postgres@db:5432/ts_generator_test"
os.environ["SYNC_DATABASE_URL"] = "postgresql://postgres:postgres@db:5432/ts_generator_test"
os.environ["UPLOAD_DIR"] = "/tmp/test_uploads"
os.environ["TEMPLATE_PATH"] = "/tmp/test_template.docx"

from app.database import Base, get_db
from app.main import app
from app.projects.models import Project
from app.sections.models import SectionData

# Test database URL
TEST_DATABASE_URL = "postgresql+asyncpg://postgres:postgres@db:5432/ts_generator_test"

# Create test engine
test_engine = create_async_engine(
    TEST_DATABASE_URL,
    pool_recycle=3600,
    pool_size=5,
    max_overflow=10,
    echo=False
)

# Create test session factory
TestSessionLocal = async_sessionmaker(
    test_engine,
    class_=AsyncSession,
    expire_on_commit=False
)


@pytest.fixture(scope="session")
def event_loop():
    """Create an event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """Create a fresh database session for each test."""
    # Create all tables
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    # Create session
    async with TestSessionLocal() as session:
        yield session
    
    # Drop all tables after test
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Create a test client with database override."""
    async def override_get_db():
        yield db_session
    
    app.dependency_overrides[get_db] = override_get_db
    
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac
    
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def create_test_project(db_session: AsyncSession):
    """Helper fixture to create a test project."""
    async def _create_project(**kwargs):
        project_data = {
            "solution_name": "Test Solution",
            "solution_full_name": "Test Solution Full Name",
            "client_name": "Test Client",
            "client_location": "Test Location",
            **kwargs
        }
        project = Project(**project_data)
        db_session.add(project)
        await db_session.commit()
        await db_session.refresh(project)
        return project
    
    return _create_project


@pytest_asyncio.fixture
async def create_complete_project(db_session: AsyncSession, create_test_project):
    """Helper fixture to create a project with all required sections."""
    async def _create_complete(**kwargs):
        project = await create_test_project(**kwargs)
        
        # Create all required sections with minimal valid data
        sections = [
            ("cover", {
                "solution_full_name": "Complete Solution",
                "client_name": "Complete Client",
                "client_location": "Complete Location"
            }),
            ("revision_history", {
                "rows": [{"details": "Initial version"}]
            }),
            ("executive_summary", {
                "para1": "<p>Executive summary content</p>"
            }),
            ("introduction", {
                "tender_reference": "REF-001",
                "tender_date": "2024-01-01"
            }),
            ("abbreviations", {
                "rows": [{}] * 13 + [{"abbreviation": "TS"}]
            }),
            ("process_flow", {
                "text": "<p>Process flow description</p>"
            }),
            ("overview", {
                "system_objective": "System objective",
                "existing_system": "Existing system"
            }),
            ("features", {
                "items": [{"title": "Feature 1", "description": "Description 1"}]
            }),
            ("remote_support", {
                "text": "Remote support text"
            }),
            ("documentation_control", {}),
            ("customer_training", {
                "persons": "5",
                "days": "3"
            }),
            ("system_config", {}),
            ("fat_condition", {
                "text": "FAT condition text"
            }),
            ("tech_stack", {
                "rows": [{"component": "Component 1", "technology": "Tech 1"}]
            }),
            ("hardware_specs", {
                "rows": [{"specs_line1": "Spec 1", "maker": "Maker 1"}]
            }),
            ("software_specs", {
                "rows": [{"name": "Software 1"}]
            }),
            ("third_party_sw", {
                "sw4_name": "Third Party SW"
            }),
            ("overall_gantt", {}),
            ("shutdown_gantt", {}),
            ("supervisors", {
                "pm_days": "10",
                "dev_days": "20",
                "comm_days": "5",
                "total_man_days": "35"
            }),
            ("scope_definitions", {}),
            ("division_of_eng", {}),
            ("work_completion", {}),
            ("buyer_obligations", {}),
            ("exclusion_list", {}),
            ("binding_conditions", {}),
            ("cybersecurity", {}),
            ("disclaimer", {}),
            ("value_addition", {
                "text": "<p>Value addition text</p>"
            }),
            ("buyer_prerequisites", {
                "items": ["Prerequisite 1"]
            }),
            ("poc", {
                "name": "POC Name",
                "description": "POC Description"
            })
        ]
        
        for section_key, content in sections:
            section = SectionData(
                project_id=project.id,
                section_key=section_key,
                content=content
            )
            db_session.add(section)
        
        await db_session.commit()
        await db_session.refresh(project)
        return project
    
    return _create_complete
