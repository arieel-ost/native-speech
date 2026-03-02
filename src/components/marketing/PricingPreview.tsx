import Link from "next/link";
import { Button, Card } from "@/components/ui";
import styles from "./PricingPreview.module.css";

export function PricingPreview() {
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <h2 className={styles.heading}>Simple Pricing</h2>
        <div className={styles.grid}>
          <Card variant="outlined">
            <div className={styles.plan}>
              <h3 className={styles.planName}>Free</h3>
              <div className={styles.price}>$0</div>
              <ul className={styles.features}>
                <li>Basic accent assessment</li>
                <li>3 practice drills</li>
                <li>1 language</li>
              </ul>
              <Link href="/sign-up"><Button variant="secondary" size="md">Get Started</Button></Link>
            </div>
          </Card>
          <Card variant="elevated">
            <div className={styles.plan}>
              <h3 className={styles.planName}>Premium</h3>
              <div className={styles.price}>$14.99<span className={styles.period}>/mo</span></div>
              <ul className={styles.features}>
                <li>Full AI diagnosis</li>
                <li>Unlimited drills</li>
                <li>All languages</li>
                <li>Progress tracking</li>
              </ul>
              <Link href="/sign-up"><Button size="md">Start Free Trial</Button></Link>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}
