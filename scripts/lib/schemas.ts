import { Type } from "@google/genai";

export const combinedSchema = {
  type: Type.OBJECT,
  description: "Complete pronunciation analysis with both detailed and simplified views derived from the same analysis",
  properties: {
    simple: {
      type: Type.OBJECT,
      description: "Plain-language overview derived from the detailed analysis below. No technical terms, no IPA, no phonetics jargon.",
      properties: {
        score: {
          type: Type.NUMBER,
          description: "Overall pronunciation score from 1 (very hard to understand) to 10 (sounds like a native speaker)",
        },
        summary: {
          type: Type.STRING,
          description: "A short, friendly paragraph summarizing how the speaker did. Use plain everyday language — no technical terms, no IPA symbols, no phonetics jargon. Talk about specific sounds or words that were tricky.",
        },
        strengths: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "1-3 things the speaker did well, in simple everyday language",
        },
        improvements: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              issue: {
                type: Type.STRING,
                description: "What sounded off, described in plain language (e.g., 'The \"th\" in \"weather\" sounded like a \"d\"')",
              },
              tip: {
                type: Type.STRING,
                description: "A simple, practical tip to fix it (e.g., 'Try putting your tongue between your teeth and blowing gently')",
              },
            },
            required: ["issue", "tip"],
          },
          description: "1-3 specific things to work on, with easy-to-follow tips",
        },
      },
      required: ["score", "summary", "strengths", "improvements"],
    },
    detailed: {
      type: Type.OBJECT,
      description: "Technical phonetic analysis with full detail",
      properties: {
        accent: {
          type: Type.OBJECT,
          description: "Detected accent and native language analysis",
          properties: {
            detectedLanguage: {
              type: Type.STRING,
              description: "Best guess of speaker's native language or language family",
            },
            confidence: {
              type: Type.STRING,
              description: "How confident the detection is: high, medium, or low",
            },
            telltalePatterns: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Specific accent patterns that reveal the native language (e.g., 'final consonant devoicing', 'vowel reduction missing')",
            },
          },
          required: ["detectedLanguage", "confidence", "telltalePatterns"],
        },
        phonemeAnalysis: {
          type: Type.ARRAY,
          description: "Per-phoneme-per-word breakdown. One entry for each occurrence of a target phoneme in a specific word. For example, if /θ/ appears in both 'think' and 'weather', produce TWO entries — one for each word — so the speaker sees exactly where they succeeded or struggled.",
          items: {
            type: Type.OBJECT,
            properties: {
              phoneme: {
                type: Type.STRING,
                description: "The target phoneme in IPA (e.g., /θ/, /æ/, /ɹ/)",
              },
              word: {
                type: Type.STRING,
                description: "The specific word from the prompt where this phoneme was evaluated (e.g., 'think', 'weather')",
              },
              rating: {
                type: Type.STRING,
                description: "Quality rating: good, acceptable, or needs_work",
              },
              produced: {
                type: Type.STRING,
                description: "How the speaker actually produced this sound in this word (e.g., 'dental stop /t/ instead of fricative')",
              },
              expected: {
                type: Type.STRING,
                description: "How a native speaker produces this sound (tongue position, voicing, etc.)",
              },
              substitution: {
                type: Type.STRING,
                nullable: true,
                description: "What sound was substituted, if any (e.g., '/t/ for /θ/'). Null if produced correctly.",
              },
            },
            required: ["phoneme", "word", "rating", "produced", "expected"],
          },
        },
        prosody: {
          type: Type.OBJECT,
          description: "Intonation, stress, and rhythm analysis",
          properties: {
            stressAccuracy: {
              type: Type.STRING,
              description: "Rating: natural, slightly_off, or unnatural",
            },
            rhythmNotes: {
              type: Type.STRING,
              description: "Observations about syllable timing, sentence rhythm (e.g., 'syllable-timed instead of stress-timed')",
            },
            intonationNotes: {
              type: Type.STRING,
              description: "Observations about pitch contour and intonation patterns",
            },
          },
          required: ["stressAccuracy", "rhythmNotes", "intonationNotes"],
        },
        overallScore: {
          type: Type.NUMBER,
          description: "Overall pronunciation score from 1 (unintelligible) to 10 (native-like)",
        },
        tips: {
          type: Type.ARRAY,
          description: "2-4 concrete, actionable exercises — one per unique sound that needs work. Do NOT repeat the same target sound. Each tip should cover that sound regardless of which word it appeared in.",
          items: {
            type: Type.OBJECT,
            properties: {
              targetSound: {
                type: Type.STRING,
                description: "The sound or pattern this tip addresses",
              },
              exercise: {
                type: Type.STRING,
                description: "Specific physical instruction (e.g., 'place tongue between teeth, blow air gently')",
              },
              practiceWord: {
                type: Type.STRING,
                description: "A word to practice this sound with",
              },
            },
            required: ["targetSound", "exercise", "practiceWord"],
          },
        },
      },
      required: ["accent", "phonemeAnalysis", "prosody", "overallScore", "tips"],
    },
    textMatch: {
      type: Type.STRING,
      description: "Whether the speaker read the expected text: yes, partial, or no",
    },
    wordScores: {
      type: Type.ARRAY,
      description:
        "Per-word pronunciation assessment. One entry for EVERY word in the prompt, in order. Score each word based on how clearly and correctly the speaker pronounced it.",
      items: {
        type: Type.OBJECT,
        properties: {
          word: {
            type: Type.STRING,
            description: "The exact word from the prompt",
          },
          index: {
            type: Type.NUMBER,
            description: "Zero-based position of this word in the prompt",
          },
          score: {
            type: Type.NUMBER,
            description:
              "Pronunciation quality score from 1 (unintelligible) to 10 (native-like)",
          },
          rating: {
            type: Type.STRING,
            description:
              "Quality category: good (score 7-10), acceptable (score 4-6), or needs_work (score 1-3)",
          },
          issue: {
            type: Type.STRING,
            nullable: true,
            description:
              "Brief description of what was wrong, if anything (e.g., 'th pronounced as d'). Null if good.",
          },
        },
        required: ["word", "index", "score", "rating"],
      },
    },
  },
  required: ["simple", "detailed", "textMatch", "wordScores"],
};

