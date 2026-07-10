import json
from pathlib import Path

from app.services.mcp_safety import LivelloSafety, livello_di

MANIFEST_PATH = Path(__file__).resolve().parents[2] / "elia_capability_manifest.json"


def _manifest() -> dict[str, object]:
    return json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))


def test_capability_manifest_has_required_shape() -> None:
    manifest = _manifest()

    assert manifest["module"] == "e-practice"
    assert manifest["safety_source"] == "backend/app/services/mcp_safety.py"
    assert manifest["ai_safe_views"] == [
        "v_ai_practice_summary",
        "v_ai_practice_phases_progress",
    ]

    actions = manifest["actions"]
    assert isinstance(actions, list)
    assert actions


def test_capability_manifest_actions_have_required_fields() -> None:
    actions = _manifest()["actions"]
    assert isinstance(actions, list)

    required = {
        "nome",
        "descrizione",
        "parametri",
        "precondizioni",
        "rischio",
        "viste_ai_safe",
        "crediti",
    }
    for action in actions:
        assert isinstance(action, dict)
        assert required <= set(action)


def test_capability_manifest_safety_matches_source_table() -> None:
    actions = _manifest()["actions"]
    assert isinstance(actions, list)

    for action in actions:
        assert isinstance(action, dict)
        name = action["nome"]
        risk = action["rischio"]
        assert isinstance(name, str)
        assert risk in {level.value for level in LivelloSafety}
        assert risk == livello_di(name).value
