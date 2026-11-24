import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { stages } from './courseData';
import { extraRecipes } from './recipesData';
import { getModuleStepIconCount, getStageIcon } from './stepIcons';

test('carbonara and all extraRecipes have matching step icon files on disk', () => {
  assert.equal(getModuleStepIconCount('carbonara'), stages.length);
  for (let i = 0; i < stages.length; i++) {
    const icon = getStageIcon('carbonara', i);
    assert.ok(icon.startsWith('/assets/step-icons/'), `Invalid icon path for carbonara[${i}]`);
    const diskPath = path.resolve(process.cwd(), 'public', icon.replace(/^\//, ''));
    assert.equal(fs.existsSync(diskPath), true, `Missing icon file: ${diskPath}`);
  }

  for (const recipe of extraRecipes) {
    assert.equal(
      getModuleStepIconCount(recipe.id),
      recipe.steps.length,
      `Icon count mismatch for module ${recipe.id}`
    );
    for (let i = 0; i < recipe.steps.length; i++) {
      const icon = getStageIcon(recipe.id, i);
      const diskPath = path.resolve(process.cwd(), 'public', icon.replace(/^\//, ''));
      assert.equal(fs.existsSync(diskPath), true, `Missing icon file: ${diskPath}`);
    }
  }
});

test('getStageIcon safely handles out-of-range indices and unknown modules', () => {
  assert.equal(getStageIcon('carbonara', -1), '/assets/step-icons/agua.png');
  assert.equal(getStageIcon('carbonara', 99), '/assets/step-icons/montagem.png');
  assert.equal(getStageIcon('unknown-module', 0), '/assets/step-icons/montagem.png');
});
