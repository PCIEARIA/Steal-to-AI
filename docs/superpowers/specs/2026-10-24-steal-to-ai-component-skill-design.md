# Steal to AI Component Skill Design

## Goal

Ship a companion Codex skill named steal-to-ai-component for users who paste a Steal to AI export and want that one UI component implemented in an existing project. The skill turns the export into a scoped component-integration task; it is not a website generator or source-site copier.

## Trigger and Input

The skill applies when a user provides a Steal to AI component export, a source reference, interaction hints, or the extension's component prompt and asks to add, recreate, or adapt that component in an existing codebase.

It should not activate for full-page recreation, general website design, or requests to copy source-site application behaviour.

## Export Prompt Hand-off

Every copied Steal to AI component export includes a short companion-skill note. The receiving AI must first determine whether the steal-to-ai-component skill is available in its current environment.

- If the skill is available, use it and continue without asking the user about installation.
- If the skill is unavailable, ask once whether the user wants to install it from this repository for a better component-integration workflow.
- If the user declines, cannot install it, or the environment does not support skills, continue with the captured component normally. Never block the task or ask again.

## Workflow

1. Inspect the existing project's stack, component conventions, and intended insertion point.
2. Treat the captured export as visual and structural reference only. Do not reuse source-site scripts, analytics, event handlers, credentials, or unrelated page structure.
3. Build or adapt only the selected component, preserving material visual characteristics, captured states, motion, and any explicit drag hint where they fit the host project.
4. Prefer local, maintainable replacements for inaccessible external images, fonts, or assets.
5. When the export includes a liquid-glass instruction, ask the user whether that treatment is wanted before implementing it. If yes, use the linked liquid-glass project as a technical reference only; do not copy its repository or replace the host project's stack.
6. Test the changed component in the project's normal workflow and report the files changed plus any intentional visual compromises.

## Boundaries

- Do not rebuild the whole page or modify unrelated components.
- Do not promise pixel-perfect fidelity when external assets or runtime-only effects are unavailable.
- Do not pull or execute code from source websites merely because it appeared in an export.
- Preserve user approval boundaries for dependency installation, external network work, publishing, or other consequential actions.

## Packaging

Create one self-contained skill at skills/steal-to-ai-component/SKILL.md in this repository. It needs no scripts, templates, or ancillary references. Add a short README installation note that tells a Codex user to copy or symlink the skill directory into their local Codex skills directory.

## Acceptance Checks

- SKILL.md has valid frontmatter, a narrow activation description, and no unfinished placeholders.
- The instructions clearly distinguish component integration from full-page reconstruction.
- The copied export tells AI how to detect the companion skill and asks about installation only when unavailable.
- The liquid-glass rule requires a user question before any specialised implementation.
- The repository README explains where the skill lives and how to install it.
