# Design Board — Multiagent Brainstorming Review

## Overview

Enhance the brainstorming skill with an automated "design board" — a panel of specialized agents that stress-test proposed designs from multiple perspectives before presenting to the user.

Each agent role is also callable as a standalone skill.

## Flow

```
Current:  Q&A → Draft → Present → Write doc → writing-plans
New:      Q&A → Draft → Board Review → Incorporate → Present → Write doc → writing-plans
```

1. **Human Q&A** — normal brainstorming conversation (unchanged)
2. **Draft design** — agent drafts the proposed design (unchanged)
3. **Board review** — dispatch core agents in parallel, each reviewing the draft through their role's lens
4. **Incorporate feedback** — integrate valid concerns, dismiss noise, build Board Notes
5. **Present to user** — clean design + Board Notes appendix
6. **Write design doc & transition** — unchanged (design doc now includes Board Notes)

## Roles

### Core (always run)

| # | Role | Lens |
|---|------|------|
| 1 | **Tech Architect** | System design, integrations, scalability, patterns |
| 2 | **Developer** | Buildability, DX, practical implementation concerns |
| 3 | **Devil's Advocate** | "Why is this the wrong approach entirely?" |
| 4 | **UX/Design Thinker** | User flows, friction, mental models, experience |
| 5 | **Ops/DevOps** | Deployment, monitoring, rollback, infrastructure |

### Bench (suggested by context)

| # | Role | Lens | When to suggest |
|---|------|------|-----------------|
| 6 | **Hacker** | Fastest path to working code, pragmatic shortcuts | Prototypes, MVPs, time-constrained work |
| 7 | **Perfectionist** | Clean code, naming, patterns, DRY, readability | Shared libraries, public APIs, long-lived code |
| 8 | **Business & Product** | Problem-solution fit, user value, market context | Product features, user-facing changes |
| 9 | **Financial** | Build/run/maintain costs, API pricing, ROI | Infra decisions, third-party services, scaling |
| 10 | **Team Lead** | Scope realism, risk assessment, timeline | Large or ambiguous features |
| 11 | **Data/Analytics** | Metrics, event tracking, success measurement | Features where success needs measurement |
| 12 | **Accessibility** | Inclusive design, a11y standards, screen readers | Any UI work |
| 13 | **Compliance/Privacy** | PII handling, GDPR, terms of service, legal | User data, auth, third-party integrations |

## Agent Input

Each role agent receives:

1. **The draft design** — full text of the proposed design
2. **Project context** — key files, stack, constraints (gathered during Q&A phase)
3. **Role system prompt** — defines their perspective and output format

## Agent Output Format

All roles use the same structured output:

```markdown
## [Role Name] Review

**Verdict:** ✅ Approved | ⚠️ Concerns | ❌ Blocker

### Concerns (if any)
- [Specific concern with reasoning]

### Suggestions (if any)
- [Concrete actionable suggestion]

### What looks good
- [Strengths from this role's perspective]
```

## Board Notes (user-facing synthesis)

Appended to the design doc:

```markdown
## Board Notes

**Board:** Architect ✅, Developer ⚠️, Devil's Advocate ✅, UX ⚠️, DevOps ✅
**Extras:** Hacker ✅, Accessibility ⚠️

### Addressed
- Developer: "API route does too much" → split into two routes
- UX: "3-step flow could be 2" → merged steps 1 and 2

### Acknowledged (deferred)
- Accessibility: "needs ARIA labels" → will handle in implementation

### Dismissed
- None
```

Verdict rules:
- **❌ Blocker** — must be addressed before presenting design
- **⚠️ Concerns** — incorporated or explicitly deferred with reasoning
- **✅ Approved** — no action needed

## Skill Architecture

```
~/.claude/skills/
  design-board/
    SKILL.md              ← board orchestrator
    roles/
      tech-architect.md
      developer.md
      devils-advocate.md
      ux-design-thinker.md
      ops-devops.md
      hacker.md
      perfectionist.md
      business-product.md
      financial.md
      team-lead.md
      data-analytics.md
      accessibility.md
      compliance-privacy.md
```

## Invocation Modes

### 1. Via brainstorming (automatic)

Brainstorming skill dispatches design-board after drafting. Before dispatching:
> "Core board ready. I'd also bring in Hacker and Accessibility for this one. Add or remove anyone?"

Board is default-on but skippable ("skip the board").

### 2. Standalone board review

`/design-board` — user provides or points to a design. Full panel runs. Useful for reviewing designs not created through brainstorming (PRs, existing docs).

### 3. Single role review

`/review-as-<role>` — dispatches one agent with that role's prompt. Returns structured review directly.

| Command | Role |
|---------|------|
| `/design-board` | Full board review |
| `/review-as-architect` | Tech Architect |
| `/review-as-developer` | Developer |
| `/review-as-devils-advocate` | Devil's Advocate |
| `/review-as-ux` | UX/Design Thinker |
| `/review-as-devops` | Ops/DevOps |
| `/review-as-hacker` | Hacker |
| `/review-as-perfectionist` | Perfectionist |
| `/review-as-business` | Business & Product |
| `/review-as-financial` | Financial |
| `/review-as-team-lead` | Team Lead |
| `/review-as-data` | Data/Analytics |
| `/review-as-accessibility` | Accessibility |
| `/review-as-compliance` | Compliance/Privacy |

## Integration with Brainstorming Skill

Updated checklist:

1. Explore project context
2. Ask clarifying questions
3. Propose 2-3 approaches
4. Draft design sections
5. **NEW: Dispatch design board** — suggest extras, get user confirmation, run agents in parallel
6. **NEW: Incorporate feedback** — address blockers, incorporate concerns, build Board Notes
7. Present design with Board Notes — get user approval
8. Write design doc (now includes Board Notes section)
9. Transition to implementation — invoke writing-plans

## Key Decisions

- **Board runs after draft, before presenting** — keeps human Q&A natural, agents stress-test concrete proposals
- **Core 5 always, extras suggested** — balances thoroughness with speed
- **Hybrid output (Board Notes)** — clean design + transparent feedback log
- **Each role is standalone** — maximum flexibility, reusable outside brainstorming
- **Parallel dispatch** — all agents run concurrently for speed
