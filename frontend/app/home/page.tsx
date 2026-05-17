import { HomeDashboardClient } from "@/components/practice/HomeDashboardClient";
import { EWorkShell } from "@/components/shell/EWorkShell";

export default function HomeDashboardPage() {
  return (
    <EWorkShell code="Home">
      <HomeDashboardClient />
    </EWorkShell>
  );
}
