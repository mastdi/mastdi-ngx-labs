import { describe, it, expect } from 'vitest';
import { parseTanitaDate } from './tanita-date';

describe('parseTanitaDate', () => {
  // ==========================================
  // 1. SUCCESS SCENARIOS (The happy path)
  // ==========================================
  describe('Success scenarios', () => {
    it('should create a correct Date object given valid inputs', () => {
      const result = parseTanitaDate('12/06/2026', '06:52:14');

      expect(result).toBeInstanceOf(Date);
      expect(result?.getFullYear()).toBe(2026);
      expect(result?.getMonth()).toBe(5); // June is month 5 (0-indexed)
      expect(result?.getDate()).toBe(12);
      expect(result?.getHours()).toBe(6);
      expect(result?.getMinutes()).toBe(52);
      expect(result?.getSeconds()).toBe(14);
    });

    it('should handle leap years correctly (e.g., February 29th, 2024)', () => {
      const result = parseTanitaDate('29/02/2024', '12:00:00');
      expect(result).not.toBeNull();
      expect(result?.getDate()).toBe(29);
      expect(result?.getMonth()).toBe(1); // February
    });
  });

  // ==========================================
  // 2. MISSING / EMPTY VALUES
  // ==========================================
  describe('Missing or empty values', () => {
    it('should return null if mdate or mtime is null or undefined', () => {
      expect(parseTanitaDate(null, '06:52:14')).toBeNull();
      expect(parseTanitaDate('12/06/2026', undefined)).toBeNull();
      expect(parseTanitaDate(undefined, null)).toBeNull();
    });

    it('should return null if inputs are empty strings', () => {
      expect(parseTanitaDate('', '06:52:14')).toBeNull();
      expect(parseTanitaDate('12/06/2026', '   ')).toBeNull();
    });
  });

  // ==========================================
  // 3. INVALID FORMATS (Regex validation)
  // ==========================================
  describe('Invalid formats', () => {
    it('should return null if the date uses dashes instead of slashes', () => {
      expect(parseTanitaDate('12-06-2026', '06:52:14')).toBeNull();
    });

    it('should return null if the year is only 2 digits', () => {
      expect(parseTanitaDate('12/06/26', '06:52:14')).toBeNull();
    });

    it('should return null if the time is missing seconds', () => {
      expect(parseTanitaDate('12/06/2026', '06:52')).toBeNull();
    });

    it('should return null if the input is arbitrary text', () => {
      expect(parseTanitaDate('not-a-date', '06:52:14')).toBeNull();
    });
  });

  // ==========================================
  // 4. LOGICALLY INVALID DATES
  // ==========================================
  describe('Logically invalid values', () => {
    it('should return null for impossible calendar dates or months', () => {
      // 13th month does not exist
      expect(parseTanitaDate('12/13/2026', '12:00:00')).toBeNull();
      // 32nd day does not exist
      expect(parseTanitaDate('32/06/2026', '12:00:00')).toBeNull();
    });

    it('should return null for impossible times', () => {
      // Hour 25 or minute 61 does not exist
      expect(parseTanitaDate('12/06/2026', '25:00:00')).toBeNull();
      expect(parseTanitaDate('12/06/2026', '12:61:00')).toBeNull();
    });
  });
});
