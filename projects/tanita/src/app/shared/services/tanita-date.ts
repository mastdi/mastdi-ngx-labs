/**
 * Parses and combines Tanita's raw local date and time strings into a standard JavaScript Date object.
 *
 * Since the input lacks timezone information (naive local time), the resulting Date object
 * will be instantiated in the client's current local timezone.
 *
 * @param mdate - The date string in the strict format "DD/MM/YYYY" (e.g., "12/06/2026").
 * @param mtime - The time string in the strict format "HH:MM:SS" (e.g., "06:52:14").
 * @returns A valid JavaScript Date object, or null if the inputs are missing,
 *          malformed, or represent an impossible calendar date.
 */
export function parseTanitaDate(
  mdate: string | null | undefined,
  mtime: string | null | undefined,
): Date | null {
  if (!mdate?.trim() || !mtime?.trim()) {
    return null;
  }

  // Define regex for date (12/06/2026) and time (06:52:14)
  const datePattern = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  const timePattern = /^(\d{2}):(\d{2}):(\d{2})$/;

  const dateMatch = mdate.match(datePattern);
  const timeMatch = mtime.match(timePattern);

  // If either is invalid, then return null
  if (!dateMatch || !timeMatch) {
    return null;
  }

  // Extract and convert each group
  const day = +dateMatch[1];
  const month = +dateMatch[2];
  const year = +dateMatch[3];

  const hours = +timeMatch[1];
  const minutes = +timeMatch[2];
  const seconds = +timeMatch[3];

  // Create the object (month is 0 indexed)
  const dateObject = new Date(year, month - 1, day, hours, minutes, seconds);

  // Check for invalid dates such as February 30
  if (isNaN(dateObject.getTime())) {
    return null;
  }

  // Check if any fields has rolled over because they were invalid
  if (
    dateObject.getFullYear() !== year ||
    dateObject.getMonth() !== month - 1 ||
    dateObject.getDate() !== day ||
    dateObject.getHours() !== hours ||
    dateObject.getMinutes() !== minutes ||
    dateObject.getSeconds() !== seconds
  ) {
    return null;
  }

  return dateObject;
}
