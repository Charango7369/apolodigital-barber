"""make services is_active not null with default"""
from alembic import op
import sqlalchemy as sa

revision = "7a96b7348814"
down_revision = "d8bbd43fdb2f"
branch_labels = None
depends_on = None


def upgrade():
    op.execute("UPDATE services SET is_active = true WHERE is_active IS NULL;")

    op.alter_column(
        'services', 'is_active',
        existing_type=sa.Boolean(),
        nullable=False,
        server_default=sa.true()
    )


def downgrade():
    op.alter_column(
        'services', 'is_active',
        existing_type=sa.Boolean(),
        nullable=True,
        server_default=None
    )