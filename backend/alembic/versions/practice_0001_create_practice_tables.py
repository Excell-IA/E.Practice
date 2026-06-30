"""Crea le tabelle practice_* del tenant E.Practice

Revision ID: practice_0001
Revises:
Create Date: 2026-06-26

PR155 - Migrazione module-owned E.Practice sul DB condiviso `ework`.

Le tabelle vivono nello schema tenant (`tenant_excellia`) e hanno prefisso
`practice_`, come da procedura E.Work. Non copiano l'anagrafica: il nuovo
contratto persistente usa target polimorfico E.Contacts (`target_type`,
`target_id`) e conserva `client_id` solo come ponte V0 nullable.

Questa migration vive nel repo del modulo, non nel core E.Work, e usa branch
label Alembic `practice` per evitare collisioni con le migration di piattaforma.
"""

from typing import Sequence

from alembic import op

revision: str = "practice_0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = ("practice",)
depends_on: str | Sequence[str] | None = None

_SCHEMA = "tenant_excellia"


def _audit_columns() -> str:
    return """
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_by UUID,
        updated_at TIMESTAMPTZ,
        updated_by UUID
    """


def _soft_delete_columns() -> str:
    return """
        is_deleted BOOLEAN NOT NULL DEFAULT false,
        deleted_at TIMESTAMPTZ,
        deleted_by UUID,
        deleted_reason TEXT
    """


