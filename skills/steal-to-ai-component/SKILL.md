---
name: steal-to-ai-component
description: Add or adapt one UI component from a Steal to AI export in an existing project. Use when a user provides a Steal to AI capture and wants that component integrated; do not use for full-page cloning.
version: 0.1.1
---

# Steal to AI Component

Use this skill when the user has selected one UI component with Steal to AI and wants to bring it into an existing project.

## Scope

- Work on the selected component only. Do not rebuild the page or redesign unrelated areas.
- Inspect the host project's framework, design system, file structure, and insertion point before editing.
- Treat the capture as visual and structural reference. Preserve useful proportions, typography, color, spacing, states, animation, and explicit interaction hints when they fit the host project.
- Prefer the host project's existing primitives and dependencies. Add a dependency only when it is necessary and the user approves it.

## Version Synchronization

- When an export asks for a companion Skill version check, inspect this Skill's frontmatter version before using it.
- If the installed version meets or exceeds the export's stated minimum, proceed without asking.
- If the Skill is unavailable, unversioned, or older, ask the user once whether they want to install or update it from the supplied repository URL. If they decline or updating is unavailable, continue without blocking and follow the export directly.

## Source Safety

- Do not copy or execute source-site scripts, analytics, tracking, credentials, event handlers, or unrelated layout.
- Do not fetch arbitrary source-site code just because it appears in the capture.
- Replace inaccessible external images, fonts, or other assets with maintainable local equivalents and explain the substitution.
- Preserve the source URL as attribution and reference, not as permission to copy the whole site.
- If the user asks to directly copy referenced code, ask whether they own the rights or have permission to copy and integrate it before doing so.
- After explicit confirmation, copy only the necessary component code, retain required attribution and license notices, and comply with the source license. Do not copy the whole repository or unrelated page code.

## Liquid Glass

When the export contains the liquid-glass instruction, ask the user first whether this component should keep a liquid-glass treatment. If the answer is yes, use the linked liquid-glass project as a reference. Before copying any code, ask whether the user owns the rights or has permission to copy and integrate it. If the user confirms, copy only the necessary component code, preserve required attribution and license notices, and comply with its license; never copy the whole repository or replace the host project's stack. If the user does not confirm, adapt only the necessary techniques. If the answer is no, recreate the component from the captured HTML and CSS.

## Delivery

1. Identify the smallest set of files that should change.
2. Implement the component using the host project's conventions.
3. Verify the component with the project's normal test, build, or preview workflow.
4. Report changed files, the validation performed, and any intentional visual or asset compromises.
