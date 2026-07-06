export function getTodayDateString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function escapeCSVCell(val) {
  if (val === null || val === undefined) return '';
  let str = Array.isArray(val) ? val.join(', ') : String(val);
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportToCsv(titles, filename) {
  const headers = [
    'id',
    'sourceId',
    'title',
    'year',
    'posterUrl',
    'genre',
    'type',
    'imdbRating',
    'runtime',
    'director',
    'cast',
    'plot',
    'status',
    'myRating',
    'notes',
    'dateWatched',
    'rewatchCount',
    'watchedOn',
    'releaseDate',
    'suggestedPlatform'
  ];

  const csvRows = [headers.join(',')];
  for (const t of titles) {
    const row = headers.map(h => escapeCSVCell(t[h]));
    csvRows.push(row.join(','));
  }

  const csvContent = csvRows.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, filename);
}

export function exportToJson(titles, filename) {
  const jsonContent = JSON.stringify(titles, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
  triggerDownload(blob, filename);
}
