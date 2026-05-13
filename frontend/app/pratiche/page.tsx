import { PracticesListClient } from "@/components/practice/PracticesListClient";
import { EWorkShell } from "@/components/shell/EWorkShell";

export default function PracticesPage() {
  return (
    <EWorkShell code="Pratiche">
      <PracticesListClient />
    </EWorkShell>
  );
}
