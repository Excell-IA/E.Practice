import { PracticeDetailClient } from "@/components/practice/PracticeDetailClient";
import { EWorkShell } from "@/components/shell/EWorkShell";

type PracticeDetailPageProps = {
  params: {
    numero: string;
  };
};

export default function PracticeDetailPage({ params }: PracticeDetailPageProps) {
  return (
    <EWorkShell code={params.numero}>
      <PracticeDetailClient />
    </EWorkShell>
  );
}
