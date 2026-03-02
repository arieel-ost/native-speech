import { Card } from "@/components/ui";
import styles from "./page.module.css";

export default function AboutPage() {
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>About NativeSpeechAI</h1>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>The Problem</h2>
        <p className={styles.text}>
          Pronunciation coaching is limited to expensive 1-on-1 sessions or generic apps that miss
          phonetic nuances. Learners receive vague feedback that fails to diagnose accents, regional
          dialects, or unclear articulation.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Our Approach</h2>
        <p className={styles.text}>
          We built the first app that diagnoses why you mispronounce sounds based on your native
          language patterns. Not just what you got wrong — but why, and how to fix it with
          personalized drills that target your specific weak spots.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>The Founder</h2>
        <Card variant="outlined">
          <div className={styles.founder}>
            <h3 className={styles.founderName}>Arielle Ostankova</h3>
            <p className={styles.founderRole}>Founder & CEO</p>
            <p className={styles.text}>
              18 years of software engineering. M.Sc. Informatics. Bachelor in Acting with formal
              voice training. Multilingual native speaker who has lived the pronunciation challenge
              firsthand — from Crimea to Germany to building a career in English.
            </p>
          </div>
        </Card>
      </section>
    </div>
  );
}
