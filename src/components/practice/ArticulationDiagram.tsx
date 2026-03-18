import Image from "next/image";
import styles from "./ArticulationDiagram.module.css";

/**
 * Maps phoneme strings (from PhonemeDrill.phoneme) to IPA diagram image filenames
 * in public/images/ipa-diagrams/. See that folder's README.md for the full reference.
 */
const PHONEME_TO_IMAGE: Record<string, string> = {
  θ: "dental-th-dh.png",
  ð: "dental-th-dh.png",
  ɹ: "approximant-r.png",
  æ: "vowel-a-pan-mouth.png",
  "ɪ/iː": "vowel-ii-bean-mouth.png",
  "yː": "vowel-uu-moon-mouth.png",
  "øː": "vowel-schwa-the-mouth.png",
  "ç/x": "velar-k-g-ng.png",
};

interface ArticulationDiagramProps {
  phoneme: string;
}

export function ArticulationDiagram({ phoneme }: ArticulationDiagramProps) {
  const filename = PHONEME_TO_IMAGE[phoneme];
  if (!filename) return null;

  return (
    <div className={styles.container}>
      <Image
        className={styles.diagram}
        src={`/images/ipa-diagrams/${filename}`}
        alt={`Vocal tract diagram for the ${phoneme} sound`}
        width={527}
        height={751}
      />
    </div>
  );
}
