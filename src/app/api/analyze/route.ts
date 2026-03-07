import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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

    console.log("Audio size:", arrayBuffer.byteLength, "bytes");
    console.log("Audio mimeType:", audio.type);

    const geminiPrompt = `You are a strict pronunciation evaluator. The user is practicing English pronunciation.

They were asked to read this EXACT text aloud: "${prompt}"
Target phonemes to evaluate: ${phonemes ?? "general"}

IMPORTANT INSTRUCTIONS:
1. First, transcribe EXACTLY what the user actually said in the recording. Write it word for word.
2. Compare the transcription to the expected text above. Note any differences — wrong words, missing words, added words.
3. If the user said something completely different from the expected text, say so clearly. Do NOT pretend they read the correct text.
4. Only if the text roughly matches, evaluate pronunciation of the target phonemes.
5. Be honest and direct. Do not give praise unless it is genuinely earned.

Format your response as:
**What you said:** [exact transcription]
**Expected text:** [the prompt above]
**Match:** [yes/partial/no]
**Pronunciation feedback:** [detailed feedback if text matches, or correction if it doesn't]`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          inlineData: {
            data: base64Audio,
            mimeType: "audio/webm",
          },
        },
        geminiPrompt,
      ],
    });

    return NextResponse.json({ feedback: response.text });
  } catch (error) {
    console.error("Analyze API error:", error);
    return NextResponse.json(
      { error: "Failed to analyze recording" },
      { status: 500 },
    );
  }
}
