export const NOTES_PER_SHEET = 4;

export function filterNotes(notes = [], query = '') {
  const list = Array.isArray(notes) ? notes : [];
  const q = String(query || '').trim().toLowerCase();
  if (!q) return list;
  return list.filter((n) => {
    const hay = `${n?.title || ''} ${n?.body || ''} ${n?.category || ''} ${n?.page ? 'página ' + n.page : ''}`.toLowerCase();
    return hay.includes(q);
  });
}

export function paginateNotesIntoSheets(notes = [], sheetNumber = 1, perSheet = NOTES_PER_SHEET) {
  const list = Array.isArray(notes) ? notes : [];
  const pageSize = Math.max(1, Number.parseInt(perSheet, 10) || NOTES_PER_SHEET);
  const totalSheets = Math.max(1, Math.ceil(list.length / pageSize));
  const currentSheet = Math.min(totalSheets, Math.max(1, Number.parseInt(sheetNumber, 10) || 1));
  const start = (currentSheet - 1) * pageSize;
  const items = list.slice(start, start + pageSize);

  return {
    items,
    currentSheet,
    totalSheets,
    totalNotes: list.length,
    sheetLabel: `Folha ${currentSheet}`,
    sheets: Array.from({ length: totalSheets }, (_, i) => ({
      number: i + 1,
      label: `Folha ${i + 1}`,
      active: i + 1 === currentSheet,
    })),
  };
}
