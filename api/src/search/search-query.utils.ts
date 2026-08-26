export function escapeTagValue(value: string): string {
  return value.replace(/([,.<>{}[\]"':;!@#$%^&*()\-+=~|/\\?\s])/g, '\\$1');
}

export function buildContainsQuery(
  search: string,
  fields: readonly string[],
): string {
  const terms = search
    .trim()
    .split(/\s+/)
    .map((term) =>
      term.replace(/([,.<>{}[\]"':;!@#$%^&*()\-+=~|/\\?])/g, '\\$1'),
    )
    .filter(Boolean);

  return terms
    .map(
      (term) => `(${fields.map((field) => `@${field}:(*${term}*)`).join('|')})`,
    )
    .join(' ');
}

export function redisValueToString(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number') {
    return String(value);
  }

  return '';
}

export function dateRangeQuery(
  field: string,
  dateFrom?: string,
  dateTo?: string,
): string | null {
  if (!dateFrom && !dateTo) {
    return null;
  }

  const minimum = dateFrom ? startOfUtcDay(dateFrom) : '-inf';
  const maximum = dateTo ? `(${startOfNextUtcDay(dateTo)}` : '+inf';
  return `@${field}:[${minimum} ${maximum}]`;
}

function startOfUtcDay(value: string): number {
  return Date.parse(`${value.slice(0, 10)}T00:00:00.000Z`);
}

function startOfNextUtcDay(value: string): number {
  return startOfUtcDay(value) + 24 * 60 * 60 * 1_000;
}
