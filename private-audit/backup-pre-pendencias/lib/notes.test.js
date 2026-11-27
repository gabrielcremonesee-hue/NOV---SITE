import test from 'node:test';
import assert from 'node:assert/strict';
import { filterNotes, paginateNotesIntoSheets } from './notes.js';

test('filterNotes matches title, body, category, and page number', () => {
  const sample = [
    { id: '1', title: 'Ponto da Sova', body: 'Descansou 30 min', category: 'Técnica', page: 9 },
    { id: '2', title: 'Molho Rústico', body: 'Tomate pelado', category: 'Teste', page: 43 },
  ];
  assert.equal(filterNotes(sample, '').length, 2);
  assert.equal(filterNotes(sample, 'sova').length, 1);
  assert.equal(filterNotes(sample, 'página 43')[0].id, '2');
});

test('paginateNotesIntoSheets creates dynamic Folha 1, Folha 2, Folha 3 sheets', () => {
  const notes = Array.from({ length: 9 }, (_, i) => ({ id: String(i + 1), title: `Nota ${i + 1}` }));
  const sheet1 = paginateNotesIntoSheets(notes, 1, 4);
  assert.equal(sheet1.totalSheets, 3);
  assert.equal(sheet1.currentSheet, 1);
  assert.equal(sheet1.sheetLabel, 'Folha 1');
  assert.equal(sheet1.items.length, 4);
  assert.deepEqual(sheet1.sheets.map((s) => s.label), ['Folha 1', 'Folha 2', 'Folha 3']);

  const sheet3 = paginateNotesIntoSheets(notes, 3, 4);
  assert.equal(sheet3.currentSheet, 3);
  assert.equal(sheet3.items.length, 1);

  const clamped = paginateNotesIntoSheets(notes, 99, 4);
  assert.equal(clamped.currentSheet, 3);

  const empty = paginateNotesIntoSheets([], 1, 4);
  assert.equal(empty.totalSheets, 1);
  assert.equal(empty.sheetLabel, 'Folha 1');
  assert.equal(empty.items.length, 0);
});
