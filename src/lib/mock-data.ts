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

export type TargetLanguage = "english" | "german";

export interface DiagnosticPassage {
  language: TargetLanguage;
  text: string;
  coverageNotes: string;
}

export const diagnosticPassages: Record<TargetLanguage, DiagnosticPassage> = {
  english: {
    language: "english",
    text: "Although three of my brothers thought the weather would be rather unpleasant, they still gathered their thick woolen clothes and left for the northern streets. She specifically requested twelve large orange juices, but the restaurant could only provide roughly half that amount. Would you mind explaining whether this particular situation is actually as straightforward as it first appeared?",
    coverageNotes: "θ/ð, r/l, consonant clusters (str, npl, sp), word-final stops, vowel contrasts, stress patterns, declarative + list + question intonation",
  },
  german: {
    language: "german",
    text: "Üblicherweise frühstücken wir gemütlich, aber gestern musste ich schon um Viertel nach sechs aufstehen, weil mein Zug außergewöhnlich früh abfuhr. Die Nachbarin erzählte mir freundlich, dass ihr Schwiegervater im Krankenhaus eine schwierige Operation überstanden hätte. Könnten Sie mir vielleicht erklären, warum die Entscheidung letztendlich so überraschend ausgefallen ist?",
    coverageNotes: "Umlauts (ü, ö, ä), ch sounds (ç/x), uvular R, consonant clusters (schw, kr, ntsch), word-final devoicing, long/short vowels, stress, declarative + reported speech + polite question intonation",
  },
};

// --- Phoneme-focused drill data ---

export interface PhonemeDrillStep {
  id: string;
  type: "isolated" | "minimal_pair" | "word" | "short_phrase";
  /** What the user should say */
  prompt: string;
  /** IPA for the target phoneme */
  ipa: string;
  /** Plain-language mouth/tongue instruction */
  instruction: string;
}

export interface PhonemeDrill {
  id: string;
  phoneme: string;
  name: string;
  description: string;
  language: Language;
  steps: PhonemeDrillStep[];
}

