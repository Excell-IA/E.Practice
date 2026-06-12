"""Client HTTP verso i servizi E.Work esterni."""

from app.clients.contacts_client import ContactsClient, ContactsClientError

__all__ = ["ContactsClient", "ContactsClientError"]
