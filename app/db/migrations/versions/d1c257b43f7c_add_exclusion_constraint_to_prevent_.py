"""add exclusion constraint to prevent double booking"""
from alembic import op

# revision identifiers, usa los que ya trae tu archivo generado
revision = "..."
down_revision = "65675e7af422"  # el head actual, confirmalo con tu archivo real
branch_labels = None
depends_on = None


def upgrade():
    op.execute("CREATE EXTENSION IF NOT EXISTS btree_gist;")
    op.execute("""
        ALTER TABLE appointments
        ADD CONSTRAINT no_overlapping_appointments
        EXCLUDE USING gist (
            barber_id WITH =,
            tstzrange(start_time, end_time) WITH &&
        ) WHERE (status <> 'CANCELED');
    """)


def downgrade():
    op.execute("ALTER TABLE appointments DROP CONSTRAINT no_overlapping_appointments;")