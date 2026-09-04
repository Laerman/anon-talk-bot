import ExcelJS from 'exceljs';
import type { GroupRow } from './ResultsView';

const HEADER_BG = 'FF1F4E79';
const BAND_A = 'FFD9E2F3';
const BAND_B = 'FFF2F7FD';
const BORDER = 'FF2E75B6';

const thin = { style: 'thin' as const, color: { argb: BORDER } };
const allBorders = { top: thin, left: thin, bottom: thin, right: thin };

const groupLink = (r: GroupRow) => {
  if (r.username) return '@' + r.username;
  if (r.isPrivate) return 'приватная группа';
  return '—';
};

export async function exportExcel(rows: GroupRow[], userLabels: { id: number; label: string }[]) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Группы');

  ws.columns = [
    { header: 'User/ID', key: 'user', width: 26 },
    { header: 'Ссылка или юзер канала/группы', key: 'link', width: 38 },
    { header: 'Название канала/группы', key: 'title', width: 44 },
    { header: 'Сообщений', key: 'count', width: 13 },
    { header: 'Последнее сообщение', key: 'last', width: 22 },
  ];

  const head = ws.getRow(1);
  head.height = 34;
  head.eachCell((cell) => {
    cell.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_BG } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = allBorders;
  });

  const byUser = new Map<number, GroupRow[]>();
  userLabels.forEach((u) => byUser.set(u.id, []));
  rows.forEach((r) => {
    if (!byUser.has(r.userId)) byUser.set(r.userId, []);
    byUser.get(r.userId)!.push(r);
  });

  let rowIdx = 2;
  let band = 0;

  userLabels.forEach((u) => {
    const groups = (byUser.get(u.id) || []).sort(
      (a, b) => (b.messagesCount || 0) - (a.messagesCount || 0),
    );
    const bg = band % 2 === 0 ? BAND_A : BAND_B;
    band++;

    const list = groups.length ? groups : [null];
    const start = rowIdx;

    list.forEach((g) => {
      const row = ws.getRow(rowIdx);
      row.height = 22;
      row.getCell(1).value = u.label;
      row.getCell(2).value = g ? groupLink(g) : '';
      row.getCell(3).value = g ? g.title || 'Без названия' : 'групп не найдено';
      row.getCell(4).value = g ? (g.messagesCount ?? '') : '';
      row.getCell(5).value = g?.lastMessage ? String(g.lastMessage).slice(0, 10) : '';

      row.eachCell({ includeEmpty: true }, (cell, col) => {
        if (col > 5) return;
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
        cell.border = allBorders;
        cell.alignment = {
          vertical: 'middle',
          horizontal: col === 1 || col === 4 || col === 5 ? 'center' : 'left',
        };
      });
      rowIdx++;
    });

    const end = rowIdx - 1;
    if (end > start) ws.mergeCells(start, 1, end, 1);
    const merged = ws.getCell(start, 1);
    merged.font = { bold: true, size: 11 };
    merged.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  });

  ws.views = [{ state: 'frozen', ySplit: 1 }];
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: 5 } };

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'groups.xlsx';
  a.click();
  URL.revokeObjectURL(a.href);
}
