import uuid
from sqlalchemy import Column, String, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base


class Project(Base):
    __tablename__ = "projects"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    solution_name = Column(String, nullable=False)
    solution_full_name = Column(String, nullable=False)
    solution_abbreviation = Column(String, nullable=True)
    client_name = Column(String, nullable=False)
    client_location = Column(String, nullable=False)
    client_abbreviation = Column(String, nullable=True)
    ref_number = Column(String, nullable=True)
    doc_date = Column(String, nullable=True)
    doc_version = Column(String, default="0")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    sections = relationship("SectionData", back_populates="project", cascade="all, delete-orphan")
    versions = relationship("DocumentVersion", back_populates="project", cascade="all, delete-orphan")
