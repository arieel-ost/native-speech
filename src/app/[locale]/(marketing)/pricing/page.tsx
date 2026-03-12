import { Card, Button } from "@/components/ui";
import Link from "next/link";
import styles from "./page.module.css";

export default function PricingPage() {
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Pricing</h1>
      <p className={styles.subtitle}>Start free. Upgrade when you need more.</p>
      <div className={styles.grid}>
        <Card variant="outlined">
          <div className={styles.plan}>
            <h2 className={styles.planName}>Free</h2>
            <div className={styles.price}>$0</div>
            <ul className={styles.features}>
              <li>Basic accent assessment</li>
              <li>3 practice drills per day</li>
              <li>1 language pair</li>
              <li>Basic progress overview</li>
            </ul>
            <Link href="/sign-up"><Button variant="secondary">Get Started</Button></Link>
          </div>
        </Card>
        <Card variant="elevated">
          <div className={styles.plan}>
            <h2 className={styles.planName}>Premium</h2>
            <div className={styles.price}>$14.99<span className={styles.period}>/mo</span></div>
            <ul className={styles.features}>
              <li>Full AI diagnosis with L1-L2 analysis</li>
              <li>Unlimited personalized drills</li>
              <li>All language pairs</li>
              <li>Detailed progress tracking</li>
              <li>Per-phoneme analytics</li>
              <li>Priority support</li>
            </ul>
            <Link href="/sign-up"><Button>Start Free Trial</Button></Link>
          </div>
        </Card>
        <Card variant="outlined">
          <div className={styles.plan}>
            <h2 className={styles.planName}>Enterprise</h2>
            <div className={styles.price}>Custom</div>
            <ul className={styles.features}>
              <li>Everything in Premium</li>
              <li>Team management dashboard</li>
              <li>Custom onboarding programs</li>
              <li>API access</li>
              <li>Dedicated account manager</li>
            </ul>
            <Button variant="secondary">Contact Sales</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
