import { Suspense } from "react";

import { NewPracticeWizard } from "@/components/practice/NewPracticeWizard";
import { EWorkShell } from "@/components/shell/EWorkShell";

export default function NewPracticePage() {
  return (
    <EWorkShell code="Nuova pratica">
      <Suspense fallback={<div className="p-10 text-sm text-muted">Caricamento wizard…</div>}>
        <NewPracticeWizard />
      </Suspense>
    </EWorkShell>
  );
}
