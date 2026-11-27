import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { createDatabase } from './db.js';

function createTempDbPath() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fervec-db-test-'));
  return { dir, file: path.join(dir, 'fervec-db.json') };
}

test('createDatabase registers users, authenticates, persists data across instances, and logs out', () => {
  const { dir, file } = createTempDbPath();
  try {
    const db = createDatabase(file);

    const badReg = db.registerUser({ name: 'A', email: 'invalid', password: '123' });
    assert.equal(badReg.ok, false);

    const reg = db.registerUser({
      name: 'Maria Clara',
      email: 'Maria@FerveC.com',
      password: 'pasta123',
      initialData: { lastPage: 4, bookmarks: [{ id: 'bm1', page: 4 }] },
    });
    assert.equal(reg.ok, true);
    assert.equal(reg.user.email, 'maria@fervec.com');
    assert.ok(reg.token.length >= 32);

    const dup = db.registerUser({
      name: 'Maria',
      email: 'maria@fervec.com',
      password: 'pasta123',
    });
    assert.equal(dup.ok, false);
    assert.equal(dup.status, 409);

    const update = db.updateUserData(reg.token, {
      lastPage: 12,
      notes: [{ id: 'n1', title: 'Sova', body: 'Ponto liso' }],
    });
    assert.equal(update.ok, true);
    assert.equal(update.data.lastPage, 12);

    // Reload from disk with a brand-new DB instance
    const dbReloaded = createDatabase(file);
    const sessionCheck = dbReloaded.getSession(reg.token);
    assert.equal(sessionCheck.ok, true);
    assert.equal(sessionCheck.data.lastPage, 12);
    assert.equal(sessionCheck.data.notes.length, 1);

    const badLogin = dbReloaded.loginUser({ email: 'maria@fervec.com', password: 'wrong' });
    assert.equal(badLogin.ok, false);

    const goodLogin = dbReloaded.loginUser({ email: 'maria@fervec.com', password: 'pasta123' });
    assert.equal(goodLogin.ok, true);
    assert.equal(goodLogin.data.bookmarks.length, 1);

    dbReloaded.logoutSession(goodLogin.token);
    assert.equal(dbReloaded.getSession(goodLogin.token).ok, false);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
