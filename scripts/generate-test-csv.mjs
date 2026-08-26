import { once } from "node:events";
import { createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const rowCounts = [100, 10_000, 100_000];
const outputDirectory = resolve("samples", "csv");

function csvCell(value) {
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

async function writeLine(stream, values) {
  const line = `${values.map(csvCell).join(",")}\n`;
  if (!stream.write(line)) await once(stream, "drain");
}

async function generateCsv(rowCount) {
  const outputPath = resolve(outputDirectory, `tasks-${rowCount}.csv`);
  await mkdir(dirname(outputPath), { recursive: true });
  const stream = createWriteStream(outputPath, { encoding: "utf8" });

  await writeLine(stream, [
    "title",
    "description",
    "status",
    "priority",
    "due_date",
    "assigned_email",
  ]);

  for (let row = 1; row <= rowCount; row += 1) {
    const intentionallyInvalid = row % 100 === 0;
    await writeLine(stream, [
      `Performance task ${row}`,
      `Generated test row ${row}`,
      intentionallyInvalid ? "invalid_status" : row % 3 === 0 ? "in_progress" : "todo",
      row % 10 === 0 ? "high" : "medium",
      "2026-12-31",
      "",
    ]);
  }

  stream.end();
  await once(stream, "finish");
  console.log(`Generated ${rowCount} rows: ${outputPath}`);
}

for (const rowCount of rowCounts) {
  await generateCsv(rowCount);
}
