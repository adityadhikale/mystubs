/**
 * Formats a date string (supporting DD-MM-YYYY, YYYY-MM-DD, and DD MMM YYYY)
 * into a user-friendly display format: "D Month YYYY" (e.g. "9 October 2025").
 * Handles empty, null, or undefined inputs gracefully.
 *
 * @param {string} dateString Date string to format
 * @returns {string} Formatted date for display or '—'
 */
export function formatDisplayDate(dateString) {
  if (!dateString) return '—';
  const trimmed = String(dateString).trim();
  if (!trimmed || trimmed === 'N/A') return '—';

  // 1. Check if format uses hyphens (DD-MM-YYYY or YYYY-MM-DD)
  const partsHyphen = trimmed.split('-');
  if (partsHyphen.length === 3) {
    const [first, second, third] = partsHyphen;
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];

    if (first.length === 4) {
      // YYYY-MM-DD format
      const year = parseInt(first, 10);
      const month = parseInt(second, 10);
      const day = parseInt(third, 10);
      if (!isNaN(day) && !isNaN(month) && !isNaN(year) && month >= 1 && month <= 12) {
        return `${day} ${months[month - 1]} ${year}`;
      }
    } else {
      // DD-MM-YYYY format
      const day = parseInt(first, 10);
      const month = parseInt(second, 10);
      const year = parseInt(third, 10);
      if (!isNaN(day) && !isNaN(month) && !isNaN(year) && month >= 1 && month <= 12) {
        return `${day} ${months[month - 1]} ${year}`;
      }
    }
  }

  // 2. Check if format uses spaces (e.g., DD MMM YYYY from OMDb)
  const partsSpace = trimmed.split(' ');
  if (partsSpace.length === 3) {
    const [dayStr, monthShort, yearStr] = partsSpace;
    const day = parseInt(dayStr, 10);
    const year = parseInt(yearStr, 10);
    const monthMap = {
      Jan: 'January',
      Feb: 'February',
      Mar: 'March',
      Apr: 'April',
      May: 'May',
      Jun: 'June',
      Jul: 'July',
      Aug: 'August',
      Sep: 'September',
      Oct: 'October',
      Nov: 'November',
      Dec: 'December',
    };
    const monthFull = monthMap[monthShort];
    if (monthFull && !isNaN(day) && !isNaN(year)) {
      return `${day} ${monthFull} ${year}`;
    }
  }

  return trimmed;
}
