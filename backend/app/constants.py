"""Costanti del modulo E.Practice.

`MODULE_NAME` è obbligatorio dallo standard E.Work (Pattern di Integrazione nei
Moduli). Usato per logging, tag LLM (in V2), naming risorse cloud.
"""

from typing import Final

MODULE_NAME: Final[str] = "e-practice"
"""Identificativo del modulo. Standard E.Work: kebab-case, mai cambiato dopo deploy."""

DEMO_TENANT_ID: Final[str] = "demo"
"""Tenant V0 hardcoded. In V1+ verrà ricavato dal JWT della shell E.Work."""

API_PREFIX: Final[str] = "/api"
"""Prefisso degli endpoint REST del modulo."""

USER_HEADER: Final[str] = "X-User-Id"
"""Header HTTP che porta l'identità dell'utente attivo in V0 (dropdown demo)."""