export const assessmentSchema = {
  type: Type.OBJECT,
  description: "Onboarding accent assessment profile",
  properties: {
    accent: {
      type: Type.OBJECT,
      properties: {
        detectedLanguage: {
          type: Type.STRING,
          description: "Best guess of speaker's native language or language family",
        },
        confidence: {
          type: Type.STRING,
          description: "high, medium, or low",
        },
        telltalePatterns: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description:
            "Specific accent patterns that reveal the native language (e.g., 'θ→s substitution', 'final consonant devoicing')",
        },
      },
      required: ["detectedLanguage", "confidence", "telltalePatterns"],
    },
    overallScore: {
      type: Type.NUMBER,
      description: "Overall pronunciation score from 1 (very hard to understand) to 10 (native-like)",
    },
    level: {
      type: Type.STRING,
      description: "Estimated proficiency level: beginner, intermediate, or advanced",
    },
    topProblems: {
      type: Type.ARRAY,
      description: "Top 3-5 pronunciation problems, ranked by severity",
      items: {
        type: Type.OBJECT,
        properties: {
          sound: {
            type: Type.STRING,
            description: "The problematic sound or pattern in IPA (e.g., /θ/, /r/, vowel length)",
          },
          description: {
            type: Type.STRING,
            description: "Plain-language description of the issue (e.g., 'Your \"th\" sounds like \"s\"')",
          },
          severity: {
            type: Type.STRING,
            description: "high, medium, or low",
          },
          exampleWord: {
            type: Type.STRING,
            description: "A word from the passage where this problem was most noticeable",
          },
        },
        required: ["sound", "description", "severity", "exampleWord"],
      },
    },
    strengths: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "2-3 things the speaker does well, in plain language",
    },
    recommendedDrills: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description:
        "Ordered list of drill category IDs to prioritize (from: th-sounds, vowel-pairs, r-l-distinction, word-stress, intonation, consonant-clusters)",
    },
    summary: {
      type: Type.STRING,
      description:
        "A warm, encouraging 2-3 sentence summary of the assessment. Acknowledge what's good, name the biggest area to work on, and express confidence they'll improve.",
    },
  },
  required: [
    "accent",
    "overallScore",
    "level",
    "topProblems",
    "strengths",
    "recommendedDrills",
    "summary",
  ],
};

export const phonemeFeedbackSchema = {
  type: Type.OBJECT,
  description: "Focused pronunciation feedback for a single phoneme drill step",
  properties: {
    score: {
      type: Type.NUMBER,
      description: "Pronunciation quality score from 1 (very unclear) to 10 (native-like)",
    },
    summary: {
      type: Type.STRING,
      description:
        "A short, friendly 1-2 sentence summary of how the speaker did on this specific sound. Use plain language, no IPA or phonetics jargon.",
    },
    tip: {
      type: Type.STRING,
      description:
        "One concrete, actionable tip to improve this specific sound. Describe mouth/tongue position in simple terms.",
    },
    phonemeRating: {
      type: Type.STRING,
      description: "Quality category: good (score 7-10), acceptable (score 4-6), or needs_work (score 1-3)",
    },
    produced: {
      type: Type.STRING,
      description:
        "What sound the speaker actually produced (in plain language, e.g., 'a D sound instead of TH')",
    },
    expected: {
      type: Type.STRING,
      description:
        "What a native speaker would produce (in plain language, e.g., 'tongue between teeth with air flow')",
    },
  },
  required: ["score", "summary", "tip", "phonemeRating", "produced", "expected"],
};

