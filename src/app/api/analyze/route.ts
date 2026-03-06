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

    const geminiPrompt = `You are a pronunciation coach. The user is practicing English pronunciation.

They were asked to read aloud: "${prompt}"
Target phonemes to evaluate: ${phonemes ?? "general"}

Listen to their recording and provide detailed feedback on:
- Overall intelligibility
- Specific phoneme accuracy for the target sounds
- Any other pronunciation issues you notice
- Concrete tips for improvement

Be encouraging but honest.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
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
