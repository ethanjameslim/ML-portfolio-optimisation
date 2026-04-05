import Papa from 'papaparse';

export type CsvRecord = Record<string, string>;

export async function fetchCsvRecords(path: string) {
  const response = await fetch(path, { cache: 'no-store' });

  if (!response.ok) {
    throw new Error(`Unable to load ${path}`);
  }

  const raw = await response.text();
  const parsed = Papa.parse<CsvRecord>(raw, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });

  if (parsed.errors.length > 0) {
    throw new Error(parsed.errors[0].message);
  }

  return parsed.data;
}

export function toNumber(value: string | undefined) {
  if (value === undefined || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
