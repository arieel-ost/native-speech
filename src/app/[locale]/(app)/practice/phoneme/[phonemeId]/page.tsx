import { notFound } from "next/navigation";
import { phonemeDrills } from "@/lib/mock-data";
import { PhonemeDrillSession } from "@/components/practice/PhonemeDrillSession";

interface Props {
  params: Promise<{ phonemeId: string; locale: string }>;
}

export default async function PhonemeDrillPage({ params }: Props) {
  const { phonemeId } = await params;
  const drill = phonemeDrills.find((d) => d.id === phonemeId);

  if (!drill) notFound();

  return <PhonemeDrillSession drill={drill} />;
}
