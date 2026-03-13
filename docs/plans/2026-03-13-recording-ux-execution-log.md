# Recording UX Execution Log

**Date:** 2026-03-13
**Branch:** `feature/recording-ux`
**Plan:** `~/.claude/plans/piped-mapping-cherny.md`

## Summary

Added real-time audio feedback during recording: waveform visualization, volume monitoring, voice activity detection (VAD), and smart API gating. Recordings with < 2s detected speech are rejected client-side before hitting the Gemini API.

## Tasks Executed

### Task 1: Install @ricky0123/vad-web + copy WASM assets
- Commit: `a12c363`
- Installed `@ricky0123/vad-web@0.0.30`
- Copied 7 files to `public/vad/`: WASM files, ONNX models, worklet bundle
- Later fix (commit `b8ddb67`): Also needed `.mjs` files from `onnxruntime-web/dist/` for WASM backend loading

### Task 2: Create useAudioPipeline hook (AnalyserNode layer)
- Commit: `2cad146`
- Created `src/hooks/useAudioPipeline.ts`
- Web Audio API AnalyserNode for waveform data + RMS volume
- Basic amplitude-based speech detection as fallback
- MediaRecorder integration (replaces inline recording in DrillSession)

### Task 3: Add VAD layer to useAudioPipeline
- Commit: `efefc38`
- Integrated `@ricky0123/vad-web` MicVAD
- **Plan deviation:** Used `getStream` + `baseAssetPath` + `onnxWASMBasePath` API (docs) instead of plan's `stream` + `ortConfig` + `modelURL` + `workletURL` (outdated API)
- Graceful fallback: if VAD fails (WASM error), amplitude-based detection still works
- VAD tracks `isSpeaking` state and accumulates `speechDuration`

### Task 4: Create WaveformVisualizer component
- Commit: `14fd6ba`
- Canvas-based waveform rendering with DPR-aware scaling
- Dims when silent, brightens when speaking
- Only renders during recording

### Task 5: Create RecordingStatus component
- Commit: `963ce3b`
- Volume bar (green/yellow/red based on level)
- Status text: "Hearing you..." / "Waiting for speech..." / "Preparing audio..."
- Warning messages: too quiet, too loud, no speech detected
- Uses `DrillSession` i18n namespace

### Task 6: Integrate useAudioPipeline into DrillSession
- Commit: `cba6d51`
- Removed inline `mediaRecorderRef` and `chunksRef`
- Added `useAudioPipeline()` hook
- WaveformVisualizer + RecordingStatus rendered between record button and audio player
- Speech gate: recordings with < 2s speech show "Not enough speech detected" error, no API call

### Task 7: Add i18n keys
- Commit: `560565b`
- Added 7 new keys to `DrillSession` namespace in all 4 locales (en, ru, es, fr)

### Task 8: Handle cleanup and edge cases
- Commit: `3c701a6`
- Navigation cleanup: `handleNav` stops recording if active
- AudioContext resume for browser suspension policy
- MediaRecorder stop on unmount
- Commit `d34543f`: Fixed exhaustive-deps lint warning by reordering `analyze` as `useCallback` before `stopRecording`

## Verification Results

### Build
- `bun run build`: Clean pass, no type errors

### Lint
- `bun run lint`: No new errors introduced (pre-existing: 8216 problems from other files)
- Fixed the one new `react-hooks/exhaustive-deps` warning we introduced

### Visual Verification (Chrome)
- [x] Waveform canvas renders during recording (flat line in silence)
- [x] Volume bar shows level with green color
- [x] "Waiting for speech..." status when VAD ready and no speech
- [x] "No speech detected -- try speaking" warning after 3s silence
- [x] Stopping silent recording shows "Not enough speech detected" error
- [x] Audio player still shows for playback after rejection
- [x] Retry button works
- [x] VAD initializes successfully (confirmed via console: "started micVAD")
- [x] Graceful fallback works when .mjs files missing (confirmed in first test)

### Not Tested (requires human)
- [ ] Speaking into microphone (waveform animation, "Hearing you..." state)
- [ ] "Too loud" warning (requires clipping-level input)
- [ ] Full analysis flow with real speech (Gemini API call)
- [ ] Navigation between drills mid-recording
- [ ] Mobile Chrome Android
- [ ] Memory leak check (DevTools Performance)

## Files Changed

### New Files
- `src/hooks/useAudioPipeline.ts` — Core audio pipeline hook
- `src/components/practice/WaveformVisualizer.tsx` + `.module.css`
- `src/components/practice/RecordingStatus.tsx` + `.module.css`
- `public/vad/` — 11 static assets (WASM, ONNX models, worklet, .mjs loaders)

### Modified Files
- `src/components/practice/DrillSession.tsx` — Refactored to use pipeline hook
- `src/messages/en.json`, `ru.json`, `es.json`, `fr.json` — 7 new keys each
- `package.json`, `bun.lock` — Added `@ricky0123/vad-web`
