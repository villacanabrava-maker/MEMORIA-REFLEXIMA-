import test from 'node:test';
import assert from 'node:assert/strict';
import { validateSource, characterCount, isSourceId, isVersion, parsePage, searchTerm, titlePattern, libraryUrl, MAX_CONTENT, MAX_TITLE } from '../../src/lib/sources/validation.ts';
import { safeReturnPath } from '../../src/lib/auth/return-path.ts';

test('trims title but preserves submitted source whitespace and line breaks', () => {
  const content = '  Original\r\ntext\n\t';
  assert.deepEqual(validateSource('  Title  ', content), { ok: true, value: { title: 'Title', content } });
});
for (const value of [null, undefined, '', ' \n\t', 42, {}, new Blob(['text'])]) {
  test(`rejects invalid title ${typeof value}/${String(value)}`, () => assert.equal(validateSource(value, 'text').ok, false));
  test(`rejects invalid content ${typeof value}/${String(value)}`, () => assert.equal(validateSource('Title', value).ok, false));
}
test('rejects null bytes, which PostgreSQL text cannot store', () => {
  assert.equal(validateSource('x\0', 'ok').ok, false);
  assert.equal(validateSource('ok', 'x\0').ok, false);
});
test('accepts boundary lengths and rejects a single excess character', () => {
  assert.equal(validateSource('x'.repeat(MAX_TITLE), 'x'.repeat(MAX_CONTENT)).ok, true);
  assert.equal(validateSource('x'.repeat(MAX_TITLE + 1), 'ok').ok, false);
  assert.equal(validateSource('ok', 'x'.repeat(MAX_CONTENT + 1)).ok, false);
});
test('counts Unicode code points instead of UTF-16 code units', () => {
  const emoji = '\u{1f4da}';
  assert.equal(characterCount(emoji), 1);
  assert.equal(validateSource(emoji.repeat(MAX_TITLE), emoji.repeat(MAX_CONTENT)).ok, true);
  assert.equal(validateSource(emoji.repeat(MAX_TITLE + 1), 'text').ok, false);
});
test('keeps HTML-looking source text unchanged as data', () => {
  const content = '<script>alert(1)</script><img src=x onerror=alert(1)>';
  assert.equal(validateSource('HTML example', content).value.content, content);
});
test('accepts UUIDs and rejects SQL/PostgREST fragments', () => {
  assert.equal(isSourceId('10000000-0000-4000-8000-000000000001'), true);
  for (const id of [null, '', '123', 'id.eq.1', "' OR true", '10000000-0000-4000-8000-000000000001/']) assert.equal(isSourceId(id), false);
});
test('accepts PostgreSQL timestamp versions without reducing microseconds', () => {
  assert.equal(isVersion('2026-09-15T21:10:01.123456+00:00'), true);
  assert.equal(isVersion('2026-09-15T21:10:01Z'), true);
  for (const version of [null, '', 'today', '2026-09-15', '2026-99-99T21:10:01Z', 'x'.repeat(41)]) assert.equal(isVersion(version), false);
});
test('bounds pagination and rejects ambiguous input', () => {
  assert.equal(parsePage('2'), 2);
  assert.equal(parsePage('100000'), 100000);
  for (const page of [null, undefined, ['2'], '0', '-2', '2.5', '1e4', '100001', '999999999999999999']) assert.equal(parsePage(page), 1);
});
test('normalizes search and limits Unicode length', () => {
  assert.equal(searchTerm('  idea\0  '), 'idea');
  assert.equal(characterCount(searchTerm('\u{1f4da}'.repeat(120))), 100);
  assert.equal(searchTerm(['x']), '');
});
test('escapes LIKE metacharacters literally', () => {
  assert.equal(titlePattern('50%_\\done'), '%50\\%\\_\\\\done%');
  assert.equal(titlePattern('regular title'), '%regular title%');
});
test('builds encoded library query URLs', () => {
  assert.equal(libraryUrl(), '/biblioteca');
  const url = new URL(libraryUrl('x&pagina=999', 2), 'https://app.invalid');
  assert.equal(url.searchParams.get('q'), 'x&pagina=999');
  assert.equal(url.searchParams.get('pagina'), '2');
});
for (const path of ['/', '/biblioteca', '/biblioteca/novo', '/biblioteca?q=hello&pagina=2', '/biblioteca/10000000-0000-4000-8000-000000000001/editar']) {
  test(`accepts local return path ${path}`, () => assert.equal(safeReturnPath(path), path));
}
for (const path of ['https://evil.invalid', '//evil.invalid', '/\\evil.invalid', '/login', '/admin', '/%2f%2fevil.invalid', '/biblioteca\nLocation:evil', 'javascript:alert(1)', null, ['//evil.invalid'], '/' + 'x'.repeat(2100)]) {
  test(`rejects unsafe or unrecognized return path ${String(path).slice(0, 50)}`, () => assert.equal(safeReturnPath(path), '/'));
}
test('drops fragments from otherwise safe URLs', () => assert.equal(safeReturnPath('/biblioteca#private'), '/biblioteca'));
