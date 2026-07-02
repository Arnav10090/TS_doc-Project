"""Add ts_type column to projects

Revision ID: 002
Revises: 001
Create Date: 2024-01-15 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '002'
down_revision = '001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add nullable ts_type column to projects table
    # Column is nullable to preserve legacy projects created before this feature
    # Business rule: new project creation API must validate and require non-null ts_type
    op.add_column('projects', sa.Column('ts_type', sa.String(), nullable=True))


def downgrade() -> None:
    # Remove ts_type column
    op.drop_column('projects', 'ts_type')
