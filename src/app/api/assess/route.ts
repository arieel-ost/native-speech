import { GoogleGenAI, Type } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const localeToLanguage: Record<string, string> = {
  en: "English",
  ru: "Russian",
  es: "Spanish",
  fr: "French",
};

const assessmentSchema = {
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

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audio = formData.get("audio") as Blob | null;
    const language = formData.get("language") as string | null;
    const passage = formData.get("passage") as string | null;

    if (!audio || !language || !passage) {
      return NextResponse.json(
        { error: "Missing required fields: audio, language, and passage" },
        { status: 400 },
      );
    }

    const locale = (formData.get("locale") as string) ?? "en";
    const uiLanguage = localeToLanguage[locale] ?? "English";

    const fingerprint = request.headers.get("x-learner-id") ?? "anonymous";
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      ?? request.headers.get("x-real-ip")
      ?? "unknown";

    const rateLimit = checkRateLimit(fingerprint, ip);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Daily limit reached. Try again tomorrow." },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimit.retryAfterSeconds),
            "X-RateLimit-Remaining": "0",
          },
        },
      );
    }

    const arrayBuffer = await audio.arrayBuffer();
    const base64Audio = Buffer.from(arrayBuffer).toString("base64");
    const mimeType = audio.type || "audio/webm";

    const drillIds =
      language === "german"
        ? "umlauts, ch-sounds, uvular-r, consonant-clusters, word-stress, intonation"
        : "th-sounds, vowel-pairs, r-l-distinction, word-stress, intonation, consonant-clusters";

    const prompt = `You are an expert phonetician performing an initial accent assessment for a new language learner.

Listen carefully to this audio recording. The speaker was asked to read the following ${language === "german" ? "German" : "English"} passage:

"${passage}"

Your task is to BUILD A LEARNER PROFILE — not give drill-by-drill feedback. Analyse:

1. **Accent origin**: Identify their likely native language from pronunciation patterns. Be specific about which patterns gave it away.

2. **Top problems**: Find the 3-5 most impactful pronunciation issues, ranked by how much they affect comprehensibility. For each, note the specific sound, what the speaker does instead, and a word from the passage where it was clearest.

3. **Strengths**: Note 2-3 things the speaker already does well — this is important for motivation.

4. **Level**: Estimate their overall pronunciation level (beginner/intermediate/advanced).

5. **Drill recommendations**: From these available drill categories: [${drillIds}], recommend an ordered list starting with what would help most.

6. **Summary**: Write a warm, encouraging 2-3 sentence summary. Name their accent, acknowledge strengths, and frame their biggest challenge as very achievable.

Be honest but constructive. This is their first interaction with the app — make them feel understood and motivated.

IMPORTANT: Respond entirely in ${uiLanguage}. All text fields in your response — summary, descriptions, strengths, pattern names — must be written in ${uiLanguage}. Keep IPA symbols and phoneme notation as-is.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          inlineData: {
            data: base64Audio,
            mimeType,
          },
        },
        prompt,
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: assessmentSchema,
      },
    });

    if (!response.text) {
      return NextResponse.json(
        { error: "Gemini returned no analysis — please try again" },
        { status: 502 },
      );
    }

    const assessment = JSON.parse(response.text);

    if (!assessment.accent || !assessment.topProblems) {
      return NextResponse.json(
        { error: "Incomplete analysis returned — please try again" },
        { status: 502 },
      );
    }

    return NextResponse.json({ assessment }, {
      headers: { "X-RateLimit-Remaining": String(rateLimit.remaining) },
    });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error("Assess API error:", err.message);
    return NextResponse.json(
      { error: "Failed to assess recording", details: err.message },
      { status: 500 },
    );
  }
}
