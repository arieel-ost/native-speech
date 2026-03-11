# Design Board Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a multiagent design review board — 13 specialized role agents that stress-test designs, callable as a board or individually.

**Architecture:** Each role is a prompt file in `~/.claude/skills/design-board/roles/`. An orchestrator skill (`/design-board`) dispatches agents in parallel. A router skill (`/review-as`) dispatches a single role. The brainstorming skill integrates via documentation in CLAUDE.md.

**Tech Stack:** Claude Code skills (SKILL.md + prompt templates), Agent tool (general-purpose subagents)

---

### Task 1: Create role prompt files — Core 5

**Files:**
- Create: `~/.claude/skills/design-board/roles/tech-architect.md`
- Create: `~/.claude/skills/design-board/roles/developer.md`
- Create: `~/.claude/skills/design-board/roles/devils-advocate.md`
- Create: `~/.claude/skills/design-board/roles/ux-design-thinker.md`
- Create: `~/.claude/skills/design-board/roles/ops-devops.md`

**Step 1: Create the roles directory**

```bash
mkdir -p ~/.claude/skills/design-board/roles
```

**Step 2: Write each core role prompt**

Each role file follows this template structure:

```markdown
# [Role Name] — Design Board Role

## Identity

You are the **[Role Name]** on a design review board. Your job is to evaluate a proposed design exclusively through the lens of [lens description].

## What You Care About

- [2-4 bullet points of specific concerns]

## What You Ignore

- [Things outside your role's scope — other roles handle these]

## How to Review

1. Read the full design
2. Evaluate against your concerns
3. Be specific — cite sections, name components, reference decisions
4. Suggest concrete alternatives, not vague "consider this"

## Output Format

## [Role Name] Review

**Verdict:** ✅ Approved | ⚠️ Concerns | ❌ Blocker

### Concerns (if any)
- [Specific concern with reasoning]

### Suggestions (if any)
- [Concrete actionable suggestion]

### What looks good
- [Strengths from this role's perspective]
```

**Role-specific content:**

**tech-architect.md** — System design, integrations, scalability, patterns. Cares about: component boundaries, data flow, API surface, dependency management, scaling characteristics, tech debt risk. Ignores: code style, UX, business justification.

**developer.md** — Buildability, DX, practical implementation. Cares about: can this actually be built as designed? How long? What's unclear? What dependencies are missing? Is the API ergonomic? Ignores: business strategy, high-level architecture decisions.

**devils-advocate.md** — Contrarian perspective, "why is this wrong?" Cares about: hidden assumptions, alternative approaches not considered, second-order effects, what happens when this fails. Must always find at least one substantive concern (no rubber-stamping). Ignores: nothing — this role's scope is everything.

**ux-design-thinker.md** — User flows, friction, mental models. Cares about: user journey, cognitive load, error states from user perspective, accessibility basics, consistency with existing UX patterns. Ignores: implementation details, infrastructure.

**ops-devops.md** — Deployment, monitoring, rollback, infrastructure. Cares about: how to deploy, what to monitor, how to rollback, what breaks at 3am, env vars, secrets management, CI/CD impact. Ignores: business logic, UX.

**Step 3: Verify files exist**

```bash
ls -la ~/.claude/skills/design-board/roles/
```
Expected: 5 `.md` files

**Step 4: Commit**

```bash
git -C ~/.claude add skills/design-board/roles/
git -C ~/.claude commit -m "feat: add core 5 design board role prompts"
```

---

### Task 2: Create role prompt files — Bench 8

**Files:**
- Create: `~/.claude/skills/design-board/roles/hacker.md`
- Create: `~/.claude/skills/design-board/roles/perfectionist.md`
- Create: `~/.claude/skills/design-board/roles/business-product.md`
- Create: `~/.claude/skills/design-board/roles/financial.md`
- Create: `~/.claude/skills/design-board/roles/team-lead.md`
- Create: `~/.claude/skills/design-board/roles/data-analytics.md`
- Create: `~/.claude/skills/design-board/roles/accessibility.md`
- Create: `~/.claude/skills/design-board/roles/compliance-privacy.md`

