export type Language = "english" | "german";

export interface DrillCategory {
  id: string;
  name: string;
  description: string;
  phonemes: string[];
  difficulty: "beginner" | "intermediate" | "advanced";
  estimatedMinutes: number;
  icon: string;
  language: Language;
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
  // English drills
  {
    id: "th-sounds",
    name: "TH Sounds",
    description: "Master the voiced and voiceless TH sounds",
    phonemes: ["θ", "ð"],
    difficulty: "intermediate",
    estimatedMinutes: 10,
    icon: "θ",
    language: "english",
  },
  {
    id: "vowel-pairs",
    name: "Vowel Pairs",
    description: "Distinguish between similar vowel sounds",
    phonemes: ["ɪ/iː", "ʊ/uː", "æ/ɛ"],
    difficulty: "beginner",
    estimatedMinutes: 8,
    icon: "æ",
    language: "english",
  },
  {
    id: "r-l-distinction",
    name: "R vs L",
    description: "Clear distinction between R and L sounds",
    phonemes: ["r", "l"],
    difficulty: "intermediate",
    estimatedMinutes: 12,
    icon: "R",
    language: "english",
  },
  {
    id: "word-stress",
    name: "Word Stress",
    description: "Correct stress patterns in multi-syllable words",
    phonemes: ["ˈ", "ˌ"],
    difficulty: "advanced",
    estimatedMinutes: 15,
    icon: "ˈ",
    language: "english",
  },
  {
    id: "intonation",
    name: "Intonation",
    description: "Rising and falling pitch patterns",
    phonemes: ["↗", "↘"],
    difficulty: "advanced",
    estimatedMinutes: 12,
    icon: "↗",
    language: "english",
  },
  {
    id: "consonant-clusters",
    name: "Consonant Clusters",
    description: "Handle complex consonant combinations",
    phonemes: ["str", "spl", "nts"],
    difficulty: "intermediate",
    estimatedMinutes: 10,
    icon: "str",
    language: "english",
  },
  // German drills
  {
    id: "umlauts",
    name: "Umlaute",
    description: "Master the ä, ö, and ü vowel sounds",
    phonemes: ["ɛː", "øː", "yː"],
    difficulty: "beginner",
    estimatedMinutes: 10,
    icon: "ü",
    language: "german",
  },
  {
    id: "ch-sounds",
    name: "CH-Laute",
    description: "Distinguish the ich-Laut and ach-Laut",
    phonemes: ["ç", "x"],
    difficulty: "intermediate",
    estimatedMinutes: 10,
    icon: "ch",
    language: "german",
  },
  {
    id: "german-r",
    name: "German R",
    description: "Practice the uvular R and vocalic R",
    phonemes: ["ʁ", "ɐ"],
    difficulty: "intermediate",
    estimatedMinutes: 12,
    icon: "R",
    language: "german",
  },
  {
    id: "long-short-vowels",
    name: "Vokallänge",
    description: "Differentiate long and short German vowels",
    phonemes: ["aː/a", "oː/ɔ", "eː/ɛ"],
    difficulty: "beginner",
    estimatedMinutes: 8,
    icon: "aː",
    language: "german",
  },
  {
    id: "final-devoicing",
    name: "Auslautverhärtung",
    description: "Practice word-final consonant devoicing",
    phonemes: ["b→p", "d→t", "g→k"],
    difficulty: "advanced",
    estimatedMinutes: 10,
    icon: "d→t",
    language: "german",
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
  // German drill sessions
  "umlauts": [
    { id: "um-1", categoryId: "umlauts", prompt: "Die Vögel fühlen sich über den schönen Frühling glücklich.", targetPhonemes: ["øː", "yː"] },
    { id: "um-2", categoryId: "umlauts", prompt: "Fünf müde Bären wählten gemütliche Höhlen für den Bär.", targetPhonemes: ["yː", "ɛː", "øː"] },
    { id: "um-3", categoryId: "umlauts", prompt: "Die Ärzte öffneten die Türen der Universität.", targetPhonemes: ["ɛː", "øː", "yː"] },
  ],
  "ch-sounds": [
    { id: "ch-1", categoryId: "ch-sounds", prompt: "Ich möchte mich nicht über die Geschichte beschweren.", targetPhonemes: ["ç"] },
    { id: "ch-2", categoryId: "ch-sounds", prompt: "Nach acht Wochen machte er noch einen Versuch.", targetPhonemes: ["x"] },
    { id: "ch-3", categoryId: "ch-sounds", prompt: "Das Mädchen lachte leicht über die Bücher in der Küche.", targetPhonemes: ["ç", "x"] },
  ],
  "german-r": [
    { id: "gr-1", categoryId: "german-r", prompt: "Der Richter reiste mit dem roten Zug nach Frankfurt.", targetPhonemes: ["ʁ"] },
    { id: "gr-2", categoryId: "german-r", prompt: "Mein Bruder und meine Schwester fahren gerne hierher.", targetPhonemes: ["ʁ", "ɐ"] },
  ],
  "long-short-vowels": [
    { id: "lsv-1", categoryId: "long-short-vowels", prompt: "Der Staat hat in der Stadt viele Straßen gebaut.", targetPhonemes: ["aː", "a"] },
    { id: "lsv-2", categoryId: "long-short-vowels", prompt: "Die Sonne schien schon den ganzen Sohn an.", targetPhonemes: ["oː", "ɔ"] },
    { id: "lsv-3", categoryId: "long-short-vowels", prompt: "Bitte geben Sie mir den Besen, wenn Sie lesen wollen.", targetPhonemes: ["eː", "ɛ"] },
  ],
  "final-devoicing": [
    { id: "fd-1", categoryId: "final-devoicing", prompt: "Das Rad und das Bad sind am Abend kalt.", targetPhonemes: ["d→t"] },
    { id: "fd-2", categoryId: "final-devoicing", prompt: "Der Dieb gab den Korb ab und ging den Berg hinauf.", targetPhonemes: ["b→p", "g→k"] },
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
