"""Router /api/categories — tipologie pratica."""

from __future__ import annotations

from typing import Annotated
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from starlette.responses import JSONResponse

from app.deps import get_category_repo, get_current_user_id, get_practice_repo
from app.logging_setup import get_logger
from app.models import Category
from app.models.category import CategoryCreateRequest
from app.models.practice import Practice
from app.repositories.base import Repository

router = APIRouter(prefix="/categories", tags=["categories"])
log = get_logger(__name__)


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


@router.post("", response_model=Category, status_code=status.HTTP_201_CREATED)
async def create_category(
    body: CategoryCreateRequest,
    cat_repo: Annotated[Repository[Category], Depends(get_category_repo)],
    current_user_id: Annotated[str, Depends(get_current_user_id)],
) -> Category:
    """Crea una nuova tipologia pratica V0 demo."""
    name = body.name.strip()
    logger = log.bind(action="create_category", user_id=current_user_id, category_name=name)
    if not name:
        logger.warning("category_create_empty_name")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Nome tipologia obbligatorio"
        )

    existing = await cat_repo.list()
    if any(category.name.casefold() == name.casefold() for category in existing):
        logger.warning("category_create_duplicate")
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Tipologia gia' esistente")

    category = Category(
        id=uuid4(),
        name=name,
        group_name=body.group_name.strip() if body.group_name else None,
        color=body.color.strip() if body.color else None,
        description=body.description.strip() if body.description else None,
        icon=None,
        active=True,
    )
    created = await cat_repo.create(category)
    logger.bind(category_id=str(created.id)).info("category_created")
    return created


@router.delete("/{category_id}", response_class=Response, status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(
    category_id: UUID,
    cat_repo: Annotated[Repository[Category], Depends(get_category_repo)],
    practice_repo: Annotated[Repository[Practice], Depends(get_practice_repo)],
    current_user_id: Annotated[str, Depends(get_current_user_id)],
) -> Response:
    """Elimina una tipologia solo se non usata da pratiche esistenti."""
    logger = log.bind(
        action="delete_category", user_id=current_user_id, category_id=str(category_id)
    )
    existing = await cat_repo.get(str(category_id))
    if existing is None:
        logger.warning("category_delete_not_found")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tipologia non trovata")

    practices_count = await practice_repo.count(category_id=category_id)
    if practices_count > 0:
        logger.warning("category_delete_conflict", practices_count=practices_count)
        return JSONResponse(
            content={
                "detail": f"Impossibile eliminare: {practices_count} pratiche usano questa tipologia",
                "practices_count": practices_count,
            },
            status_code=status.HTTP_409_CONFLICT,
        )

    await cat_repo.delete(str(category_id))
    logger.info("category_deleted")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
