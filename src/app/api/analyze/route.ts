import { GoogleGenAI, Type } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

export type AnalysisMode = "advanced" | "simplified" | "json";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const combinedSchema = {
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
  },
  required: ["simple", "detailed", "textMatch"],
};

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audio = formData.get("audio") as Blob | null;
    const prompt = formData.get("prompt") as string | null;
    const phonemes = formData.get("phonemes") as string | null;

    if (!audio || !prompt) {
      return NextResponse.json(
        { error: "Missing required fields: audio and prompt" },
        { status: 400 },
      );
    }

    const arrayBuffer = await audio.arrayBuffer();
    const base64Audio = Buffer.from(arrayBuffer).toString("base64");

    console.log("--- Analyze request ---");
    console.log("Audio size:", arrayBuffer.byteLength, "bytes");
    console.log("Audio mimeType:", audio.type);
    console.log("Prompt:", prompt);
    console.log("Phonemes:", phonemes);
    console.log("GEMINI_API_KEY set:", !!process.env.GEMINI_API_KEY);

    const combinedPrompt = `You are an expert phonetician and accent coach. Listen carefully to this audio recording and analyse the SOUNDS — how they are physically produced — not just the words.

The speaker was asked to read: "${prompt}"
Target phonemes to focus on: ${phonemes ?? "general"}

Provide TWO views of your analysis:

1. "detailed" — Full technical analysis: accent origin and telltale patterns, per-phoneme production quality (tongue position, voicing, aspiration, vowel quality) with IPA, sound substitutions, stress/rhythm/intonation, and concrete practice exercises. Be honest and detailed.

2. "simple" — A friendly plain-language summary of the SAME analysis above. No technical terms, no IPA symbols, no phonetics jargon. Describe sounds using everyday words (e.g., 'the "th" sounded like a "d"'). Include what went well and practical tips. Be honest but encouraging.

Both views must reflect the same underlying analysis — the simple view is an accessible overview of the detailed findings.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          inlineData: {
            data: base64Audio,
            mimeType: "audio/webm",
          },
        },
        combinedPrompt,
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: combinedSchema,
      },
    });

    console.log("Gemini raw response:", response.text?.slice(0, 500));
    const analysis = JSON.parse(response.text ?? "{}");
    console.log("--- Analyze complete ---");
    return NextResponse.json({ feedback: analysis });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error("--- Analyze API error ---");
    console.error("Message:", err.message);
    console.error("Name:", err.name);
    if ("status" in err) console.error("Status:", (err as Record<string, unknown>).status);
    if ("statusText" in err) console.error("StatusText:", (err as Record<string, unknown>).statusText);
    if ("errorDetails" in err) console.error("Details:", JSON.stringify((err as Record<string, unknown>).errorDetails, null, 2));
    console.error("Stack:", err.stack);
    console.error("Full error:", JSON.stringify(error, Object.getOwnPropertyNames(err), 2));
    console.error("--- End error ---");
    return NextResponse.json(
      {
        error: "Failed to analyze recording",
        details: err.message,
      },
      { status: 500 },
    );
  }
}
