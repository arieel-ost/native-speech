import { GoogleGenAI, Type } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";

export const maxDuration = 60;

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const localeToLanguage: Record<string, string> = {
  en: "English",
  ru: "Russian",
  es: "Spanish",
  fr: "French",
};

const phonemeFeedbackSchema = {
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

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audio = formData.get("audio") as Blob | null;
    const prompt = formData.get("prompt") as string | null;
    const phonemes = formData.get("phonemes") as string | null;
    const locale = (formData.get("locale") as string) ?? "en";
    const language = localeToLanguage[locale] ?? "English";

    if (!audio || !prompt) {
      return NextResponse.json(
        { error: "Missing required fields: audio and prompt" },
        { status: 400 },
      );
    }

    const fingerprint = request.headers.get("x-learner-id") ?? "anonymous";
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      "unknown";

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

    const targetPhonemes = phonemes ?? "general";

    const analysisPrompt = `You are an expert phonetician and pronunciation coach. Listen carefully to this audio recording.

The speaker is practicing a specific phoneme drill. They were asked to say: "${prompt}"
Target phoneme: ${targetPhonemes}

This is a focused phoneme exercise — the speaker may be saying an isolated sound, a single word, a minimal pair, or a short phrase. Evaluate ONLY how well they produced the target phoneme(s).

Be specific about:
- Whether the target sound was correctly produced
- What the speaker actually said vs what was expected
- One clear, physical tip for improvement (tongue position, lip shape, airflow, voicing)

Be encouraging but honest. If they got it right, celebrate that!

IMPORTANT: Respond entirely in ${language}. All text fields must be in ${language}.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          inlineData: {
            data: base64Audio,
            mimeType: audio.type || "audio/webm",
          },
        },
        analysisPrompt,
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: phonemeFeedbackSchema,
      },
    });

    const analysis = JSON.parse(response.text ?? "{}");
    return NextResponse.json(
      { feedback: analysis },
      {
        headers: { "X-RateLimit-Remaining": String(rateLimit.remaining) },
      },
    );
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error("Phoneme analysis error:", err.message);
    return NextResponse.json(
      {
        error: "Failed to analyze recording",
        details: err.message,
      },
      { status: 500 },
    );
  }
}
