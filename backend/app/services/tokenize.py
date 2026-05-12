"""Client token helpers."""

import hashlib
import os
from uuid import UUID


def tokenize(client_id: str | UUID, salt: str | None = None) -> str:
    """Return sha256(client_id + tenant salt).

    F3 cannot touch config.py, so TENANT_SALT is read directly from the
    environment with a V0 demo fallback. A later settings pass can centralize it.
    """

    tenant_salt = salt or os.environ.get("TENANT_SALT", "demo-salt")
    return hashlib.sha256(f"{client_id}{tenant_salt}".encode()).hexdigest()
