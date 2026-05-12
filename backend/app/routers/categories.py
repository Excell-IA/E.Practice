"""Router /api/categories — tipologie pratica."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.deps import get_category_repo
from app.models import Category
from app.repositories.base import Repository

router = APIRouter(prefix="/categories", tags=["categories"])


@router.get("", response_model=list[Category])
async def list_categories(
    cat_repo: Annotated[Repository[Category], Depends(get_category_repo)],
    active: Annotated[bool | None, Query()] = True,
) -> list[Category]:
    """Lista categorie. Default attive=True (per dropdown wizard pratica)."""
    if active is None:
        items = await cat_repo.list()
    else:
        items = await cat_repo.list(active=active)
    return sorted(items, key=lambda c: ((c.group_name or "zzz"), c.name))
