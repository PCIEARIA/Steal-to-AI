import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const promptFiles = [
  new URL('../extension/popup.js', import.meta.url),
  new URL('../extension/background.js', import.meta.url)
];

test('liquid-glass export prompt asks for direct-copy authorization first', async () => {
  for (const file of promptFiles) {
    const source = await readFile(file, 'utf8');
    assert.match(source, /const companionSkillVersion = '0\.1\.1'/);
    assert.match(source, /This export requires version ' \+ companionSkillVersion \+ ' or newer/);
    assert.match(source, /If it is unavailable, has no version, or is older, ask the user once whether they want to install or update it/);
    assert.match(source, /Before copying any code, ask whether the user owns the rights or has permission to copy and integrate the referenced code./);
    assert.match(source, /If the user confirms, copy only the necessary component code, preserve required attribution and license notices, and comply with its license/);
  }
});

test('component skill limits direct copying to authorized component code', async () => {
  const skill = await readFile(new URL('../skills/steal-to-ai-component/SKILL.md', import.meta.url), 'utf8');
  assert.match(skill, /^version: 0\.1\.1$/m);
  assert.match(skill, /If the Skill is unavailable, unversioned, or older, ask the user once whether they want to install or update it/i);
  assert.match(skill, /ask whether (?:the user|they) own(?:s)? the rights or have permission to copy and integrate (?:the referenced )?it/i);
  assert.match(skill, /copy only the necessary component code/i);
});
