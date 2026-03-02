import { Card } from "@/components/ui";
import styles from "./Features.module.css";

const features = [
  {
    title: "L1-L2 Diagnosis",
    description: "We analyze why you mispronounce sounds based on your native language patterns — not just what you got wrong.",
    icon: "◎",
  },
  {
    title: "Personalized Drills",
    description: "Every exercise targets your specific weak spots with sentences designed to challenge exactly the sounds you struggle with.",
    icon: "◇",
  },
  {
    title: "Real Score Tracking",
    description: "Watch your pronunciation score improve over time with detailed per-phoneme analytics, not vague percentage grades.",
    icon: "◈",
  },
  {
    title: "Multi-Language",
    description: "Starting with English and German, expanding to cover the most demanded language pairs worldwide.",
    icon: "◉",
  },
];

export function Features() {
  return (
    <section id="features" className={styles.section}>
      <div className={styles.inner}>
        <h2 className={styles.heading}>How It Works</h2>
        <p className={styles.subheading}>Expert-level accent coaching, available to everyone.</p>
        <div className={styles.grid}>
          {features.map((f) => (
            <Card key={f.title} variant="outlined">
              <div className={styles.feature}>
                <span className={styles.icon}>{f.icon}</span>
                <h3 className={styles.featureTitle}>{f.title}</h3>
                <p className={styles.featureDesc}>{f.description}</p>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
