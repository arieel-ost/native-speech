"use client";

import { useState, useRef, useCallback } from "react";
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
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setRecordingState("idle");
      };

      mediaRecorder.start();
      setRecordingState("recording");
    } catch {
      setError("Microphone access denied. Please allow microphone access and try again.");
    }
  }, []);

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
      setError(`Failed to connect to assessment service: ${message}`);
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
          <h1 className={styles.title}>What are you learning?</h1>
          <p className={styles.subtitle}>
            We&apos;ll have you read a short passage so we can understand your accent and
            create a personalized plan.
          </p>
          <div className={styles.languageGrid}>
            <button
              className={styles.languageCard}
              onClick={() => handleLanguageSelect("english")}
            >
              <span className={styles.languageFlag}>EN</span>
              <span className={styles.languageName}>English</span>
            </button>
            <button
              className={styles.languageCard}
              onClick={() => handleLanguageSelect("german")}
            >
              <span className={styles.languageFlag}>DE</span>
              <span className={styles.languageName}>German</span>
            </button>
          </div>
        </div>
      )}

      {step === "record" && passage && (
        <div className={styles.stepContent}>
          <h1 className={styles.title}>Read this aloud</h1>
          <p className={styles.subtitle}>
            Take your time — speak naturally, don&apos;t rush.
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
              <span>{recordingState === "recording" ? "Stop" : "Record"}</span>
            </button>
          </div>

          {audioUrl && (
            <div className={styles.reviewSection}>
              <AudioPlayer src={audioUrl} />
              <div className={styles.reviewActions}>
                <Button variant="secondary" onClick={handleRetry}>
                  Re-record
                </Button>
                <Button onClick={submitRecording}>
                  Analyze my accent
                </Button>
              </div>
            </div>
          )}

          <button
            className={styles.backLink}
            onClick={() => { stopRecording(); setStep("language"); setAudioUrl(null); setError(null); }}
          >
            &larr; Choose a different language
          </button>
        </div>
      )}

      {step === "analyzing" && (
        <div className={styles.stepContent}>
          <h1 className={styles.title}>Analyzing your accent...</h1>
          <p className={styles.subtitle}>
            Our AI is listening to your pronunciation, identifying patterns,
            and building your personalized profile.
          </p>
          <div className={styles.spinner} />
        </div>
      )}

      {step === "results" && assessment && (
        <div className={styles.stepContent}>
          <h1 className={styles.title}>Your accent profile</h1>

          <Card variant="elevated">
            <div className={styles.profileHeader}>
              <div className={styles.scoreCircle}>
                <span className={styles.scoreValue}>{assessment.overallScore}</span>
                <span className={styles.scoreLabel}>/10</span>
              </div>
              <div className={styles.profileMeta}>
                <span className={styles.accentBadge}>
                  {assessment.accent.detectedLanguage} accent
                  {assessment.accent.confidence === "high" ? "" : ` (${assessment.accent.confidence} confidence)`}
                </span>
                <span className={styles.levelBadge}>{assessment.level}</span>
              </div>
            </div>
          </Card>

          <p className={styles.summaryText}>{assessment.summary}</p>

          <Card variant="outlined">
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>What&apos;s working well</h2>
              <ul className={styles.strengthsList}>
                {assessment.strengths.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          </Card>

          <Card variant="outlined">
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Areas to improve</h2>
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
                <h2 className={styles.sectionTitle}>Accent patterns detected</h2>
                <div className={styles.patternsList}>
                  {assessment.accent.telltalePatterns.map((p, i) => (
                    <span key={i} className={styles.patternBadge}>{p}</span>
                  ))}
                </div>
              </div>
            </Card>
          )}

          <div className={styles.resultsActions}>
            <Button onClick={() => (window.location.href = "/practice")}>
              Start practicing
            </Button>
            <Button variant="secondary" onClick={handleRetry}>
              Retake assessment
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
