import { Card, Input, Button } from "@/components/ui";
import { mockUser } from "@/lib/mock-data";
import styles from "./page.module.css";

export default function SettingsPage() {
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Settings</h1>

      <Card variant="outlined">
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Profile</h2>
          <div className={styles.fields}>
            <Input label="Name" defaultValue={mockUser.name} />
            <Input label="Email" type="email" defaultValue={mockUser.email} />
          </div>
        </div>
      </Card>

      <Card variant="outlined">
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Language Settings</h2>
          <div className={styles.fields}>
            <div className={styles.selectWrapper}>
              <label className={styles.label}>Native Language</label>
              <select className={styles.select} defaultValue={mockUser.nativeLanguage}>
                <option>Mandarin Chinese</option>
                <option>Spanish</option>
                <option>Arabic</option>
                <option>Russian</option>
                <option>German</option>
                <option>Japanese</option>
                <option>Korean</option>
                <option>Portuguese</option>
                <option>French</option>
                <option>Hindi</option>
              </select>
            </div>
            <div className={styles.selectWrapper}>
              <label className={styles.label}>Target Language</label>
              <select className={styles.select} defaultValue={mockUser.targetLanguage}>
                <option>English</option>
                <option>German</option>
              </select>
            </div>
          </div>
        </div>
      </Card>

      <Card variant="outlined">
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Subscription</h2>
          <p className={styles.planStatus}>Free Plan</p>
          <Button variant="primary">Upgrade to Premium</Button>
        </div>
      </Card>
    </div>
  );
}