**Step 1: Write each bench role prompt**

Same template as Task 1. Role-specific content:

**hacker.md** — Pragmatic builder, fastest path to working code. Cares about: what can we skip? What's the MVP? Can we use an existing library instead of building? Can we prototype first? Where's the duct tape approach? Ignores: long-term maintainability (that's Perfectionist's job).

**perfectionist.md** — Clean code advocate. Cares about: naming, patterns, DRY, readability, consistent abstractions, single responsibility, test quality. Ignores: speed-to-market, business context.

**business-product.md** — Problem-solution fit. Cares about: does this solve the actual user problem? Who is the user? What's the success metric? Is the scope right? Competitive landscape? Ignores: implementation details, infrastructure.

**financial.md** — Costs and ROI. Cares about: build cost (time), run cost (infra, API calls, third-party services), maintenance cost, opportunity cost. Ignores: code quality, UX details.

**team-lead.md** — Scope and risk. Cares about: is this scoped realistically? What are the biggest risks? What's the dependency chain? What could block us? Are there simpler alternatives? Ignores: code-level details.

**data-analytics.md** — Metrics and measurement. Cares about: what events to track, what success looks like in numbers, A/B testing needs, data schema implications. Ignores: infrastructure, code style.

**accessibility.md** — Inclusive design. Cares about: screen reader support, keyboard navigation, color contrast, ARIA attributes, semantic HTML, WCAG compliance level. Ignores: backend architecture, business logic.

**compliance-privacy.md** — Legal and data protection. Cares about: PII handling, GDPR/CCPA, data retention, consent flows, third-party data sharing, terms of service implications. Ignores: code quality, UX aesthetics.

**Step 2: Verify all 13 role files exist**

```bash
ls ~/.claude/skills/design-board/roles/ | wc -l
```
Expected: 13

**Step 3: Commit**

```bash
git -C ~/.claude add skills/design-board/roles/
git -C ~/.claude commit -m "feat: add bench 8 design board role prompts"
```

---

### Task 3: Create design-board orchestrator skill

**Files:**
- Create: `~/.claude/skills/design-board/SKILL.md`

**Step 1: Write the orchestrator SKILL.md**

The orchestrator:
1. Accepts a design (passed as text, or reads from a file/recent context)
2. Gathers project context (stack, key files)
3. Suggests which bench roles to add based on content analysis
4. Asks user to confirm roster
5. Dispatches all selected agents in parallel using Agent tool (general-purpose)
6. Collects results
7. Synthesizes Board Notes (Addressed / Acknowledged / Dismissed)
8. Presents clean output

**Key implementation details:**

- Use Agent tool with `subagent_type: "general-purpose"` for each role
- Each agent prompt = role prompt file content + the design text + project context
- All agents dispatched in a single message (parallel execution)
- Orchestrator reads agent results, categorizes by verdict (✅/⚠️/❌)
- Blockers must be listed prominently
- Board Notes follow the format from design doc

**SKILL.md frontmatter:**
```yaml
---
name: design-board
description: Use when reviewing a design, architecture proposal, or feature spec with multiple specialized perspectives. Also invoked automatically by brainstorming skill after drafting a design.
---
```

**SKILL.md structure:**
- Overview (what it does, when to use)
- Core vs Bench roles table
- Context-based bench suggestion rules
- Dispatch flow (how agents are launched)
- Board Notes synthesis format
- Integration with brainstorming

**Step 2: Verify skill is discoverable**

In a Claude Code session, check that `/design-board` appears in skill list.

**Step 3: Commit**

```bash
git -C ~/.claude add skills/design-board/SKILL.md
git -C ~/.claude commit -m "feat: add design-board orchestrator skill"
```

---

### Task 4: Create review-as router skill

**Files:**
- Create: `~/.claude/skills/review-as/SKILL.md`

**Step 1: Write the router SKILL.md**

This skill:
1. Takes a role name as argument (e.g., `/review-as architect`)
2. Maps the argument to the correct role prompt file
3. Reads the design from context (user provides or points to file)
4. Dispatches a single Agent with that role's prompt
5. Returns the structured review directly (no Board Notes wrapper)

