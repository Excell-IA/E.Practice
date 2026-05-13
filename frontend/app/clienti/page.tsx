import { ClientsListClient } from "@/components/practice/ClientsListClient";
import { EWorkShell } from "@/components/shell/EWorkShell";

export default function ClientsPage() {
  return (
    <EWorkShell code="Clienti">
      <ClientsListClient />
    </EWorkShell>
  );
}
