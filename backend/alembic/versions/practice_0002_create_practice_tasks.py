"""Crea la tabella practice_tasks (task assegnabili) — EPC2-01

Revision ID: practice_0002
Revises: practice_0001
Create Date: 2026-07-11

Aggiunge l'oggetto Task assegnabile a un collaboratore interno, distinto dalle
fasi del template: attivita ad-hoc con assegnatario, scadenza, priorita, stato
(colonne Kanban) e % avanzamento. Puo' agganciarsi opzionalmente a una fase.

Vive nello schema tenant, prefisso practice_, branch label Alembic 'practice'
(come practice_0001). Usa SOLO op.execute(...) perche' il provisioning runtime di
E.Practice (app/provisioning.py::_ddl_statements_for_schema) raccoglie le statement
via un mini-op che espone esclusivamente execute(): metodi Alembic diversi (create_table,
add_column, ...) romperebbero quel percorso. Il modulo `_SCHEMA` viene sovrascritto a
runtime col vero schema tenant.
"""

from typing import Sequence

from alembic import op

revision: str = "practice_0002"
down_revision: str | None = "practice_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_SCHEMA = "tenant_excellia"


def upgrade() -> None:
    op.execute(
        f"""
        CREATE TABLE IF NOT EXISTS "{_SCHEMA}".practice_tasks (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            practice_id UUID NOT NULL REFERENCES "{_SCHEMA}".practice_practices(id) ON DELETE CASCADE,
            phase_id UUID REFERENCES "{_SCHEMA}".practice_phases(id) ON DELETE SET NULL,
            title TEXT NOT NULL,
            description TEXT,
            assignee_id UUID,
            priority TEXT NOT NULL DEFAULT 'media',
            status TEXT NOT NULL DEFAULT 'da_fare',
            due_date DATE,
            completion_pct INTEGER NOT NULL DEFAULT 0,
            completed_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            created_by UUID,
            updated_at TIMESTAMPTZ,
            updated_by UUID,
            is_deleted BOOLEAN NOT NULL DEFAULT false,
            deleted_at TIMESTAMPTZ,
            deleted_by UUID,
            deleted_reason TEXT,
            CONSTRAINT ck_practice_task_priority CHECK (priority IN ('bassa', 'media', 'alta')),
            CONSTRAINT ck_practice_task_status
                CHECK (status IN ('da_fare', 'in_corso', 'bloccato', 'completato', 'annullato')),
            CONSTRAINT ck_practice_task_pct CHECK (completion_pct BETWEEN 0 AND 100)
        )
        """
    )
    op.execute(
        f"""
        CREATE INDEX IF NOT EXISTS ix_practice_tasks_practice_status
        ON "{_SCHEMA}".practice_tasks (practice_id, status)
        WHERE is_deleted = false
        """
    )
    op.execute(
        f"""
        CREATE INDEX IF NOT EXISTS ix_practice_tasks_assignee_due
        ON "{_SCHEMA}".practice_tasks (assignee_id, due_date)
        WHERE is_deleted = false
        """
    )


def downgrade() -> None:
    op.execute(f'DROP TABLE IF EXISTS "{_SCHEMA}".practice_tasks')
