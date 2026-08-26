import {
  buildContainsQuery,
  dateRangeQuery,
  escapeTagValue,
} from './search-query.utils';

describe('Redis Search query helpers', () => {
  it('escapes TAG punctuation and whitespace', () => {
    expect(escapeTagValue('abc-def value')).toBe('abc\\-def\\ value');
  });

  it('builds a contains query for every search word', () => {
    expect(buildContainsQuery('api test', ['name', 'description'])).toBe(
      '(@name:(*api*)|@description:(*api*)) (@name:(*test*)|@description:(*test*))',
    );
  });

  it('uses an exclusive upper bound for an inclusive date filter', () => {
    expect(dateRangeQuery('createdAt', '2026-08-01', '2026-08-25')).toBe(
      '@createdAt:[1785542400000 (1787702400000]',
    );
  });
});
