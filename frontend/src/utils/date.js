export function formatLocalYYYYMMDD(date) {
  if (!date) return "";
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatNiceDate(date) {
  const d = new Date(date);
  return d.toLocaleDateString("en-GB", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Format ISO datetime string to local time HH:MM
 * Handles ISO 8601 format from Django backend
 * @param {string} isoDateString - ISO format datetime string from API (e.g., "2025-11-30T19:30:00Z")
 * @returns {string} Formatted time in HH:MM format in user's local timezone
 */
export function formatTimeFromISO(isoDateString) {
  if (!isoDateString) return "";
  
  const date = new Date(isoDateString);
  if (isNaN(date.getTime())) return "";
  
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Format ISO datetime string to full local datetime string
 * @param {string} isoDateString - ISO format datetime string from API
 * @returns {string} Formatted as "Day, Month Date at HH:MM"
 */
export function formatDateTimeFromISO(isoDateString) {
  if (!isoDateString) return "";
  
  const date = new Date(isoDateString);
  if (isNaN(date.getTime())) return "";
  
  return date.toLocaleString("en-GB", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
