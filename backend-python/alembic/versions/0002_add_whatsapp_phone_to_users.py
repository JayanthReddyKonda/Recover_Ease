"""add whatsapp_phone to users

Revision ID: 0002_whatsapp_phone
Revises: 0001_image_url
Create Date: 2025-01-02 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

revision = "0002_whatsapp_phone"
down_revision = "0001_image_url"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("whatsapp_phone", sa.String(20), nullable=True),
    )
    op.create_index("ix_users_whatsapp_phone", "users", ["whatsapp_phone"])


def downgrade() -> None:
    op.drop_index("ix_users_whatsapp_phone", table_name="users")
    op.drop_column("users", "whatsapp_phone")
