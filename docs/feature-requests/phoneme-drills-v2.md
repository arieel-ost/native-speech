# Mouth/Tongue Articulation Animation for Phoneme Drills

> Status: Brainstorming
> Added: 2026-03-17

## Problem

Spectrograms are abstract — a learner sees "my frequencies are wrong" but can't translate that into physical action. The existing text instructions ("tongue tip between teeth") help but aren't visual. Learners need to see **what their mouth should be doing** to produce a sound correctly.

## Proposed Approach: Animated 2D SVG Sagittal Diagrams

Sagittal cross-section view of the mouth (side cutaway from linguistics textbooks) showing:

- **Tongue** — position, shape, and contact points (parameterized curve)
- **Lips** — rounding, spread, opening degree
- **Teeth / alveolar ridge** — contact indicators
- **Airflow** — direction arrows (oral vs nasal), voicing indication
- **Soft palate** — raised (oral) vs lowered (nasal)

Each phoneme defined as a set of control points. The component interpolates between them for smooth animation.

## Implementation Tiers

### Tier 1: Static SVG per phoneme (start here)
A library of ~20 mouth diagrams, one per phoneme. Show alongside the drill step. Already very useful — this is what textbooks do.

### Tier 2: Animated SVG transitions
Define phoneme configurations as data, tween between control points. Sync with audio playback — as the sound plays, the mouth animates into position. Can also animate transitions (e.g., /s/ → /θ/) to show exactly what needs to change.

### Tier 3: Interactive exploration
Let user toggle layers (airflow on/off, voicing on/off), zoom in on contact points. Still 2D SVG with controls.

### Tier 4: 3D model (deferred)
Three.js or pre-rendered WebGL. High effort, high wow-factor. Speech therapy tools do this already.

## Design Decision

Start with Tier 1 (static SVGs) but design the data model to support Tier 2. A control-point approach means the same data structure scales from static to animated without rearchitecting.

## Prior Art

- **University of Iowa "Sounds of Speech"** — 3D mouth animations for every IPA sound
- **Speech Tutor app** — 3D rotatable mouth models
- **SeeingSpeech (University of Glasgow)** — MRI-based articulation videos

## Open Questions

- Commission an illustrator for the base SVGs, or build procedurally from control-point data?
- Show alongside the spectrogram, or replace it as the primary visual for beginners?
- Can we generate the SVG configurations programmatically from IPA articulatory feature descriptions?
