import { NewPracticeWizard } from "@/components/practice/NewPracticeWizard";
import { EWorkShell } from "@/components/shell/EWorkShell";

export default function NewPracticePage() {
  return (
    <EWorkShell code="Nuova pratica">
      <NewPracticeWizard />
    </EWorkShell>
  );
}