def upgrade() -> None:
    op.execute(f'CREATE SCHEMA IF NOT EXISTS "{_SCHEMA}"')

    op.execute(
        f"""
        CREATE TABLE IF NOT EXISTS "{_SCHEMA}".practice_categories (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name TEXT NOT NULL,
            group_name TEXT,
            icon TEXT,
            color TEXT,
            description TEXT,
            active BOOLEAN NOT NULL DEFAULT true,
            {_audit_columns()},
            {_soft_delete_columns()},
            CONSTRAINT uq_practice_categories_name UNIQUE (name)
        )
        """
    )
    op.execute(
        f"""
        CREATE UNIQUE INDEX IF NOT EXISTS ix_practice_categories_name_lower
        ON "{_SCHEMA}".practice_categories (lower(name))
        WHERE is_deleted = false
        """
    )

    op.execute(
        f"""
        CREATE TABLE IF NOT EXISTS "{_SCHEMA}".practice_phase_templates (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            category_id UUID NOT NULL REFERENCES "{_SCHEMA}".practice_categories(id),
            order_index INTEGER NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            duration_days INTEGER,
            default_role TEXT,
            active BOOLEAN NOT NULL DEFAULT true,
            {_audit_columns()},
            {_soft_delete_columns()},
            CONSTRAINT uq_practice_phase_templates_order UNIQUE (category_id, order_index)
        )
        """
    )

    op.execute(
        f"""
        CREATE TABLE IF NOT EXISTS "{_SCHEMA}".practice_practices (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            code TEXT NOT NULL,
            title TEXT NOT NULL,
            description TEXT,
            client_id UUID,
            client_token TEXT,
            target_type TEXT,
            target_id UUID,
            target_source TEXT NOT NULL DEFAULT 'econtacts',
            category_id UUID NOT NULL REFERENCES "{_SCHEMA}".practice_categories(id),
            responsible_id UUID,
            apertura DATE NOT NULL,
            scadenza DATE,
            priority TEXT NOT NULL DEFAULT 'media',
            status TEXT NOT NULL,
            completed_at TIMESTAMPTZ,
            {_audit_columns()},
            {_soft_delete_columns()},
            CONSTRAINT uq_practice_practices_code UNIQUE (code),
            CONSTRAINT ck_practice_target_pair
                CHECK ((target_type IS NULL AND target_id IS NULL)
                    OR (target_type IS NOT NULL AND target_id IS NOT NULL)),
            CONSTRAINT ck_practice_subject_present
                CHECK (client_id IS NOT NULL OR target_id IS NOT NULL),
            CONSTRAINT ck_practice_target_type
                CHECK (target_type IS NULL OR target_type IN ('azienda', 'persona')),
            CONSTRAINT ck_practice_priority
                CHECK (priority IN ('bassa', 'media', 'alta')),
            CONSTRAINT ck_practice_status
                CHECK (status IN ('aperta', 'in_attesa', 'sospesa', 'chiusa', 'archiviata'))
        )
        """
    )
    op.execute(
        f"""
        CREATE INDEX IF NOT EXISTS ix_practice_practices_target_status
        ON "{_SCHEMA}".practice_practices (target_type, target_id, status)
        WHERE is_deleted = false
        """
    )
    op.execute(
        f"""
        CREATE INDEX IF NOT EXISTS ix_practice_practices_status_scadenza
        ON "{_SCHEMA}".practice_practices (status, scadenza)
        WHERE is_deleted = false
        """
    )

    op.execute(
        f"""
        CREATE TABLE IF NOT EXISTS "{_SCHEMA}".practice_collaborators (
            practice_id UUID NOT NULL REFERENCES "{_SCHEMA}".practice_practices(id) ON DELETE CASCADE,
            user_id UUID NOT NULL,
            role TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            created_by UUID,
            PRIMARY KEY (practice_id, user_id),
            CONSTRAINT ck_practice_collaborator_role CHECK (role IS NULL OR role IN ('editor', 'viewer'))
        )
        """
    )

    op.execute(
        f"""
        CREATE TABLE IF NOT EXISTS "{_SCHEMA}".practice_phases (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            practice_id UUID NOT NULL REFERENCES "{_SCHEMA}".practice_practices(id) ON DELETE CASCADE,
            template_id UUID REFERENCES "{_SCHEMA}".practice_phase_templates(id),
            order_index INTEGER NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            assignee_id UUID,
            planned_start DATE,
            planned_end DATE,
            actual_start DATE,
            actual_end DATE,
            status TEXT NOT NULL,
            skip_reason TEXT,
            completed_by UUID,
            completed_at TIMESTAMPTZ,
            {_audit_columns()},
            {_soft_delete_columns()},
            CONSTRAINT uq_practice_phases_order UNIQUE (practice_id, order_index),
            CONSTRAINT ck_practice_phase_status
                CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped', 'blocked'))
        )
        """
    )
    op.execute(
        f"""
        CREATE INDEX IF NOT EXISTS ix_practice_phases_practice_status
        ON "{_SCHEMA}".practice_phases (practice_id, status)
        WHERE is_deleted = false
        """
    )

    op.execute(
        f"""
        CREATE TABLE IF NOT EXISTS "{_SCHEMA}".practice_events (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            practice_id UUID NOT NULL REFERENCES "{_SCHEMA}".practice_practices(id) ON DELETE CASCADE,
            phase_id UUID REFERENCES "{_SCHEMA}".practice_phases(id),
            event_type TEXT NOT NULL,
            title TEXT NOT NULL,
            description TEXT,
            event_date DATE NOT NULL,
            event_time TIME,
            author_id UUID NOT NULL,
            visual_position TEXT,
            participant_type TEXT,
            participant_id UUID,
            {_audit_columns()},
            CONSTRAINT ck_practice_event_visual_position
                CHECK (visual_position IS NULL OR visual_position IN ('top', 'bottom')),
            CONSTRAINT ck_practice_event_participant_pair
                CHECK ((participant_type IS NULL AND participant_id IS NULL)
                    OR (participant_type IS NOT NULL AND participant_id IS NOT NULL)),
            CONSTRAINT ck_practice_event_participant_type
                CHECK (participant_type IS NULL OR participant_type IN ('azienda', 'persona'))
        )
        """
    )
    op.execute(
        f"""
        CREATE INDEX IF NOT EXISTS ix_practice_events_practice_date
        ON "{_SCHEMA}".practice_events (practice_id, event_date DESC, created_at DESC)
        """
    )
    op.execute(
        f"""
        CREATE INDEX IF NOT EXISTS ix_practice_events_participant
        ON "{_SCHEMA}".practice_events (participant_type, participant_id, event_date DESC)
        """
    )

    op.execute(
        f"""
        CREATE TABLE IF NOT EXISTS "{_SCHEMA}".practice_notes (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            practice_id UUID NOT NULL REFERENCES "{_SCHEMA}".practice_practices(id) ON DELETE CASCADE,
            phase_id UUID REFERENCES "{_SCHEMA}".practice_phases(id),
            event_id UUID REFERENCES "{_SCHEMA}".practice_events(id),
            content TEXT NOT NULL,
            author_id UUID NOT NULL,
            occurred_at DATE,
            {_audit_columns()},
            {_soft_delete_columns()},
            CONSTRAINT ck_practice_note_single_anchor
                CHECK (phase_id IS NULL OR event_id IS NULL)
        )
        """
    )
    op.execute(
        f"""
        CREATE INDEX IF NOT EXISTS ix_practice_notes_practice_created
        ON "{_SCHEMA}".practice_notes (practice_id, created_at DESC)
        WHERE is_deleted = false
        """
    )

    op.execute(
        f"""
        CREATE TABLE IF NOT EXISTS "{_SCHEMA}".practice_attachments (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            practice_id UUID REFERENCES "{_SCHEMA}".practice_practices(id) ON DELETE CASCADE,
            phase_id UUID REFERENCES "{_SCHEMA}".practice_phases(id),
            event_id UUID REFERENCES "{_SCHEMA}".practice_events(id),
            file_name TEXT NOT NULL,
            mime_type TEXT,
            size_bytes BIGINT NOT NULL,
            storage_key TEXT,
            source TEXT NOT NULL DEFAULT 'local',
            uploaded_by UUID NOT NULL,
            uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            {_audit_columns()},
            {_soft_delete_columns()}
        )
        """
    )
    op.execute(
        f"""
        CREATE INDEX IF NOT EXISTS ix_practice_attachments_practice
        ON "{_SCHEMA}".practice_attachments (practice_id, uploaded_at DESC)
        WHERE is_deleted = false
        """
    )

    op.execute(
        f"""
        CREATE TABLE IF NOT EXISTS "{_SCHEMA}".practice_reminders (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            practice_id UUID NOT NULL REFERENCES "{_SCHEMA}".practice_practices(id) ON DELETE CASCADE,
            phase_id UUID REFERENCES "{_SCHEMA}".practice_phases(id),
            title TEXT NOT NULL,
            target_date DATE NOT NULL,
            days_before INTEGER NOT NULL DEFAULT 0,
            recipient_id UUID NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending',
            {_audit_columns()},
            {_soft_delete_columns()},
            CONSTRAINT ck_practice_reminder_status
                CHECK (status IN ('pending', 'sent', 'dismissed'))
        )
        """
    )
    op.execute(
        f"""
        CREATE INDEX IF NOT EXISTS ix_practice_reminders_due
        ON "{_SCHEMA}".practice_reminders (target_date, status)
        WHERE is_deleted = false
        """
    )

    op.execute(
        f"""
        CREATE TABLE IF NOT EXISTS "{_SCHEMA}".practice_labels (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name TEXT NOT NULL,
            color TEXT NOT NULL,
            scope TEXT NOT NULL DEFAULT 'practice',
            description TEXT,
            {_audit_columns()},
            {_soft_delete_columns()},
            CONSTRAINT uq_practice_labels_name UNIQUE (name),
            CONSTRAINT ck_practice_label_scope CHECK (scope IN ('practice', 'client', 'both'))
        )
        """
    )
    op.execute(
        f"""
        CREATE TABLE IF NOT EXISTS "{_SCHEMA}".practice_label_links (
            practice_id UUID NOT NULL REFERENCES "{_SCHEMA}".practice_practices(id) ON DELETE CASCADE,
            label_id UUID NOT NULL REFERENCES "{_SCHEMA}".practice_labels(id) ON DELETE CASCADE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            created_by UUID,
            PRIMARY KEY (practice_id, label_id)
        )
        """
    )

    op.execute(
        f"""
        CREATE TABLE IF NOT EXISTS "{_SCHEMA}".practice_activity_log (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            actor_id UUID,
            actor_kind TEXT NOT NULL DEFAULT 'human',
            action TEXT NOT NULL,
            entity_type TEXT NOT NULL,
            entity_id UUID NOT NULL,
            practice_id UUID REFERENCES "{_SCHEMA}".practice_practices(id),
            outcome TEXT NOT NULL DEFAULT 'ok',
            correlation_id UUID,
            metadata JSONB,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """
    )
    op.execute(
        f"""
        CREATE INDEX IF NOT EXISTS ix_practice_activity_log_practice_time
        ON "{_SCHEMA}".practice_activity_log (practice_id, created_at DESC)
        """
    )
    op.execute(
        f"""
        CREATE INDEX IF NOT EXISTS ix_practice_activity_log_entity
        ON "{_SCHEMA}".practice_activity_log (entity_type, entity_id)
        """
    )

    op.execute(
        f"""
        CREATE OR REPLACE VIEW "{_SCHEMA}".v_ai_practice_summary AS
        SELECT
            p.id,
            p.code,
            p.client_token,
            p.target_type,
            p.target_id,
            c.name AS category_name,
            p.responsible_id,
            p.apertura,
            p.scadenza,
            p.priority,
            p.status,
            EXTRACT(DAY FROM (now() - p.created_at)) AS giorni_aperta,
            CASE
                WHEN p.scadenza < CURRENT_DATE AND p.status NOT IN ('chiusa', 'archiviata')
                THEN true ELSE false
            END AS in_ritardo
        FROM "{_SCHEMA}".practice_practices p
        JOIN "{_SCHEMA}".practice_categories c ON c.id = p.category_id
        WHERE p.is_deleted = false
        """
    )
    op.execute(
        f"""
        CREATE OR REPLACE VIEW "{_SCHEMA}".v_ai_practice_phases_progress AS
        SELECT
            ph.practice_id,
            p.client_token,
            COUNT(ph.id) AS totale_fasi,
            COUNT(ph.id) FILTER (WHERE ph.status = 'completed') AS fasi_completate,
            COUNT(ph.id) FILTER (WHERE ph.status = 'pending') AS fasi_pending,
            COUNT(ph.id) FILTER (WHERE ph.status = 'in_progress') AS fasi_in_corso,
            COUNT(ph.id) FILTER (WHERE ph.status = 'blocked') AS fasi_bloccate,
            ROUND(
                100.0 * COUNT(ph.id) FILTER (WHERE ph.status = 'completed')
                / NULLIF(COUNT(ph.id), 0)
            ) AS pct_completamento
        FROM "{_SCHEMA}".practice_phases ph
        JOIN "{_SCHEMA}".practice_practices p ON p.id = ph.practice_id
        WHERE ph.is_deleted = false AND p.is_deleted = false
        GROUP BY ph.practice_id, p.client_token
        """
    )


