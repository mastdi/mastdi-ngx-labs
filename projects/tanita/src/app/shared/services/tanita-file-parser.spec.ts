import { TestBed } from '@angular/core/testing';

import { TanitaFileParser } from './tanita-file-parser';

describe('TanitaFileParser', () => {
  let service: TanitaFileParser;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TanitaFileParser);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should correctly parse a valid semicolon-delimited CSV and append UUIDs', async () => {
    // 1. Create mock CSV data simulating your file structure
    const csvContent =
      'MACHINE;ID;STATUS;MDATE;MTIME;WEIGHT kg\n' +
      'DC-360;1;0;08-05-2026;13:50:16;75.2\n' +
      'DC-360;2;0;08-05-2026;13:56:12;80.4';

    const mockFile = new File([csvContent], 'TANITA_TEST.CSV', { type: 'text/csv' });

    // 2. Convert the Observable into a Promise using firstValueFrom
    const records = await service.parseTanitaCsv(mockFile);

    // Assertions
    expect(records.length).toBe(2);
    expect(records[0]['MACHINE']).toBe('DC-360');
    expect(records[0]['ID']).toBe('1');
    expect(records[0]['WEIGHT kg']).toBe('75.2');

    expect(records[1]['MACHINE']).toBe('DC-360');
    expect(records[1]['ID']).toBe('2');
    expect(records[1]['WEIGHT kg']).toBe('80.4');

    expect(records[0].UUID).toBeDefined();
    expect(typeof records[0].UUID).toBe('string');
    expect(records[0].UUID.length).toBe(36);
  });

  it('should generate the exact same UUID for identical CSV rows (deterministic behavior)', async () => {
    const csvContent1 = 'MACHINE;ID;STATUS;MDATE\nDC-360;1;0;08-05-2026';
    const csvContent2 = 'MACHINE;ID;MDATE;STATUS\nDC-360;1;08-05-2026;0';

    const file1 = new File([csvContent1], 'file1.csv', { type: 'text/csv' });
    const file2 = new File([csvContent2], 'file2.csv', { type: 'text/csv' });

    // Await both operations linearly
    const records1 = await service.parseTanitaCsv(file1);
    const records2 = await service.parseTanitaCsv(file2);

    expect(records1[0].UUID).toEqual(records2[0].UUID);
  });

  it('should generate different UUIDs for rows that have different values', async () => {
    const csvContent =
      'MACHINE;ID;STATUS;MDATE;WEIGHT kg\n' +
      'DC-360;1;0;08-05-2026;75.2\n' +
      'DC-360;1;0;08-05-2026;75.3';

    const mockFile = new File([csvContent], 'diff_test.csv', { type: 'text/csv' });

    const records = await service.parseTanitaCsv(mockFile);

    expect(records[0].UUID).not.toEqual(records[1].UUID);
  });

  it('should safely skip empty trailing lines without breaking or generating blank records', async () => {
    const csvWithEmptyLines = 'MACHINE;ID;STATUS\n' + 'DC-360;1;0\n' + '\n' + '\n';

    const mockFile = new File([csvWithEmptyLines], 'empty_lines.csv', { type: 'text/csv' });

    const records = await service.parseTanitaCsv(mockFile);

    expect(records.length).toBe(1);
    expect(records[0]['MACHINE']).toBe('DC-360');
  });
});
