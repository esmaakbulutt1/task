import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseCsvRows, type CsvRow } from './csv-row-parser';

describe('parseCsvRows', () => {
  let directory: string;

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'taskflow-csv-'));
  });

  afterEach(async () => {
    await rm(directory, { recursive: true, force: true });
  });

  it('streams quoted commas, line breaks and escaped quotes', async () => {
    const filePath = join(directory, 'tasks.csv');
    await writeFile(
      filePath,
      [
        'title,description,status,priority,due_date,assigned_email',
        'Login,"Form, validation",todo,high,2026-09-10,user@example.com',
        'API,"First line\nSecond ""quoted"" line",backlog,medium,,',
      ].join('\n'),
      'utf8',
    );
    const rows: CsvRow[] = [];

    for await (const row of parseCsvRows(filePath)) {
      rows.push(row);
    }

    expect(rows).toHaveLength(3);
    expect(rows[1].values[1]).toBe('Form, validation');
    expect(rows[2].values[1]).toBe('First line\nSecond "quoted" line');
  });
});