def downgrade() -> None:
    op.execute(f'DROP VIEW IF EXISTS "{_SCHEMA}".v_ai_practice_phases_progress')
    op.execute(f'DROP VIEW IF EXISTS "{_SCHEMA}".v_ai_practice_summary')
    op.execute(f'DROP TABLE IF EXISTS "{_SCHEMA}".practice_activity_log')
    op.execute(f'DROP TABLE IF EXISTS "{_SCHEMA}".practice_label_links')
    op.execute(f'DROP TABLE IF EXISTS "{_SCHEMA}".practice_labels')
    op.execute(f'DROP TABLE IF EXISTS "{_SCHEMA}".practice_reminders')
    op.execute(f'DROP TABLE IF EXISTS "{_SCHEMA}".practice_attachments')
    op.execute(f'DROP TABLE IF EXISTS "{_SCHEMA}".practice_notes')
    op.execute(f'DROP TABLE IF EXISTS "{_SCHEMA}".practice_events')
    op.execute(f'DROP TABLE IF EXISTS "{_SCHEMA}".practice_phases')
    op.execute(f'DROP TABLE IF EXISTS "{_SCHEMA}".practice_collaborators')
    op.execute(f'DROP TABLE IF EXISTS "{_SCHEMA}".practice_practices')
    op.execute(f'DROP TABLE IF EXISTS "{_SCHEMA}".practice_phase_templates')
    op.execute(f'DROP TABLE IF EXISTS "{_SCHEMA}".practice_categories')
