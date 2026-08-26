import { createReadStream } from 'node:fs';

export interface CsvRow {
  rowNumber: number;
  values: string[];
}

export async function* parseCsvRows(filePath: string): AsyncGenerator<CsvRow> {
  const stream = createReadStream(filePath, { encoding: 'utf8' });
  let field = '';
  let fields: string[] = [];
  let inQuotes = false;
  let quotePending = false;
  let skipNextLineFeed = false;
  let rowNumber = 1;
  let isFirstCharacter = true;

  const finishRow = (): CsvRow => {
    fields.push(field);
    const row = { rowNumber, values: fields };
    field = '';
    fields = [];
    rowNumber += 1;
    return row;
  };

  for await (const chunk of stream) {
    for (const character of chunk) {
      if (isFirstCharacter) {
        isFirstCharacter = false;

        if (character === '\uFEFF') {
          continue;
        }
      }

      if (skipNextLineFeed) {
        skipNextLineFeed = false;

        if (character === '\n') {
          continue;
        }
      }

      if (inQuotes) {
        if (quotePending) {
          if (character === '"') {
            field += '"';
            quotePending = false;
            continue;
          }

          inQuotes = false;
          quotePending = false;
        } else if (character === '"') {
          quotePending = true;
          continue;
        } else {
          field += character;
          continue;
        }
      }

      if (character === '"' && field.length === 0) {
        inQuotes = true;
        continue;
      }

      if (character === ',') {
        fields.push(field);
        field = '';
        continue;
      }

      if (character === '\r') {
        yield finishRow();
        skipNextLineFeed = true;
        continue;
      }

      if (character === '\n') {
        yield finishRow();
        continue;
      }

      field += character;
    }
  }

  if (inQuotes && !quotePending) {
    throw new Error(`CSV row ${rowNumber} contains an unclosed quote.`);
  }

  if (field.length > 0 || fields.length > 0) {
    yield finishRow();
  }
}