export const voiceProfileSchema = {
  type: Type.OBJECT,
  description: "Comprehensive voice and accent profile from free speech analysis",
  properties: {
    speaker: {
      type: Type.OBJECT,
      description: "Speaker vocal characteristics",
      properties: {
        estimatedGender: {
          type: Type.STRING,
          description: "Estimated gender from voice: male, female, or ambiguous",
        },
        estimatedAgeRange: {
          type: Type.STRING,
          description: "Approximate age range (e.g., '20-30', '40-50')",
        },
        vocalTraits: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description:
            "Notable vocal characteristics (e.g., 'breathy', 'nasal resonance', 'vocal fry', 'high pitch', 'monotone')",
        },
      },
      required: ["estimatedGender", "estimatedAgeRange", "vocalTraits"],
    },
    accent: {
      type: Type.OBJECT,
      properties: {
        detectedLanguage: {
          type: Type.STRING,
          description: "Best guess of speaker's native language or dialect",
        },
        confidence: {
          type: Type.STRING,
          description: "high, medium, or low",
        },
        telltalePatterns: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description:
            "Specific phonetic features that reveal native language (e.g., 'vowel reduction absent', 'θ→s substitution', 'final obstruent devoicing')",
        },
      },
      required: ["detectedLanguage", "confidence", "telltalePatterns"],
    },
    phonemeProblems: {
      type: Type.ARRAY,
      description: "Specific sounds the speaker struggles with, ranked by impact",
      items: {
        type: Type.OBJECT,
        properties: {
          phoneme: {
            type: Type.STRING,
            description: "Target phoneme in IPA (e.g., /θ/, /æ/, /ɹ/)",
          },
          produced: {
            type: Type.STRING,
            description: "What the speaker actually produces (e.g., '/s/ instead of /θ/')",
          },
          exampleWord: {
            type: Type.STRING,
            description: "A word from the speaker's speech where this was most audible",
          },
          severity: {
            type: Type.STRING,
            description: "Impact on intelligibility: high, medium, or low",
          },
        },
        required: ["phoneme", "produced", "exampleWord", "severity"],
      },
    },
    prosody: {
      type: Type.OBJECT,
      description: "Rhythm, intonation, and fluency analysis",
      properties: {
        rhythmType: {
          type: Type.STRING,
          description: "Observed rhythm pattern: stress-timed, syllable-timed, or mixed",
        },
        speechRate: {
          type: Type.STRING,
          description: "slow, normal, or fast relative to native speakers",
        },
        intonation: {
          type: Type.STRING,
          description: "Observations about pitch patterns — native-like, flat, exaggerated, or L1-influenced",
        },
        fluencyNotes: {
          type: Type.STRING,
          description:
            "Observations about pausing, hesitation, connected speech (linking, elision, assimilation)",
        },
      },
      required: ["rhythmType", "speechRate", "intonation", "fluencyNotes"],
    },
    strengths: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "2-3 things the speaker does well",
    },
    overallScore: {
      type: Type.NUMBER,
      description: "Overall intelligibility score from 1 (very hard to understand) to 10 (native-like)",
    },
    level: {
      type: Type.STRING,
      description: "Estimated proficiency level: beginner, intermediate, or advanced",
    },
    recommendedFocus: {
      type: Type.ARRAY,
      description: "Priority areas for improvement, ranked by impact on comprehensibility",
      items: {
        type: Type.OBJECT,
        properties: {
          area: {
            type: Type.STRING,
            description: "The skill or sound to work on (e.g., 'th-sounds', 'vowel length', 'sentence stress')",
          },
          reason: {
            type: Type.STRING,
            description: "Why this matters — how it affects the speaker's intelligibility",
          },
        },
        required: ["area", "reason"],
      },
    },
    transcript: {
      type: Type.STRING,
      description: "Best-effort transcription of what the speaker said",
    },
  },
  required: [
    "speaker",
    "accent",
    "phonemeProblems",
    "prosody",
    "strengths",
    "overallScore",
    "level",
    "recommendedFocus",
    "transcript",
  ],
};
