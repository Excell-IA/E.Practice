import { ImportPracticeClient } from "@/components/practice/ImportPracticeClient";
import { EWorkShell } from "@/components/shell/EWorkShell";

export default function ImportPracticePage() {
  return (
    <EWorkShell code="Importa">
      <ImportPracticeClient />
    </EWorkShell>
  );
}
