# Companion Skill and Export Note Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Add a shareable Steal to AI component skill, install it for the current Codex user, and tell receiving AI exports how to use or optionally install it.

**Architecture:** The extension continues to generate portable HTML/CSS in popup.js. Its formatCode function gains one short, non-blocking companion-skill instruction. The repository ships one self-contained SKILL.md under skills; the local Codex installation is a symlink to that tracked directory so the installed copy stays aligned with future repository updates.

**Tech Stack:** Chrome Manifest V3 popup JavaScript, Node built-in test runner, Markdown Codex skills, Git.

**Spec:** docs/superpowers/specs/2026-10-24-steal-to-ai-component-skill-design.md

## Global Constraints

- Only selected UI components are in scope; never expand to full-page reconstruction.
- Source-site scripts, events, tracking, credentials, and unrelated layout remain excluded.
- The companion skill asks about installation only when it is unavailable, never blocks work, and never asks again after a decline.
- Liquid-glass work remains opt-in and uses the linked project only as technical reference.
- Do not stage or commit unrelated demo, reconstruction, or third_party changes.

---

### Task 1: Add and test the companion-skill hand-off in component exports

**Files:**
- Modify: extension/popup.js
- Modify: extension/background.js
- Modify: tests/popup-selection.test.mjs
- Modify: tests/background.test.mjs

**Interfaces:**
- Produces: formatCode(payload), which prefixes every component export with an HTML comment containing the companion-skill instruction.
- Consumes: payload.sourceUrl, payload.html, payload.css, and payload.interactions.

- [x] **Step 1: Write the failing test**

~~~js
assert.match(previewContent.textContent, /Check whether the steal-to-ai-component skill is available/);
assert.match(previewContent.textContent, /If it is unavailable, ask the user once whether they want to install it/);
assert.match(previewContent.textContent, /If they decline or installation is unavailable, continue without blocking/);
~~~

- [x] **Step 2: Run test to verify it fails**

Run: node --test tests/popup-selection.test.mjs

Expected: FAIL because the exported component code has no companion-skill instruction.

- [x] **Step 3: Write minimal implementation**

~~~js
const companionSkillPrompt = 'Check whether the steal-to-ai-component skill is available in your environment. If it is, use it and continue without asking. If it is unavailable, ask the user once whether they want to install it from https://github.com/PCIEARIA/Steal-to-AI/tree/main/skills/steal-to-ai-component for a better component-integration workflow. If they decline or installation is unavailable, continue without blocking or asking again.';

const references = [
  '<!-- Companion skill instruction: ' + companionSkillPrompt + ' -->',
  '<!-- AI reconstruction instruction: ' + liquidGlassDecisionPrompt + ' -->'
];
~~~

- [x] **Step 4: Run test to verify it passes**

Run: node --test tests/popup-selection.test.mjs

Expected: PASS and the preview begins with the companion-skill instruction.

- [ ] **Step 5: Commit with the next task**

Do not commit yet. Include these files in the focused feature commit in Task 3.

### Task 2: Create and validate the shareable component skill

**Files:**
- Create: skills/steal-to-ai-component/SKILL.md

**Interfaces:**
- Produces: a discoverable skill named steal-to-ai-component.
- Consumes: Steal to AI component exports and an existing project supplied by the receiving user.

- [x] **Step 1: Create the skill frontmatter and activation boundary**

~~~markdown
---
name: steal-to-ai-component
description: Add or adapt one UI component from a Steal to AI export in an existing project. Use when a user provides a Steal to AI capture and wants that component integrated; do not use for full-page cloning.
---
~~~

- [x] **Step 2: Add the component-integration workflow**

~~~markdown
1. Inspect the host project before choosing files or framework patterns.
2. Treat the capture as visual and structural reference only; never reuse source-site scripts, events, tracking, credentials, or unrelated layout.
3. Change only the selected component and the smallest necessary integration surface.
4. Preserve useful captured states and explicit interaction hints when they fit the host project.
5. Replace inaccessible external assets with maintainable local equivalents.
6. Report changed files and validation results.
~~~

- [x] **Step 3: Add conditional liquid-glass guidance**

~~~markdown
When the capture includes a liquid-glass instruction, ask whether that treatment is wanted before implementing it. If confirmed, use the linked liquid-glass project as a technical reference only; adapt the smallest needed technique to the host project and do not copy the repository.
~~~

- [x] **Step 4: Validate the skill**

Run: python3 /Users/pcie/.codex/skills/.system/skill-creator/scripts/quick_validate.py skills/steal-to-ai-component

Expected: validation exits successfully with no frontmatter or placeholder errors.

### Task 3: Document, version, install, verify, and publish

**Files:**
- Modify: README.md
- Modify: extension/manifest.json
- Create: ~/.codex/skills/steal-to-ai-component (symlink to the repository skill directory)

**Interfaces:**
- The README points users to skills/steal-to-ai-component and shows the target local install path.
- manifest.json exposes the new extension version so the popup update check can discover it.

- [x] **Step 1: Document installation**

~~~markdown
## Companion Codex skill

For component-level integrations, install skills/steal-to-ai-component into your Codex skills directory. The captured export can also tell a receiving AI how to offer this optional installation when the skill is missing.
~~~

- [x] **Step 2: Bump the manifest patch version**

~~~json
"version": "0.1.12"
~~~

- [x] **Step 3: Install the local symlink**

Run: ln -s /Users/pcie/Desktop/Steal to ai/skills/steal-to-ai-component /Users/pcie/.codex/skills/steal-to-ai-component

Expected: the local Codex skills directory contains a symlink to the repository-owned skill.

- [x] **Step 4: Verify the repository and local installation**

Run: npm test && node --check extension/popup.js && node -e "JSON.parse(require('node:fs').readFileSync('extension/manifest.json', 'utf8'))" && test -L /Users/pcie/.codex/skills/steal-to-ai-component && git diff --check

Expected: tests pass, popup syntax is valid, manifest parses, the skill symlink exists, and the diff has no whitespace errors.

- [x] **Step 5: Commit and publish only feature files**

~~~bash
git add README.md extension/manifest.json extension/popup.js tests/popup-selection.test.mjs skills/steal-to-ai-component/SKILL.md docs/superpowers/plans/2026-10-24-component-skill-and-export-note.md
git commit -m "Add Steal to AI companion skill"
git push origin main
~~~
