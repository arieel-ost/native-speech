import { notFound } from "next/navigation";
import { mockDrillCategories, mockDrillSessions } from "@/lib/mock-data";
import { DrillSession } from "@/components/practice/DrillSession";

interface Props {
  params: Promise<{ drillId: string }>;
}

export default async function DrillPage({ params }: Props) {
  const { drillId } = await params;
  const category = mockDrillCategories.find((c) => c.id === drillId);
  const drills = mockDrillSessions[drillId];

  if (!category) notFound();

  return (
    <DrillSession
      drills={drills ?? []}
      categoryName={category.name}
    />
  );
}
