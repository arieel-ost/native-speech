// Client-side localStorage module for learner profiles, sessions, and phoneme progress.

const PROFILE_KEY = "native-speech-profile";
const LEARNER_ID_KEY = "native-speech-learner-id";

// --- Types ---

export interface PhonemeScore {
  phoneme: string;
  rating: "good" | "acceptable" | "needs_work";
  word: string;
}

export interface SessionRecord {
  id: string;
  timestamp: string;
  drillCategoryId: string;
  drillItemId: string;
  overallScore: number;
  phonemeScores: PhonemeScore[];
}

export interface AssessmentData {
  overallScore: number;
  level: string;
  accent: {
    detectedLanguage: string;
    confidence: string;
    telltalePatterns: string[];
  };
  topProblems: {
    sound: string;
    severity: string;
    description: string;
    exampleWord: string;
  }[];
  strengths: string[];
  recommendedDrills: string[];
  summary: string;
}

export interface LearnerProfile {
  id: string;
  createdAt: string;
  language: "english" | "german";
  assessment: AssessmentData;
  sessions: SessionRecord[];
}

export type PhonemeStatus =
  | "not_started"
  | "struggled"
  | "improving"
  | "strong";

export interface PhonemeProgress {
  phoneme: string;
  description: string;
  exampleWord: string;
  severity: string;
  status: PhonemeStatus;
  practiceCount: number;
  latestRating: PhonemeScore["rating"] | null;
}

// --- Helpers ---

function isSSR(): boolean {
  return typeof window === "undefined";
}

function generateId(): string {
  return crypto.randomUUID();
}

// --- Functions ---

export function getProfile(): LearnerProfile | null {
  if (isSSR()) return null;
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as LearnerProfile;
  } catch {
    return null;
  }
}

export function getLearnerId(): string {
  if (isSSR()) return "";
  const profile = getProfile();
  if (profile) return profile.id;

  const existing = localStorage.getItem(LEARNER_ID_KEY);
  if (existing) return existing;

  const id = generateId();
  localStorage.setItem(LEARNER_ID_KEY, id);
  return id;
}

export function saveProfile(
  language: LearnerProfile["language"],
  assessment: AssessmentData,
): LearnerProfile {
  const id = getLearnerId() || generateId();
  const profile: LearnerProfile = {
    id,
    createdAt: new Date().toISOString(),
    language,
    assessment,
    sessions: [],
  };
  if (!isSSR()) {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  }
  return profile;
}

export function addSession(
  session: Omit<SessionRecord, "id" | "timestamp">,
): SessionRecord | null {
  const profile = getProfile();
  if (!profile) return null;

  const record: SessionRecord = {
    ...session,
    id: generateId(),
    timestamp: new Date().toISOString(),
  };
  profile.sessions.push(record);
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  return record;
}

export function clearProfile(): void {
  if (isSSR()) return;
  localStorage.removeItem(PROFILE_KEY);
  localStorage.removeItem(LEARNER_ID_KEY);
}

export function getPhonemeProgress(profile: LearnerProfile): PhonemeProgress[] {
  return profile.assessment.topProblems.map((problem) => {
    const allScores = profile.sessions.flatMap((s) =>
      s.phonemeScores.filter((ps) => ps.phoneme === problem.sound),
    );

    const practiceCount = allScores.length;

    if (practiceCount === 0) {
      return {
        phoneme: problem.sound,
        description: problem.description,
        exampleWord: problem.exampleWord,
        severity: problem.severity,
        status: "not_started" as PhonemeStatus,
        practiceCount: 0,
        latestRating: null,
      };
    }

    const latestRating = allScores[allScores.length - 1].rating;
    const goodCount = allScores.filter((s) => s.rating === "good").length;
    const needsWorkCount = allScores.filter(
      (s) => s.rating === "needs_work",
    ).length;
    const goodRatio = goodCount / practiceCount;
    const needsWorkRatio = needsWorkCount / practiceCount;

    let status: PhonemeStatus;
    if (goodRatio >= 0.7) {
      status = "strong";
    } else if (needsWorkRatio > 0.5) {
      status = "struggled";
    } else {
      status = "improving";
    }

    return {
      phoneme: problem.sound,
      description: problem.description,
      exampleWord: problem.exampleWord,
      severity: problem.severity,
      status,
      practiceCount,
      latestRating,
    };
  });
}

export function getCurrentScore(profile: LearnerProfile): number {
  if (profile.sessions.length === 0) {
    return profile.assessment.overallScore;
  }

  const recentSessions = profile.sessions.slice(-5);
  const sessionAvg =
    recentSessions.reduce((sum, s) => sum + s.overallScore, 0) /
    recentSessions.length;

  return Math.round(
    profile.assessment.overallScore * 0.3 + sessionAvg * 0.7,
  );
}
