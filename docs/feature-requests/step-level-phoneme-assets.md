# Step-Level IPA Asset Lookup for Multi-Phoneme Drills

> GitHub issue: [#12](https://github.com/arieel-ost/native-speech/issues/12)
> Status: Open
> Added: 2026-03-17

## Motivation

When a user practices a general sentence drill (e.g. "The thin thread through the thick cloth"), the analysis identifies weak phonemes. The natural next step is to send the user to a focused phoneme drill for the specific sound they struggle with. This connection between general practice and phoneme drills is the long-term goal.

However, some phoneme drills cover **multiple related sounds** in a single drill (e.g. ship/sheep covers both `ɪ` and `iː`). Currently, all steps in such a drill share the same reference audio because the asset lookup uses the drill-level `phoneme` field, not the step's individual target.

## Problem

`getPhonemeAssets()` in `PhonemeDrillSession.tsx` looks up assets using `drill.phoneme`:

```
drill.phoneme = "ɪ/iː" → alias resolves to "ɪ" → all steps get short I assets
```

Step `ii-2` (isolated `iː`) hears the short I audio instead of long E audio.

## Affected Drills

| Drill | Phoneme field | Sounds covered |
|-------|---------------|----------------|
| `phoneme-ship-sheep` | `ɪ/iː` | short I (`ɪ`), long E (`iː`) |
| `phoneme-ch` | `ç/x` | palatal fricative (`ç`), velar fricative (`x`) |

## Proposed Solution

Add a `targetPhoneme` field to each `PhonemeDrillStep` in `mock-data.ts`. This is a clean phoneme-map key that tells the asset lookup exactly which sound this step targets.

```typescript
// Before — step has no phoneme identity
{ id: "ii-2", type: "isolated", prompt: "iː", ipa: "/iː/", instruction: "..." }

// After — explicit asset key per step
{ id: "ii-2", type: "isolated", prompt: "iː", ipa: "/iː/", targetPhoneme: "iː", instruction: "..." }
```

Then `getPhonemeAssets()` prefers `step.targetPhoneme` over `drill.phoneme` when available.

### Why not parse `step.ipa`?

Non-isolated steps have full-word transcriptions (e.g. `"ʃɪp / ʃiːp"`), so parsing the single target phoneme out of `step.ipa` is fragile. Explicit data is cleaner than parsing.

## Broader Vision: General Drill → Phoneme Drill Connection

This fix is a prerequisite for the larger feature: routing users from general practice to targeted phoneme drills.

```
General Drill ("The thin thread...")
    │
    ▼ Gemini analysis identifies weak phonemes: θ, ð
    │
    ▼ Dashboard shows: "Work on these sounds"
    │
    ▼ Links to phoneme drills: en-th-voiceless, en-th-voiced
    │
    ▼ Each drill step plays the CORRECT reference for its target sound
```

Without step-level asset lookup, the phoneme drill can't reliably play the right reference for each step — undermining the entire targeted practice loop.

## Implementation Checklist

- [ ] Add `targetPhoneme?: string` to `PhonemeDrillStep` type in `mock-data.ts`
- [ ] Populate `targetPhoneme` for steps in multi-phoneme drills (`phoneme-ship-sheep`, `phoneme-ch`)
- [ ] Update `getPhonemeAssets()` to accept optional `stepTargetPhoneme` and prefer it over `drill.phoneme`
- [ ] Verify single-phoneme drills still work (no `targetPhoneme` = falls back to `drill.phoneme`)
- [ ] Add assets for `iː` if not already in `phoneme-map.json` (currently aliased to `i`)