export const phonemeDrills: PhonemeDrill[] = [
  // --- English phonemes ---
  {
    id: "phoneme-th-voiceless",
    phoneme: "θ",
    name: "Voiceless TH",
    description: "The \"th\" in think, three, bath",
    language: "english",
    steps: [
      { id: "th-v-1", type: "isolated", prompt: "θ θ θ", ipa: "θ", instruction: "Place your tongue tip gently between your teeth. Blow air out softly — no voice, just air." },
      { id: "th-v-2", type: "word", prompt: "think", ipa: "θɪŋk", instruction: "Start with tongue between teeth, then pull back for the rest of the word." },
      { id: "th-v-3", type: "word", prompt: "three", ipa: "θriː", instruction: "Tongue between teeth, then quickly move to the R sound." },
      { id: "th-v-4", type: "minimal_pair", prompt: "think — sink", ipa: "θɪŋk / sɪŋk", instruction: "Feel the difference: tongue BETWEEN teeth for 'think', tongue BEHIND teeth for 'sink'." },
      { id: "th-v-5", type: "minimal_pair", prompt: "thick — tick", ipa: "θɪk / tɪk", instruction: "'Thick' has air flowing past the tongue. 'Tick' has a sharp stop." },
      { id: "th-v-6", type: "word", prompt: "bath", ipa: "bæθ", instruction: "End with tongue between teeth, air flowing out." },
      { id: "th-v-7", type: "word", prompt: "month", ipa: "mʌnθ", instruction: "Finish the word by placing tongue gently between teeth." },
      { id: "th-v-8", type: "short_phrase", prompt: "I think three thoughts", ipa: "aɪ θɪŋk θriː θɔːts", instruction: "Three TH sounds in a row — keep your tongue active between your teeth." },
    ],
  },
  {
    id: "phoneme-th-voiced",
    phoneme: "ð",
    name: "Voiced TH",
    description: "The \"th\" in the, this, weather",
    language: "english",
    steps: [
      { id: "th-d-1", type: "isolated", prompt: "ð ð ð", ipa: "ð", instruction: "Same tongue position as voiceless TH, but now add your voice — feel the vibration in your throat." },
      { id: "th-d-2", type: "word", prompt: "the", ipa: "ðə", instruction: "Tongue between teeth with voice on. Very common word — get this one right!" },
      { id: "th-d-3", type: "word", prompt: "this", ipa: "ðɪs", instruction: "Start with voiced tongue between teeth, then move to the 'is' sound." },
      { id: "th-d-4", type: "minimal_pair", prompt: "then — den", ipa: "ðɛn / dɛn", instruction: "'Then' has tongue between teeth with air flow. 'Den' has tongue behind teeth with a stop." },
      { id: "th-d-5", type: "minimal_pair", prompt: "breathe — breeze", ipa: "briːð / briːz", instruction: "Feel your tongue go between your teeth at the end of 'breathe', but behind teeth for 'breeze'." },
      { id: "th-d-6", type: "word", prompt: "weather", ipa: "ˈwɛðər", instruction: "The TH is in the middle — tongue goes between teeth briefly." },
      { id: "th-d-7", type: "short_phrase", prompt: "this is the other one", ipa: "ðɪs ɪz ðə ˈʌðər wʌn", instruction: "Three voiced TH sounds — keep the vibration going each time." },
    ],
  },
  {
    id: "phoneme-r",
    phoneme: "ɹ",
    name: "English R",
    description: "The R sound in red, very, car",
    language: "english",
    steps: [
      { id: "r-1", type: "isolated", prompt: "rrr", ipa: "ɹ", instruction: "Curl your tongue tip back slightly without touching the roof of your mouth. Round your lips a little." },
      { id: "r-2", type: "word", prompt: "red", ipa: "ɹɛd", instruction: "Start with curled tongue, then drop to 'ed'." },
      { id: "r-3", type: "word", prompt: "right", ipa: "ɹaɪt", instruction: "Strong tongue curl at the start." },
      { id: "r-4", type: "minimal_pair", prompt: "right — light", ipa: "ɹaɪt / laɪt", instruction: "R: tongue curled back, no contact. L: tongue tip touches the ridge behind your teeth." },
      { id: "r-5", type: "minimal_pair", prompt: "red — led", ipa: "ɹɛd / lɛd", instruction: "Same difference — curled back for R, touching ridge for L." },
      { id: "r-6", type: "word", prompt: "very", ipa: "ˈvɛɹi", instruction: "The R is soft in the middle — gentle tongue curl." },
      { id: "r-7", type: "word", prompt: "car", ipa: "kɑːɹ", instruction: "End with tongue pulling back slightly." },
      { id: "r-8", type: "short_phrase", prompt: "the red car runs really far", ipa: "ðə ɹɛd kɑːɹ ɹʌnz ˈɹɪəli fɑːɹ", instruction: "Multiple R positions — beginning, middle, and end of words." },
    ],
  },
  {
    id: "phoneme-ae",
    phoneme: "æ",
    name: "Short A",
    description: "The \"a\" in cat, bad, man",
    language: "english",
    steps: [
      { id: "ae-1", type: "isolated", prompt: "æ æ æ", ipa: "æ", instruction: "Open your mouth wide and push your tongue forward and down. It's between 'ah' and 'eh'." },
      { id: "ae-2", type: "word", prompt: "cat", ipa: "kæt", instruction: "Drop your jaw — the vowel is wide and forward." },
      { id: "ae-3", type: "word", prompt: "bad", ipa: "bæd", instruction: "Same wide, forward vowel." },
      { id: "ae-4", type: "minimal_pair", prompt: "bat — bet", ipa: "bæt / bɛt", instruction: "'Bat' — mouth opens wider, tongue lower. 'Bet' — mouth more narrow, tongue higher." },
      { id: "ae-5", type: "minimal_pair", prompt: "man — men", ipa: "mæn / mɛn", instruction: "Feel the jaw drop more for 'man'." },
      { id: "ae-6", type: "short_phrase", prompt: "the black cat sat on a mat", ipa: "ðə blæk kæt sæt ɒn ə mæt", instruction: "Four short A sounds — keep your mouth wide for each one." },
    ],
  },
  {
    id: "phoneme-ship-sheep",
    phoneme: "ɪ/iː",
    name: "Short I vs Long E",
    description: "ship vs sheep, bit vs beat",
    language: "english",
    steps: [
      { id: "ii-1", type: "isolated", prompt: "ɪ ɪ ɪ", ipa: "ɪ", instruction: "Short, relaxed sound. Mouth barely open, tongue high but relaxed." },
      { id: "ii-2", type: "isolated", prompt: "iː iː iː", ipa: "iː", instruction: "Long, tense sound. Spread your lips like smiling, tongue high and forward." },
      { id: "ii-3", type: "minimal_pair", prompt: "ship — sheep", ipa: "ʃɪp / ʃiːp", instruction: "Short and relaxed for 'ship'. Long and tense for 'sheep'. Feel your lips spread for 'sheep'." },
      { id: "ii-4", type: "minimal_pair", prompt: "bit — beat", ipa: "bɪt / biːt", instruction: "Short vs long — 'beat' holds the vowel longer with spread lips." },
      { id: "ii-5", type: "minimal_pair", prompt: "sit — seat", ipa: "sɪt / siːt", instruction: "'Sit' is quick and relaxed. 'Seat' is stretched and tense." },
      { id: "ii-6", type: "short_phrase", prompt: "sit in this seat please", ipa: "sɪt ɪn ðɪs siːt pliːz", instruction: "Switch between short I and long E within the same phrase." },
    ],
  },
  // --- German phonemes ---
  {
    id: "phoneme-ue",
    phoneme: "yː",
    name: "German Ü",
    description: "The ü sound in über, grün, Tür",
    language: "german",
    steps: [
      { id: "ue-1", type: "isolated", prompt: "üüü", ipa: "yː", instruction: "Say 'ee' (like in 'see') but round your lips as if saying 'oo'. Keep your tongue high and forward." },
      { id: "ue-2", type: "word", prompt: "über", ipa: "ˈyːbɐ", instruction: "Start with rounded 'ee' lips." },
      { id: "ue-3", type: "word", prompt: "grün", ipa: "ɡʁyːn", instruction: "The ü is in the middle — round your lips for it." },
      { id: "ue-4", type: "minimal_pair", prompt: "Hüte — Hütte", ipa: "ˈhyːtə / ˈhʏtə", instruction: "Long ü vs short ü. 'Hüte' holds the sound longer." },
      { id: "ue-5", type: "word", prompt: "Tür", ipa: "tyːɐ̯", instruction: "Start with T, then round your lips for the long ü." },
      { id: "ue-6", type: "short_phrase", prompt: "Fünf grüne Türen", ipa: "fʏnf ˈɡʁyːnə ˈtyːʁən", instruction: "Multiple ü sounds — keep those lips rounded!" },
    ],
  },
  {
    id: "phoneme-oe",
    phoneme: "øː",
    name: "German Ö",
    description: "The ö sound in schön, Vögel, böse",
    language: "german",
    steps: [
      { id: "oe-1", type: "isolated", prompt: "ööö", ipa: "øː", instruction: "Say 'eh' (like in 'bed') but round your lips as if saying 'oh'. Tongue stays mid-height." },
      { id: "oe-2", type: "word", prompt: "schön", ipa: "ʃøːn", instruction: "Round your lips for the ö sound." },
      { id: "oe-3", type: "word", prompt: "Vögel", ipa: "ˈføːɡl̩", instruction: "The ö is stressed — give it a clear rounded shape." },
      { id: "oe-4", type: "minimal_pair", prompt: "schon — schön", ipa: "ʃoːn / ʃøːn", instruction: "'Schon' has a back O. 'Schön' brings the tongue forward while keeping lips rounded." },
      { id: "oe-5", type: "short_phrase", prompt: "Die schönen Vögel hören Flöte", ipa: "diː ˈʃøːnən ˈføːɡl̩ ˈhøːʁən ˈfløːtə", instruction: "Many ö sounds — keep lips consistently rounded." },
    ],
  },
  {
    id: "phoneme-ch",
    phoneme: "ç/x",
    name: "German CH",
    description: "ich-Laut (ç) vs ach-Laut (x)",
    language: "german",
    steps: [
      { id: "ch-1", type: "isolated", prompt: "ç ç ç", ipa: "ç", instruction: "Like a soft 'sh' but with your tongue raised toward the hard palate. Think of a cat hissing gently." },
      { id: "ch-2", type: "isolated", prompt: "x x x", ipa: "x", instruction: "Like clearing your throat gently. The friction is at the back of the mouth, near the soft palate." },
      { id: "ch-3", type: "word", prompt: "ich", ipa: "ɪç", instruction: "After front vowels (i, e, ü, ö) use the soft ich-Laut." },
      { id: "ch-4", type: "word", prompt: "acht", ipa: "axt", instruction: "After back vowels (a, o, u) use the rough ach-Laut." },
      { id: "ch-5", type: "minimal_pair", prompt: "Kirche — Kuchen", ipa: "ˈkɪʁçə / ˈkuːxn̩", instruction: "'Kirche' has the soft CH (after front vowel). 'Kuchen' has the rough CH (after back vowel)." },
      { id: "ch-6", type: "word", prompt: "Mädchen", ipa: "ˈmɛːtçən", instruction: "Soft CH after the front vowel — gentle friction." },
      { id: "ch-7", type: "short_phrase", prompt: "Ich mache leicht einen Kuchen", ipa: "ɪç ˈmaxə laɪ̯çt ˈaɪ̯nən ˈkuːxn̩", instruction: "Mix of both CH types — listen to where each one falls." },
    ],
  },
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
