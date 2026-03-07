# Cost Estimation for Gemini Models — NativeSpeechAI

## Audio Token Conversion Standard

Gemini converts raw audio into tokens at a fixed rate:

| Duration | Tokens |
|----------|--------|
| 1 Second | 32 tokens |
| 1 Minute | 1,920 tokens |
| 1 Hour | 115,200 tokens |

## Base Rate Card (per 1 Million Tokens)

| Model | Audio Input | Text Input | Text Output |
|-------|-------------|------------|-------------|
| Gemini 3.1 Flash-Lite | $0.50 | $0.50 | $1.50 |
| Gemini 3.0 Flash | $1.00 | $0.50 | $3.00 |

## Practical Session Cost (Gemini 3.0 Flash)

Calculated for 1 hour of active user speaking, broken down into 240 individual 15-second speech drills.

| Component | Tokens | Cost |
|-----------|--------|------|
| Audio Input (User's spoken raw audio) | 115,200 | $0.115 |
| Text Input (System prompt + target phrase) | 48,000 | $0.024 |
| Text Output (Structured JSON phonetic feedback) | 72,000 | $0.216 |
| **Total Estimated Cost Per 1 Hour of Drills** | | **~$0.355** |

## The $1.00 Value Metric

- **Raw Audio Limit:** $1.00 buys exactly 1,000,000 audio tokens, equal to ~8.6 hours of raw audio ingestion.
- **True Functional Limit:** When factoring in the text output required to generate the actionable JSON scorecards, $1.00 covers ~2.8 hours of active user drill time.
