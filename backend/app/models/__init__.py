"""Modelli Pydantic L1/L2/L3 per E.Practice."""

from app.models.client import Client, ClientBase, ClientCreate, ClientStatus, ClientType, ClientUpdate
from app.models.user import User, UserBase, UserCreate, UserRole, UserStatus, UserUpdate

__all__ = [
    "Client",
    "ClientBase",
    "ClientCreate",
    "ClientStatus",
    "ClientType",
    "ClientUpdate",
    "User",
    "UserBase",
    "UserCreate",
    "UserRole",
    "UserStatus",
    "UserUpdate",
]
