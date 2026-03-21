# Phoneme Drill Page — Combined Design Implementation

## Overview

This is the **implementation branch** (`kimi2`) for the combined phoneme practice design.

**Status:** ✅ Implemented and building successfully

**Location:** `.worktrees/kimi2/`

## Design Philosophy

This implementation combines the best elements from the different redesign attempts:
- **Kimi's layout** — Dashboard-style with sidebar, progress bar, and polished visual design
- **Gemini's buttons** — Vertical grid layout with distinct state colors and clear iconography

## Implementation Summary

### Files Modified

| File | Description |
|------|-------------|
| `PhonemeDrillSession.tsx` | Main layout component with sidebar + practice zone |
| `PhonemeDrillSession.module.css` | Layout styles, responsive breakpoints |
| `ShadowingPlayer.tsx` | Control buttons with Gemini-style vertical grid |
| `ShadowingPlayer.module.css` | Button styles with distinct state colors |

### Key Features

✅ Top navigation bar with breadcrumb + gradient progress bar  
✅ Left sidebar (260px) — Phoneme identity, articulation diagram, instruction  
✅ Right practice zone — Prompt, controls, spectrogram, feedback  
✅ Gemini-style buttons — 4-column grid, vertical layout, colored states  
✅ Speed toggle (0.6x / 0.8x / 1x)  
✅ Score ring feedback with rating labels  
✅ Step dots navigation  
✅ Responsive design (collapses sidebar on mobile)  

### Button States

| Button | Idle | Active | Color |
|--------|------|--------|-------|
| Listen | Muted | Playing | Amber/Copper |
| Record | Muted | Recording | Red (pulsing) |
| Listen & Repeat | Muted | Active | Violet/Purple |
| Shadow | Muted | Active | Amber/Orange |

---

## Original Proposal Details

This section contains the original analysis and design decisions.

## Analysis of Existing Designs

### 1. Kimi Design (`kimi.png` / `poneme-redesign-kimi`)

**Strengths:**
- Clean dashboard-style layout with clear visual hierarchy
- Left sidebar with phoneme identity, articulation diagram, and instruction
- Horizontal control buttons (Listen, Record, Listen & Repeat, Shadow) with speed toggle
- Beautiful progress bar at the top
- Step dots navigation at the bottom
- Score ring feedback design
- Warm, polished color palette with good use of accent colors
- "Ready to practice" status indicator

**Weaknesses:**
- Sidebar takes significant horizontal space
- No clear panel separation (Reference vs Practice)

### 2. Panels Design (`panels.png` — likely `poneme-redesign-claude` or similar)

**Strengths:**
- Clear two-panel layout: Reference (left) vs Practice (right)
- Large phoneme display in practice panel
- Clear visual separation between learning and doing
- Articulation diagram prominently displayed in reference panel
- Tab toggle for spectrogram view (Side by side / Overlay)

**Weaknesses:**
- Less polished visual design
- No progress indicator at the top
- Step navigation less visible

### 3. Claude Design (`poneme-redesign-claude`)

**Strengths:**
- Split-panel layout with sticky theory panel
- Mobile-responsive theory strip (collapsible on mobile)
- Clean, minimal design
- Good use of whitespace

**Weaknesses:**
- Theory panel might be too narrow
- Less visual "pop" compared to Kimi

### 4. Gravity Design (`poneme-redesign-gravity`)

**Strengths:**
- Single-column focused layout
- Sound reference section clearly separated

**Weaknesses:**
- No side-by-side comparison
- Less efficient use of wide screens

---

## Proposed Combined Design

