"""Dump dell'OpenAPI schema dell'app FastAPI in JSON.

Uso (dalla cartella backend/):
    .venv/Scripts/python.exe -m scripts.dump_openapi > ../frontend/openapi.json

Poi nel frontend Codex genera i tipi con:
    npx openapi-typescript openapi.json -o lib/api-types.ts

Lo script NON avvia il server: importa l'app, estrae lo schema e stampa.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

# Assicura che `backend/` sia in sys.path indipendentemente da come lanci lo script.
_BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))

from app.main import app  # noqa: E402


def main() -> int:
    # Reset cache per essere sicuri di leggere lo stato completo dei router.
    app.openapi_schema = None
    schema = app.openapi()
    print(
        f"DEBUG: {len(app.routes)} routes registered",
        file=sys.stderr,
    )
    out_arg = sys.argv[1] if len(sys.argv) > 1 else None
    payload = json.dumps(schema, indent=2, ensure_ascii=False)
    if out_arg:
        out_path = Path(out_arg)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(payload, encoding="utf-8")
        print(
            f"OpenAPI schema written to {out_path} ({len(schema['paths'])} paths)", file=sys.stderr
        )
    else:
        sys.stdout.write(payload)
    return 0


if __name__ == "__main__":
    sys.exit(main())
