from app.services.mcp_safety import (
    AZIONI_SAFETY,
    LivelloSafety,
    agente_puo_eseguire_da_solo,
    agente_richiede_conferma,
    livello_di,
)


def test_unknown_action_is_forbidden() -> None:
    assert livello_di("azione_non_classificata") == LivelloSafety.forbidden_to_agent
    assert not agente_puo_eseguire_da_solo("azione_non_classificata")
    assert not agente_richiede_conferma("azione_non_classificata")


def test_read_only_actions_can_run_without_confirmation() -> None:
    assert livello_di("practices.list") == LivelloSafety.read_only
    assert livello_di("contacts.search") == LivelloSafety.read_only
    assert agente_puo_eseguire_da_solo("practices.list")
    assert not agente_richiede_conferma("practices.list")


def test_write_actions_require_confirmation() -> None:
    assert livello_di("notes.create") == LivelloSafety.write_requires_confirmation
    assert livello_di("phases.complete") == LivelloSafety.write_requires_confirmation
    assert not agente_puo_eseguire_da_solo("notes.create")
    assert agente_richiede_conferma("notes.create")


def test_sensitive_actions_are_forbidden() -> None:
    assert livello_di("clients.get") == LivelloSafety.forbidden_to_agent
    assert livello_di("practices.delete") == LivelloSafety.forbidden_to_agent
    assert livello_di("internal.provisioning") == LivelloSafety.forbidden_to_agent


def test_all_classifications_use_known_levels() -> None:
    assert AZIONI_SAFETY
    assert all(isinstance(level, LivelloSafety) for level in AZIONI_SAFETY.values())
