"""Pydantic schemas for immutable activity log rows."""

from datetime import datetime
from typing import Any, Literal, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

ActivityAction = Literal[
    "created",
    "updated",
    "deleted",
    "completed",
    "uploaded",
    "commented",
    "viewed_l1",
]
ActivityEntityType = Literal["practice", "phase", "event", "note", "attachment", "client"]
ActivityMetadata = dict[str, Any]


class ActivityLogBase(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    actor_id: UUID
    action: ActivityAction
    entity_type: ActivityEntityType
    entity_id: UUID
    practice_id: Optional[UUID] = None
    metadata: Optional[ActivityMetadata] = Field(default=None)


# L2 OPERATIVO - esposta all'AI solo tramite view L3
class ActivityLog(ActivityLogBase):
    id: UUID
    timestamp: datetime


class ActivityLogCreate(ActivityLogBase):
    pass


class ActivityLogUpdate(BaseModel):
    """Defined for schema symmetry; activity log rows are append-only."""

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)
