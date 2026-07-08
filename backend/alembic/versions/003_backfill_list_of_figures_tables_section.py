"""Backfill list_of_figures_tables section for existing projects

Revision ID: 003
Revises: 002
Create Date: 2026-07-08 00:00:00.000000
"""
import uuid

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from sqlalchemy.sql import table, column

# revision identifiers, used by Alembic.
revision = '003'
down_revision = '002'
branch_labels = None
depends_on = None

SECTION_KEY = 'list_of_figures_tables'

# Lightweight table references for a data-only migration.
# (Intentionally not importing the ORM models — alembic migrations should
# stay decoupled from application code that can change over time.)
projects_table = table(
    'projects',
    column('id', postgresql.UUID(as_uuid=True)),
)
section_data_table = table(
    'section_data',
    column('id', postgresql.UUID(as_uuid=True)),
    column('project_id', postgresql.UUID(as_uuid=True)),
    column('section_key', sa.String),
    column('content', postgresql.JSONB),
)


def upgrade() -> None:
    bind = op.get_bind()

    all_project_ids = {row[0] for row in bind.execute(sa.select(projects_table.c.id))}

    already_has_section = {
        row[0]
        for row in bind.execute(
            sa.select(section_data_table.c.project_id).where(
                section_data_table.c.section_key == SECTION_KEY
            )
        )
    }

    missing_project_ids = all_project_ids - already_has_section

    if missing_project_ids:
        bind.execute(
            section_data_table.insert(),
            [
                {
                    "id": uuid.uuid4(),
                    "project_id": project_id,
                    "section_key": SECTION_KEY,
                    "content": {},
                }
                for project_id in missing_project_ids
            ],
        )


def downgrade() -> None:
    bind = op.get_bind()
    bind.execute(
        section_data_table.delete().where(
            section_data_table.c.section_key == SECTION_KEY
        )
    )
