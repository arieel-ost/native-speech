"use client";

import { useState, FormEvent } from "react";
import { useTranslations } from "next-intl";
import styles from "./NotifyForm.module.css";

export function NotifyForm() {
  const t = useTranslations("PricingPreview");
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setState("loading");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error();
      setState("done");
    } catch {
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <div className={styles.success}>
        <span className={styles.checkmark}>✓</span>
        <span>{t("notifySuccess")}</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.inputRow}>
        <input
          type="email"
          required
          placeholder={t("emailPlaceholder")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={styles.input}
          disabled={state === "loading"}
        />
        <button type="submit" className={styles.submit} disabled={state === "loading"}>
          {state === "loading" ? "..." : t("notifyBtn")}
        </button>
      </div>
      {state === "error" && (
        <p className={styles.error}>{t("notifyError")}</p>
      )}
    </form>
  );
}
