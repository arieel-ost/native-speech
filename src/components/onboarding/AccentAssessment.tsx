"use client";

import { useState, useRef, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button, Card } from "@/components/ui";
import { AudioPlayer } from "@/components/practice/AudioPlayer";
import { diagnosticPassages, type TargetLanguage } from "@/lib/mock-data";
import styles from "./AccentAssessment.module.css";

type Step = "language" | "record" | "analyzing" | "results";

interface Problem {
  sound: string;
  description: string;
  severity: string;
  exampleWord: string;
}

interface Assessment {
  accent: {
    detectedLanguage: string;
    confidence: string;
    telltalePatterns: string[];
  };
  overallScore: number;
  level: string;
  topProblems: Problem[];
  strengths: string[];
  recommendedDrills: string[];
  summary: string;
}

export function AccentAssessment() {
  const t = useTranslations("AccentAssessment");
  const router = useRouter();
  const locale = useLocale();
  const [step, setStep] = useState<Step>("language");
  const [language, setLanguage] = useState<TargetLanguage | null>(null);
  const [recordingState, setRecordingState] = useState<"idle" | "recording">("idle");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const passage = language ? diagnosticPassages[language] : null;

  const handleLanguageSelect = (lang: TargetLanguage) => {
    setLanguage(lang);
    setStep("record");
  };

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      setAudioUrl(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setRecordingState("idle");
      };

      mediaRecorder.start();
      setRecordingState("recording");
    } catch {
      setError(t("micDenied"));
    }
  }, [t]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const submitRecording = async () => {
    if (!audioUrl || !passage || !language) return;

    setStep("analyzing");
    setError(null);

    try {
      const response = await fetch(audioUrl);
      const blob = await response.blob();

      const formData = new FormData();
      formData.append("audio", blob, "assessment.webm");
      formData.append("language", language);
      formData.append("passage", passage.text);
      formData.append("locale", locale);

      const res = await fetch("/api/assess", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        const errMsg = data.details
          ? `${data.error}: ${data.details}`
          : data.error || "Assessment failed";
        setError(errMsg);
        setStep("record");
        return;
      }

      setAssessment(data.assessment as Assessment);
      setStep("results");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(t("connectionError", { message }));
      setStep("record");
    }
  };

  const handleRetry = () => {
    setAudioUrl(null);
    setAssessment(null);
    setError(null);
    setStep("record");
  };

  return (
    <div className={styles.container}>
      {step === "language" && (
        <div className={styles.stepContent}>
          <h1 className={styles.title}>{t("chooseLanguageTitle")}</h1>
          <p className={styles.subtitle}>
            {t("chooseLanguageSubtitle")}
          </p>
          <div className={styles.languageGrid}>
            <button
              className={styles.languageCard}
              onClick={() => handleLanguageSelect("english")}
            >
              <span className={styles.languageFlag}>EN</span>
              <span className={styles.languageName}>{t("english")}</span>
            </button>
            <button
              className={styles.languageCard}
              onClick={() => handleLanguageSelect("german")}
            >
              <span className={styles.languageFlag}>DE</span>
              <span className={styles.languageName}>{t("german")}</span>
            </button>
          </div>
        </div>
      )}

      {step === "record" && passage && (
        <div className={styles.stepContent}>
          <h1 className={styles.title}>{t("readAloudTitle")}</h1>
          <p className={styles.subtitle}>
            {t("readAloudSubtitle")}
          </p>

          <Card variant="elevated">
            <div className={styles.passageArea}>
              <p className={styles.passage}>{passage.text}</p>
            </div>
          </Card>

          {error && <p className={styles.errorText}>{error}</p>}

          <div className={styles.controls}>
            <button
              className={`${styles.recordBtn} ${recordingState === "recording" ? styles.recording : ""}`}
              onClick={recordingState === "recording" ? stopRecording : startRecording}
              aria-label={recordingState === "recording" ? "Stop recording" : "Start recording"}
            >
              <span className={styles.recordIcon}>
                {recordingState === "recording" ? "\u25A0" : "\u25CF"}
              </span>
              <span>{recordingState === "recording" ? t("stop") : t("record")}</span>
            </button>
          </div>

          {audioUrl && (
            <div className={styles.reviewSection}>
              <AudioPlayer src={audioUrl} />
              <div className={styles.reviewActions}>
                <Button variant="secondary" onClick={handleRetry}>
                  {t("reRecord")}
                </Button>
                <Button onClick={submitRecording}>
                  {t("analyzeAccent")}
                </Button>
              </div>
            </div>
          )}

          <button
            className={styles.backLink}
            onClick={() => { stopRecording(); setStep("language"); setAudioUrl(null); setError(null); }}
          >
            &larr; {t("chooseDifferent")}
          </button>
        </div>
      )}

      {step === "analyzing" && (
        <div className={styles.stepContent}>
          <h1 className={styles.title}>{t("analyzingTitle")}</h1>
          <p className={styles.subtitle}>
            {t("analyzingSubtitle")}
          </p>
          <div className={styles.spinner} />
        </div>
      )}

      {step === "results" && assessment && (
        <div className={styles.stepContent}>
          <h1 className={styles.title}>{t("resultsTitle")}</h1>

          <Card variant="elevated">
            <div className={styles.profileHeader}>
              <div className={styles.scoreCircle}>
                <span className={styles.scoreValue}>{assessment.overallScore}</span>
                <span className={styles.scoreLabel}>/10</span>
              </div>
              <div className={styles.profileMeta}>
                <span className={styles.accentBadge}>
                  {t("accent", { language: assessment.accent.detectedLanguage })}
                  {assessment.accent.confidence === "high" ? "" : ` (${t("confidence", { level: assessment.accent.confidence })})`}
                </span>
                <span className={styles.levelBadge}>{assessment.level}</span>
              </div>
            </div>
          </Card>

          <p className={styles.summaryText}>{assessment.summary}</p>

          <Card variant="outlined">
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>{t("whatsWorking")}</h2>
              <ul className={styles.strengthsList}>
                {assessment.strengths.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          </Card>

          <Card variant="outlined">
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>{t("areasToImprove")}</h2>
              <div className={styles.problemsList}>
                {assessment.topProblems.map((p, i) => (
                  <div key={i} className={styles.problemItem}>
                    <div className={styles.problemHeader}>
                      <span className={styles.problemSound}>{p.sound}</span>
                      <span className={`${styles.severityBadge} ${styles[p.severity]}`}>
                        {p.severity}
                      </span>
                    </div>
                    <p className={styles.problemDesc}>{p.description}</p>
                    <p className={styles.problemExample}>
                      e.g. &quot;{p.exampleWord}&quot;
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {assessment.accent.telltalePatterns.length > 0 && (
            <Card variant="outlined">
              <div className={styles.section}>
                <h2 className={styles.sectionTitle}>{t("accentPatterns")}</h2>
                <div className={styles.patternsList}>
                  {assessment.accent.telltalePatterns.map((p, i) => (
                    <span key={i} className={styles.patternBadge}>{p}</span>
                  ))}
                </div>
              </div>
            </Card>
          )}

          <div className={styles.resultsActions}>
            <Button onClick={() => router.push("/practice")}>
              {t("startPracticing")}
            </Button>
            <Button variant="secondary" onClick={handleRetry}>
              {t("retakeAssessment")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
