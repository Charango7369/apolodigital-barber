"""add missing foreign key on clients tenant_id

Revision ID: b782e7ee6a2b
Revises: 7a96b7348814
Create Date: 2026-07-29 21:29:19.319197

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b782e7ee6a2b'
down_revision: Union[str, Sequence[str], None] = '7a96b7348814'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    op.create_foreign_key(
        "clients_tenant_id_fkey",
        "clients", "tenants",
        ["tenant_id"], ["id"],
        ondelete="CASCADE"
    )


def downgrade():
    op.drop_constraint("clients_tenant_id_fkey", "clients", type_="foreignkey")
