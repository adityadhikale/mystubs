export function formatReleaseDate(rawDate) {
  if (!rawDate || rawDate === 'N/A') return null;

  // Check if format is YYYY-MM-DD (TMDB)
  if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
    const [year, monthStr, dayStr] = rawDate.split('-');
    const day = parseInt(dayStr, 10);
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
    const monthIndex = parseInt(monthStr, 10) - 1;
    if (monthIndex >= 0 && monthIndex < 12) {
      return `${day} ${months[monthIndex]} ${year}`;
    }
    return rawDate;
  }

  // Check if format is DD MMM YYYY (OMDb e.g. "18 Dec 2009")
  const parts = rawDate.split(' ');
  if (parts.length === 3) {
    const [dayStr, monthShort, year] = parts;
    const day = parseInt(dayStr, 10);
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
    if (monthFull && !isNaN(day)) {
      return `${day} ${monthFull} ${year}`;
    }
  }

  // Fallback: if it's just a year or other string, return it
  return rawDate;
}

export function isUpcoming(rawDate) {
  if (!rawDate || rawDate === 'N/A') return false;

  let parsedDate = null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
    parsedDate = new Date(rawDate);
  } else {
    const parts = rawDate.split(' ');
    if (parts.length === 3) {
      const [dayStr, monthShort, yearStr] = parts;
      const day = parseInt(dayStr, 10);
      const year = parseInt(yearStr, 10);
      const monthMap = {
        Jan: 0,
        Feb: 1,
        Mar: 2,
        Apr: 3,
        May: 4,
        Jun: 5,
        Jul: 6,
        Aug: 7,
        Sep: 8,
        Oct: 9,
        Nov: 10,
        Dec: 11,
      };
      const month = monthMap[monthShort];
      if (month !== undefined && !isNaN(day) && !isNaN(year)) {
        parsedDate = new Date(year, month, day);
      }
    }
  }

  if (parsedDate && !isNaN(parsedDate.getTime())) {
    const today = new Date();
    // Reset hours to compare only calendar dates
    today.setHours(0, 0, 0, 0);
    parsedDate.setHours(0, 0, 0, 0);
    return parsedDate > today;
  }

  return false;
}