**SKILL.md frontmatter:**
```yaml
---
name: review-as
description: Use when reviewing a design, code, or idea from a single specialized perspective. Takes a role name argument (architect, developer, devils-advocate, ux, devops, hacker, perfectionist, business, financial, team-lead, data, accessibility, compliance).
---
```

**SKILL.md structure:**
- Overview
- Available roles table (name → file mapping)
- Usage: `/review-as <role>` or `/review-as <role> <file-or-context>`
- How it dispatches (single Agent tool call)
- Output format (structured review, same as board but standalone)

**Role name mapping:**
| Argument | File |
|----------|------|
| `architect` | `tech-architect.md` |
| `developer` | `developer.md` |
| `devils-advocate` | `devils-advocate.md` |
| `ux` | `ux-design-thinker.md` |
| `devops` | `ops-devops.md` |
| `hacker` | `hacker.md` |
| `perfectionist` | `perfectionist.md` |
| `business` | `business-product.md` |
| `financial` | `financial.md` |
| `team-lead` | `team-lead.md` |
| `data` | `data-analytics.md` |
| `accessibility` | `accessibility.md` |
| `compliance` | `compliance-privacy.md` |

**Step 2: Verify skill is discoverable**

Check that `/review-as` appears in skill list.

**Step 3: Commit**

```bash
git -C ~/.claude add skills/review-as/
git -C ~/.claude commit -m "feat: add review-as single-role router skill"
```

---

### Task 5: Update global CLAUDE.md with new skills

**Files:**
- Modify: `~/.claude/CLAUDE.md` — Global Skills table

**Step 1: Add design-board and review-as to the Global Skills table**

Add two rows:

| Skill | File | Description |
|-------|------|-------------|
| `/design-board` | `~/.claude/skills/design-board/SKILL.md` | Multiagent design review board. Dispatches 5 core + optional bench roles to stress-test designs. Used automatically by brainstorming or standalone. |
| `/review-as` | `~/.claude/skills/review-as/SKILL.md` | Single-role design review. Takes role name as argument (architect, developer, ux, devops, etc.). |

**Step 2: Add brainstorming integration note**

Add a section or note in CLAUDE.md explaining that after the brainstorming skill drafts a design, the design-board skill should be invoked before presenting to the user.

**Step 3: Commit**

```bash
git -C ~/.claude add CLAUDE.md
git -C ~/.claude commit -m "docs: add design-board and review-as to global skills"
```

---

### Task 6: Test the design-board skill

**Step 1: Create a test design**

Use the design doc we just wrote (`docs/plans/2026-03-11-design-board-design.md`) as the test input.

**Step 2: Run `/design-board` on it**

Invoke the skill, let it dispatch agents, verify:
- Core 5 agents all run
- Bench suggestions are contextually appropriate
- Each agent returns structured output (Verdict + Concerns + Suggestions + What looks good)
- Board Notes synthesis is coherent
- Blockers are prominently flagged

**Step 3: Run `/review-as architect` on the same design**

Verify single-role mode works:
- Dispatches only one agent
- Returns structured review
- No Board Notes wrapper

**Step 4: Fix any issues found during testing**

**Step 5: Commit fixes**

```bash
git -C ~/.claude add skills/
git -C ~/.claude commit -m "fix: address issues found during design-board testing"
```

---

## Execution Notes

- **Tasks 1-2 are independent** — can be done in parallel
- **Task 3 depends on Tasks 1-2** — needs role files to reference
- **Task 4 depends on Tasks 1-2** — same reason
- **Task 5 depends on Tasks 3-4** — needs skill names finalized
- **Task 6 depends on all above** — integration test

**Important:** The `~/.claude/` directory may or may not be a git repo. If it's not, skip git commit steps and just verify files are in place. The skills work by file presence, not git.

**Skill creation:** Use the `skill-creator` skill for Tasks 3 and 4 if available, as it handles TDD testing of skills. For the role prompt files (Tasks 1-2), direct file creation is fine since they're templates, not skills themselves.
