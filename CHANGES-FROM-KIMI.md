# Changes from Original Kimi Design

## Summary

The `kimi2` worktree keeps **Kimi's layout** but replaces the buttons with **Gemini's button design**.

---

## Files Changed

| File | Kimi Original | Kimi2 (Combined) |
|------|--------------|------------------|
| `PhonemeDrillSession.tsx` | ✅ Same | ✅ Same (no changes) |
| `PhonemeDrillSession.module.css` | ✅ Same | ✅ Same (no changes) |
| `ShadowingPlayer.tsx` | Horizontal inline buttons | **Vertical 4-column grid** |
| `ShadowingPlayer.module.css` | Compact layout | **Taller buttons, distinct colors** |

---

## Detailed Changes: ShadowingPlayer

### 1. Layout Structure

#### Kimi (Original)
```
┌─────────────────────────────────────────────────────────┐
│  ● Ready to practice                                    │
│                                                         │
│  [🔊] [⏺] [🔄] [🎙️]          Speed: [0.6x][0.8x][1x]  │
│  Listen Record L&R Shadow                               │
└─────────────────────────────────────────────────────────┘

Layout: Flexbox row (horizontal inline)
- Buttons: 72px min-width, 64px height
- Speed control: Right-aligned
```

#### Kimi2 (Combined with Gemini)
```
┌─────────────────────────────────────────────────────────┐
│  ● Ready to practice                                    │
│                                                         │
│  [  ▶  ]  [  ⏺  ]  [  🔄  ]  [  🎙️  ]                   │
│  Listen   Record  L&R     Shadow                        │
│                                                         │
│  Speed: [0.6x] [0.8x] [1.0x]                            │
└─────────────────────────────────────────────────────────┘

Layout: CSS Grid 4 columns
- Buttons: Full column width, 80px min-height
- Speed control: Centered below buttons
```

### 2. Button Styling

| Aspect | Kimi | Kimi2 (Gemini) |
|--------|------|----------------|
| **Layout** | Flex row | Grid (4 columns) |
| **Height** | 64px | 80px (taller) |
| **Min-width** | 72px | Auto (fills grid cell) |
| **Background** | Transparent | `rgba(255,255,255,0.03)` |
| **Border** | 1px transparent | 1px `rgba(255,255,255,0.1)` |
| **Border-radius** | `var(--radius-md)` | `var(--radius-md)` |
| **Icon size** | 20px | 24px (larger) |
| **Label size** | 0.65rem | 0.75rem (larger) |

### 3. State Colors

#### Kimi (Original)
| Button | Hover | Active |
|--------|-------|--------|
| Listen | Primary light | Primary + 15% bg |
| Record | Error color | Error + 15% bg + pulse |
| L&R | Accent light | Accent + 15% bg |
| Shadow | Accent light | Accent + 15% bg |

#### Kimi2 (Gemini Colors)
| Button | Hover | Active | Color |
|--------|-------|--------|-------|
| Listen | Amber | Amber + 10% bg | `#d57a45` |
| Record | Red | Red + 10% bg + pulse | `#ef4444` |
| L&R | Violet | Violet + 10% bg | `#a78bfa` |
| Shadow | Amber | Amber + 10% bg | `#f59e0b` |

### 4. Code Changes

#### ShadowingPlayer.tsx

**Structure change:**
```tsx
// Kimi: Horizontal flex layout
<div className={styles.controlBar}>
  <div className={styles.actions}>
    <button className={styles.actionBtn}>...</button>
    ...
  </div>
  <div className={styles.speedControl}>...</div>
</div>

// Kimi2: Gemini grid layout
<div className={styles.controls}>
  <button className={styles.btn}>...</button>
  ...
</div>
<div className={styles.speedBar}>...</div>
```

**Phase text handling:**
```tsx
// Kimi: Inline JSX
<span className={styles.statusText}>
  {phase === "listening" && t("phaseListening")}
  {phase === "recording" && t("phaseRecording")}
  ...
</span>

// Kimi2: Extracted variable
let phaseText = "";
if (phase === "listening") phaseText = t("phaseListening");
...
<span className={styles.statusText}>
  {phase === "idle" && t("phaseReady")}
  {phaseText}
</span>
```

#### ShadowingPlayer.module.css

**Container:**
```css
/* Kimi */
.controlBar {
  display: flex;
  justify-content: space-between;
  padding: var(--space-sm);
}

/* Kimi2 */
.controls {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-sm);
}
```

**Buttons:**
```css
/* Kimi */
.actionBtn {
  min-width: 72px;
  height: 64px;
  border: 1px solid transparent;
  background: transparent;
}

/* Kimi2 */
.btn {
  min-height: 80px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.03);
}
```

**Button-specific states:**
```css
/* Kimi: Generic active state */
.listenBtn.active { ... }
.modeBtn.active { ... }

/* Kimi2: Named states per button */
.listenBtn.playing { ... }
.listenRepeatBtn.active { ... }
.shadowBtn.active { ... }
```

---

## What Stayed the Same

### PhonemeDrillSession
- ✅ Top navigation bar with breadcrumb + progress bar
- ✅ Left sidebar (260px) with phoneme identity
- ✅ Articulation diagram placement
- ✅ "How to make this sound" instruction box
- ✅ Drill header with step meta and prompt
- ✅ Spectrogram comparison section
- ✅ Score ring feedback design
- ✅ Step dots navigation
- ✅ Bottom navigation with Previous/Next

### ShadowingPlayer Logic
- ✅ All audio handling functions
- ✅ Recording logic
- ✅ Shadow countdown
- ✅ Phase management
- ✅ Props interface

---

## Visual Comparison

| Feature | Kimi | Kimi2 |
|---------|------|-------|
| Button height | Compact (64px) | Prominent (80px) |
| Button layout | Horizontal | 4-column grid |
| Speed control | Right-aligned | Centered below |
| Visual weight | Lighter | Heavier (borders/bg) |
| State colors | Subtle | Distinct per button |
| Icons | 20px | 24px |

---

## Why These Changes?

1. **Gemini's buttons are more discoverable** — Taller buttons with stronger borders
2. **Distinct colors reduce confusion** — Each mode has its own color identity
3. **Grid layout scales better** — Works better on mobile (2x2 grid)
4. **Larger touch targets** — 80px height is easier to tap/click
