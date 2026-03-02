export interface DrillCategory {
  id: string;
  name: string;
  description: string;
  phonemes: string[];
  difficulty: "beginner" | "intermediate" | "advanced";
  estimatedMinutes: number;
  icon: string;
}

export interface DrillSession {
  id: string;
  categoryId: string;
  prompt: string;
  targetPhonemes: string[];
}

export interface PracticeSession {
  id: string;
  date: string;
  categoryName: string;
  score: number;
  duration: number;
}

export interface WeakSpot {
  phoneme: string;
  example: string;
  accuracy: number;
  trend: "improving" | "declining" | "stable";
}

export interface PhonemeProgress {
  phoneme: string;
  name: string;
  accuracy: number;
  practiceCount: number;
  trend: "improving" | "declining" | "stable";
}

export interface WeeklyScore {
  week: string;
  score: number;
}

export const mockUser = {
  name: "Alex Chen",
  email: "alex@example.com",
  image: null,
  nativeLanguage: "Mandarin Chinese",
  targetLanguage: "English",
  overallScore: 72,
  streak: 5,
  memberSince: "2026-01-15",
};

export const mockDrillCategories: DrillCategory[] = [
  {
    id: "th-sounds",
    name: "TH Sounds",
    description: "Master the voiced and voiceless TH sounds",
    phonemes: ["θ", "ð"],
    difficulty: "intermediate",
    estimatedMinutes: 10,
    icon: "θ",
  },
  {
    id: "vowel-pairs",
    name: "Vowel Pairs",
    description: "Distinguish between similar vowel sounds",
    phonemes: ["ɪ/iː", "ʊ/uː", "æ/ɛ"],
    difficulty: "beginner",
    estimatedMinutes: 8,
    icon: "æ",
  },
  {
    id: "r-l-distinction",
    name: "R vs L",
    description: "Clear distinction between R and L sounds",
    phonemes: ["r", "l"],
    difficulty: "intermediate",
    estimatedMinutes: 12,
    icon: "R",
  },
  {
    id: "word-stress",
    name: "Word Stress",
    description: "Correct stress patterns in multi-syllable words",
    phonemes: ["ˈ", "ˌ"],
    difficulty: "advanced",
    estimatedMinutes: 15,
    icon: "ˈ",
  },
  {
    id: "intonation",
    name: "Intonation",
    description: "Rising and falling pitch patterns",
    phonemes: ["↗", "↘"],
    difficulty: "advanced",
    estimatedMinutes: 12,
    icon: "↗",
  },
  {
    id: "consonant-clusters",
    name: "Consonant Clusters",
    description: "Handle complex consonant combinations",
    phonemes: ["str", "spl", "nts"],
    difficulty: "intermediate",
    estimatedMinutes: 10,
    icon: "str",
  },
];

export const mockDrillSessions: Record<string, DrillSession[]> = {
  "th-sounds": [
    { id: "th-1", categoryId: "th-sounds", prompt: "The weather is rather nice today, though it might thunder this Thursday.", targetPhonemes: ["θ", "ð"] },
    { id: "th-2", categoryId: "th-sounds", prompt: "I think that these three things are worth thinking through.", targetPhonemes: ["θ", "ð"] },
    { id: "th-3", categoryId: "th-sounds", prompt: "They gathered together to breathe the northern air.", targetPhonemes: ["θ", "ð"] },
  ],
  "vowel-pairs": [
    { id: "vp-1", categoryId: "vowel-pairs", prompt: "Please sit in this seat and keep the ship in shape.", targetPhonemes: ["ɪ", "iː"] },
    { id: "vp-2", categoryId: "vowel-pairs", prompt: "Look at the moon through the full, cool pool of blue.", targetPhonemes: ["ʊ", "uː"] },
  ],
  "r-l-distinction": [
    { id: "rl-1", categoryId: "r-l-distinction", prompt: "The light rain was really lovely in the late afternoon.", targetPhonemes: ["r", "l"] },
    { id: "rl-2", categoryId: "r-l-distinction", prompt: "Read the long letter right before the rally.", targetPhonemes: ["r", "l"] },
  ],
};

export const mockRecentSessions: PracticeSession[] = [
  { id: "s1", date: "2026-03-01", categoryName: "TH Sounds", score: 78, duration: 12 },
  { id: "s2", date: "2026-02-28", categoryName: "Vowel Pairs", score: 65, duration: 8 },
  { id: "s3", date: "2026-02-27", categoryName: "R vs L", score: 71, duration: 10 },
  { id: "s4", date: "2026-02-25", categoryName: "Word Stress", score: 82, duration: 15 },
  { id: "s5", date: "2026-02-24", categoryName: "TH Sounds", score: 74, duration: 11 },
];

export const mockWeakSpots: WeakSpot[] = [
  { phoneme: "θ", example: "think → *sink", accuracy: 45, trend: "improving" },
  { phoneme: "æ", example: "cat → *ket", accuracy: 52, trend: "stable" },
  { phoneme: "r", example: "red → *led", accuracy: 58, trend: "improving" },
  { phoneme: "ɪ", example: "ship → *sheep", accuracy: 61, trend: "declining" },
];

export const mockPhonemeProgress: PhonemeProgress[] = [
  { phoneme: "θ", name: "voiceless TH", accuracy: 45, practiceCount: 24, trend: "improving" },
  { phoneme: "ð", name: "voiced TH", accuracy: 68, practiceCount: 24, trend: "stable" },
  { phoneme: "æ", name: "short A", accuracy: 52, practiceCount: 16, trend: "stable" },
  { phoneme: "r", name: "R sound", accuracy: 58, practiceCount: 20, trend: "improving" },
  { phoneme: "l", name: "L sound", accuracy: 75, practiceCount: 20, trend: "stable" },
  { phoneme: "ɪ", name: "short I", accuracy: 61, practiceCount: 12, trend: "declining" },
  { phoneme: "iː", name: "long E", accuracy: 80, practiceCount: 12, trend: "improving" },
  { phoneme: "ʊ", name: "short OO", accuracy: 70, practiceCount: 8, trend: "stable" },
];

export const mockWeeklyScores: WeeklyScore[] = [
  { week: "Jan 6", score: 55 },
  { week: "Jan 13", score: 58 },
  { week: "Jan 20", score: 56 },
  { week: "Jan 27", score: 61 },
  { week: "Feb 3", score: 60 },
  { week: "Feb 10", score: 64 },
  { week: "Feb 17", score: 67 },
  { week: "Feb 24", score: 70 },
  { week: "Mar 2", score: 72 },
];
