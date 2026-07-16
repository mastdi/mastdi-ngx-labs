import { Injectable } from '@angular/core';
import * as Papa from 'papaparse';
import { v5 as uuidv5 } from 'uuid';

export interface TanitaRecord {
  UUID: string;
  [key: string]: unknown;
}

@Injectable({
  providedIn: 'root',
})
export class TanitaFileParser {
  // A fixed namespace ensures identical rows yield identical UUID v5 values
  private readonly UUID_NAMESPACE = '019ec01c-68a4-7a5c-919e-5f5c160587c2';

  /**
   * Parses the file, structures rows into JSON objects, and appends a deterministic UUID v5.
   * Returns an Observable containing the parsed records.
   */
  async parseTanitaCsv(file: File): Promise<TanitaRecord[]> {
    return new Promise<TanitaRecord[]>((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        delimiter: ',', // Explicitly targeting the comma delimiter in the data
        complete: (results) => {
          try {
            // results.meta.fields is set when header: true is configured
            const fields = [...(results.meta.fields ?? [])];
            fields.sort();
            if (fields.length === 0) {
              reject(new Error('No fields found in the CSV file.'));
              return;
            }
            /* eslint-disable @typescript-eslint/no-explicit-any */
            const enrichedData: TanitaRecord[] = results.data.map((row: any) => {
              // Create a reliable, repeatable string signature from the row's values
              const rawRowString = fields.map((field) => row[field as keyof typeof row]).join(';');

              // Generate the deterministic UUID v5 based on the unique row string
              const deterministicId = uuidv5(rawRowString, this.UUID_NAMESPACE);

              return {
                ...row,
                UUID: deterministicId,
              } as TanitaRecord;
            });
            /* eslint-enable @typescript-eslint/no-explicit-any */
            resolve(enrichedData);
          } catch (enrichmentError) {
            reject(enrichmentError);
          }
        },
        error: (error) => {
          reject(error);
        },
      });
    });
  }
}
