"""Crea la tabella practice_document_requests (checklist documenti) — EPC2-07b

Revision ID: practice_0003
Revises: practice_0002
Create Date: 2026-07-11

Checklist "documenti richiesti/ricevuti" per pratica: ogni voce ha un ciclo di stato
richiesto -> ricevuto -> controllato, con eventuale scadenza consegna, data di ricezione
e riferimento all'allegato quando arriva. Funziona senza portale cliente.

Schema tenant, prefisso practice_, branch label Alembic 'practice'. Solo op.execute(...):
il provisioning runtime (app/provisioning.py) raccoglie le statement via un mini-op che
espone solo execute(). Il modulo `_SCHEMA` viene sovrascritto a runtime col vero schema.
"""

from typing import Sequence

from alembic import op

revision: str = "practice_0003"
down_revision: str | None = "practice_0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_SCHEMA = "tenant_excellia"


def upgrade() -> None:
    op.execute(
        f"""
        CREATE TABLE IF NOT EXISTS "{_SCHEMA}".practice_document_requests (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            practice_id UUID NOT NULL REFERENCES "{_SCHEMA}".practice_practices(id) ON DELETE CASCADE,
            phase_id UUID REFERENCES "{_SCHEMA}".practice_phases(id) ON DELETE SET NULL,
            name TEXT NOT NULL,
            description TEXT,
            status TEXT NOT NULL DEFAULT 'richiesto',
            attachment_id UUID REFERENCES "{_SCHEMA}".practice_attachments(id) ON DELETE SET NULL,
            due_date DATE,
            received_at DATE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            created_by UUID,
            updated_at TIMESTAMPTZ,
            updated_by UUID,
            is_deleted BOOLEAN NOT NULL DEFAULT false,
            deleted_at TIMESTAMPTZ,
            deleted_by UUID,
            deleted_reason TEXT,
            CONSTRAINT ck_practice_docreq_status
                CHECK (status IN ('richiesto', 'ricevuto', 'controllato'))
        )
        """
    )
    op.execute(
        f"""
        CREATE INDEX IF NOT EXISTS ix_practice_document_requests_practice_status
        ON "{_SCHEMA}".practice_document_requests (practice_id, status)
        WHERE is_deleted = false
        """
    )


def downgrade() -> None:
    op.execute(f'DROP TABLE IF EXISTS "{_SCHEMA}".practice_document_requests')
