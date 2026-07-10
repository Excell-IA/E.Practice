"""Classificazione safety delle azioni E.Practice per E.lia/MCP.

Questa tabella e' la fonte unica per stabilire cosa un agente puo' fare:
- read_only: lettura senza effetti, su viste/risposte adatte all'AI.
- write_requires_confirmation: l'agente propone, l'utente conferma.
- forbidden_to_agent: mai via agente, o solo tramite flussi umani dedicati.

Il capability manifest e il catalogo permessi devono derivare da qui, non
riscrivere la classificazione altrove.
"""

from enum import Enum


class LivelloSafety(str, Enum):
    read_only = "read_only"
    write_requires_confirmation = "write_requires_confirmation"
    forbidden_to_agent = "forbidden_to_agent"


AZIONI_SAFETY: dict[str, LivelloSafety] = {
    # --- read_only: consultazione operativa ------------------------------
    "activity.list": LivelloSafety.read_only,
    "attachments.list": LivelloSafety.read_only,
    "categories.list": LivelloSafety.read_only,
    "contacts.get": LivelloSafety.read_only,
    "contacts.list": LivelloSafety.read_only,
    "contacts.search": LivelloSafety.read_only,
    "dashboard.get": LivelloSafety.read_only,
    "practices.get": LivelloSafety.read_only,
    "practices.list": LivelloSafety.read_only,
    "practices.list_events": LivelloSafety.read_only,
    "practices.list_labels": LivelloSafety.read_only,
    "practices.list_phases": LivelloSafety.read_only,
    "reminders.list": LivelloSafety.read_only,
    "search.global": LivelloSafety.read_only,
    "templates.list": LivelloSafety.read_only,
    "templates.preview": LivelloSafety.read_only,
    "users.list": LivelloSafety.read_only,
    # --- write_requires_confirmation: mutazioni operative ----------------
    "attachments.attach": LivelloSafety.write_requires_confirmation,
    "attachments.upload": LivelloSafety.write_requires_confirmation,
    "events.create": LivelloSafety.write_requires_confirmation,
    "events.update": LivelloSafety.write_requires_confirmation,
    "notes.create": LivelloSafety.write_requires_confirmation,
    "notes.delete": LivelloSafety.write_requires_confirmation,
    "notes.update": LivelloSafety.write_requires_confirmation,
    "phases.complete": LivelloSafety.write_requires_confirmation,
    "phases.skip": LivelloSafety.write_requires_confirmation,
    "phases.update": LivelloSafety.write_requires_confirmation,
    "phases.update_status": LivelloSafety.write_requires_confirmation,
    "practices.archive": LivelloSafety.write_requires_confirmation,
    "practices.create": LivelloSafety.write_requires_confirmation,
    "practices.ensure": LivelloSafety.write_requires_confirmation,
    "practices.update": LivelloSafety.write_requires_confirmation,
    # --- forbidden_to_agent: L1, configurazione, cancellazioni, sistema ---
    "attachments.delete": LivelloSafety.forbidden_to_agent,
    "categories.create": LivelloSafety.forbidden_to_agent,
    "categories.delete": LivelloSafety.forbidden_to_agent,
    "clients.create": LivelloSafety.forbidden_to_agent,
    "clients.delete": LivelloSafety.forbidden_to_agent,
    "clients.get": LivelloSafety.forbidden_to_agent,
    "clients.list": LivelloSafety.forbidden_to_agent,
    "clients.list_practices": LivelloSafety.forbidden_to_agent,
    "clients.search": LivelloSafety.forbidden_to_agent,
    "clients.update": LivelloSafety.forbidden_to_agent,
    "contacts.create": LivelloSafety.forbidden_to_agent,
    "contacts.delete": LivelloSafety.forbidden_to_agent,
    "contacts.update": LivelloSafety.forbidden_to_agent,
    "internal.provisioning": LivelloSafety.forbidden_to_agent,
    "practices.delete": LivelloSafety.forbidden_to_agent,
    "session.create": LivelloSafety.forbidden_to_agent,
    "templates.update": LivelloSafety.forbidden_to_agent,
    "users.create": LivelloSafety.forbidden_to_agent,
    "users.delete": LivelloSafety.forbidden_to_agent,
    "users.update": LivelloSafety.forbidden_to_agent,
}


def livello_di(azione: str) -> LivelloSafety:
    """Restituisce il livello safety. Default conservativo: forbidden."""
    return AZIONI_SAFETY.get(azione, LivelloSafety.forbidden_to_agent)


def agente_puo_eseguire_da_solo(azione: str) -> bool:
    """Solo le azioni read_only possono essere eseguite senza conferma."""
    return livello_di(azione) == LivelloSafety.read_only


def agente_richiede_conferma(azione: str) -> bool:
    """True per azioni che l'agente puo' proporre ma non eseguire da solo."""
    return livello_di(azione) == LivelloSafety.write_requires_confirmation