### Layout Architecture: "Dashboard with Focused Panels"

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Breadcrumb: Practice / θ Voiceless TH        Progress Bar        8 / 8 │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌─────────────────────────────────────────────────┐  │
│  │              │  │  ◆ PHRASE  •  Step 8 of 8                       │  │
│  │   ┌────┐     │  │                                                 │  │
│  │   │ θ  │     │  │         "I think three thoughts"                │  │
│  │   └────┘     │  │              /aɪ θɪŋk θriː θɔːts/               │  │
│  │  Voiceless   │  │                                                 │  │
│  │     TH       │  │  ┌─────────────────────────────────────────┐    │  │
│  │    /θ/       │  │  │  ● READY TO PRACTICE                    │    │  │
│  │              │  │  │                                         │    │  │
│  │ [Mouth diag] │  │  │  [🔊]  [⏺]  [🔄]  [🎙️]    Speed: 0.6x 1x │    │  │
│  │              │  │  │  Listen Record L&R  Shadow                │    │  │
│  ├──────────────┤  │  └─────────────────────────────────────────┘    │  │
│  │ HOW TO MAKE  │  │                                                 │  │
│  │ THIS SOUND   │  │  REFERENCE                    [Side|Overlay]    │  │
│  │              │  │  ┌─────────────────┐  ┌─────────────────┐      │  │
│  │ Place your   │  │  │  [Spectrogram]  │  │  [Spectrogram]  │      │  │
│  │ tongue tip   │  │  │    REFERENCE    │  │       YOU       │      │  │
│  │ gently...    │  │  └─────────────────┘  └─────────────────┘      │  │
│  │              │  │                                                 │  │
│  └──────────────┘  │  ┌─────────────────────────────────────────┐    │  │
│       THEORY       │  │  🎙️ Record your voice to see how you    │    │  │
│      PANEL         │  │     compare to the reference.           │    │  │
│  (Sticky, 260px)   │  └─────────────────────────────────────────┘    │  │
│                    │                                                 │  │
│                    └─────────────────────────────────────────────────┘  │
│                              PRACTICE PANEL (Flexible)                  │
├─────────────────────────────────────────────────────────────────────────┤
│  [← Previous]  ● ● ● ● ● ● ● ●  [Next →]                                │
└─────────────────────────────────────────────────────────────────────────┘
```

### Key Design Decisions

#### 1. **Two-Panel Layout** (from Panels + Kimi)
- **Left Panel (Theory)**: 260px sticky sidebar
  - Large phoneme symbol (5rem)
  - Phoneme name and IPA notation
  - Articulation diagram
  - "How to make this sound" instruction box
  - Collapses to theory strip on mobile (from Claude)

- **Right Panel (Practice)**: Flexible width
  - Step metadata (type icon, step number)
  - Large prompt with IPA
  - Control buttons
  - Spectrogram comparison
  - Feedback zone

#### 2. **Top Navigation Bar** (from Kimi)
- Breadcrumb navigation (Practice / Phoneme)
- Progress bar with gradient fill
- Step counter (current / total)

#### 3. **Control Buttons** (from Kimi)
- Horizontal layout: Listen | Record | Listen & Repeat | Shadow
- Speed toggle (0.6x, 0.8x, 1x) aligned right
- Clean icon + label design
- Active state indicators

#### 4. **Spectrogram Section** (from Panels)
- "REFERENCE" label with toggle for Side-by-side / Overlay
- Reference spectrogram (left) vs User spectrogram (right)
- Clear labeling

#### 5. **Feedback Zone** (from Kimi)
- Score ring with /10 display
- Rating label ("Excellent", "Good progress", "Keep practicing")
- Phoneme comparison when applicable (Heard → Target)
- Summary text
- Tip box with lightbulb icon
- Audio playback of user's recording

#### 6. **Bottom Navigation** (from Kimi)
- Previous / Next buttons with arrows
- Step dots (clickable)
  - Default: small dot
  - Active: elongated pill
  - Completed: green with checkmark

#### 7. **Visual Design** (from Kimi + Panels)
- Warm color palette with amber/copper accents
- Card-based layout with subtle borders
- `var(--color-surface-alt)` for panel backgrounds
- Consistent spacing using CSS variables
- Border radius for soft, modern feel

### CSS Architecture

```css
/* Container */
.container {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 80px);
  max-width: 1400px;
  margin: 0 auto;
}

/* Top Bar */
.topBar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-sm) var(--space-md);
  background: var(--color-surface-alt);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
}

/* Main Content */
.main {
  display: flex;
  gap: var(--space-md);
  flex: 1;
  min-height: 0;
}

/* Theory Panel (Sticky) */
.theoryPanel {
  width: 260px;
  flex-shrink: 0;
  position: sticky;
  top: var(--space-lg);
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  padding: var(--space-lg);
  background: var(--color-surface-alt);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
}

/* Practice Panel */
.practicePanel {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  padding: var(--space-lg);
  background: var(--color-surface-alt);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  min-width: 0;
  overflow-y: auto;
}
```

### Mobile Responsive Strategy (from Claude)

**Tablet (< 900px):**
- Theory panel collapses to horizontal strip
- Phoneme symbol + name + mini diagram in a row
- Practice panel takes full width

**Mobile (< 640px):**
- Theory strip becomes expandable accordion
- Full-width controls
- Simplified step navigation

### Component Structure

```
PhonemeDrillSession
├── TopBar
│   ├── Breadcrumb
│   └── ProgressIndicator
├── MainContent
│   ├── TheoryPanel (sticky)
│   │   ├── PhonemeIdentity
│   │   ├── ArticulationDiagram
│   │   └── InstructionBox
│   └── PracticePanel
│       ├── StepHeader
│       │   ├── StepTypeBadge
│       │   └── StepProgress
│       ├── PromptDisplay
│       ├── ControlBar
│       │   ├── ModeButtons (Listen, Record, L&R, Shadow)
│       │   └── SpeedToggle
│       ├── SpectrogramComparison
│       └── FeedbackZone
└── BottomNavigation
    ├── PrevButton
    ├── StepDots
    └── NextButton
```

### Implementation Notes

1. **Keep existing data layer**: The phoneme asset loading, analysis API calls, and state management remain unchanged

2. **Reusable components to create/update**:
   - `TopBar` — new component for breadcrumb + progress
   - `TheoryPanel` — extracted from existing code
   - `PracticePanel` — main content area
   - `ControlBar` — horizontal button group with speed toggle
   - `StepDots` — navigation dots component
   - `FeedbackZone` — score, comparison, tips, playback

3. **CSS Modules approach**: Use the existing `PhonemeDrillSession.module.css` pattern with the combined styles

4. **Animation considerations**:
   - Progress bar fill animation (0.3s ease)
   - Step dot transitions (0.2s ease)
   - Feedback zone fade-in
   - Theory strip expand/collapse (mobile)

---

## Summary: What to Take From Each Design

| Feature | Source | Notes |
|---------|--------|-------|
| Two-panel layout | Panels + Kimi | Sidebar + main content |
| Visual polish | Kimi | Colors, shadows, spacing |
| Top progress bar | Kimi | Gradient fill, step counter |
| Control buttons | Kimi | Horizontal layout, speed toggle |
| Score ring feedback | Kimi | /10 display with rating label |
| Step dots navigation | Kimi | Clickable, animated states |
| Theory strip (mobile) | Claude | Collapsible accordion |
| Panel labeling | Panels | "Reference" / "Practice" clarity |
| Spectrogram toggle | Panels | Side-by-side / Overlay |
| Sticky sidebar | Claude | Position: sticky behavior |

## Next Steps

1. Create the combined component structure
2. Merge CSS styles from both approaches
3. Implement mobile-responsive theory strip
4. Test with different phonemes and step types
5. Verify spectrogram alignment and feedback display
