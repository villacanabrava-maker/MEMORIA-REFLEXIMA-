import assert from 'node:assert/strict';
import test from 'node:test';
import { MAX_CONTENT, MAX_IMPORT_BYTES, decodeTextFile, validateSource, validateTextFile } from '../../src/lib/sources/validation.ts';
import { safeReturnPath } from '../../src/lib/auth/return-path.ts';
const encode = (value) => new TextEncoder().encode(value);

test('imports UTF-8 text without trimming source whitespace', () => {
  const result = decodeTextFile(' minha leitura.TXT', encode('  Ideia\n\tOutra ideia  '));
  assert.equal(result.ok, true);
  assert.deepEqual(result.value, { title: 'minha leitura', content: '  Ideia\n\tOutra ideia  ' });
  assert.equal(result.normalizedLineEndings, false);
  assert.equal(result.removedBom, false);
  assert.equal(validateSource(result.value.title, result.value.content).ok, true);
});
test('keeps Markdown and HTML-looking strings as plain text data', () => {
  const text = '# Ideia\n<script>alert(1)</script>\n[link](javascript:alert(1))';
  const result = decodeTextFile('leitura.md', encode(text));
  assert.equal(result.ok, true);
  assert.equal(result.value.content, text);
});
test('normalizes CRLF and CR and records the transformation', () => {
  const result = decodeTextFile('linhas.txt', encode('a\r\nb\rc\n'));
  assert.equal(result.ok, true);
  assert.equal(result.value.content, 'a\nb\nc\n');
  assert.equal(result.normalizedLineEndings, true);
});
test('removes UTF-8 BOM and records it', () => {
  const result = decodeTextFile('bom.txt', new Uint8Array([0xef, 0xbb, 0xbf, 65]));
  assert.equal(result.ok, true);
  assert.equal(result.value.content, 'A');
  assert.equal(result.removedBom, true);
});
for (const name of ['arquivo.pdf', 'arquivo.docx', 'arquivo.html', 'arquivo', '.txt', '../arquivo.txt', 'a/b.txt', 'a\\b.md', 'a\0.txt', 'a\n.txt', 'a\u202e.txt', 'x'.repeat(256) + '.txt']) {
  test(`rejects invalid filename ${JSON.stringify(name).slice(0, 40)}`, () => assert.equal(validateTextFile(name, 10).ok, false));
}
for (const size of [0, -1, 1.5, NaN, Infinity, '10', null, MAX_IMPORT_BYTES + 1]) {
  test(`rejects invalid byte size ${String(size)}`, () => assert.equal(validateTextFile('a.txt', size).ok, false));
}
for (const bytes of [new Uint8Array([0xff]), new Uint8Array([0xc3]), new Uint8Array([0xc0, 0xaf]), new Uint8Array([0xff, 0xfe, 65, 0])]) {
  test(`rejects non-UTF-8 bytes ${Array.from(bytes).join(',')}`, () => assert.equal(decodeTextFile('a.txt', bytes).ok, false));
}
for (const text of ['', ' \n\t', '\ufeff', 'a\0b', 'a\x01b', 'a\x7fb', 'a\u0085b']) {
  test(`rejects empty or binary text ${JSON.stringify(text)}`, () => assert.equal(decodeTextFile('a.md', encode(text)).ok, false));
}
test('accepts 100000 Unicode code points at the 400000-byte boundary', () => {
  const content = '\u{1f642}'.repeat(MAX_CONTENT);
  const bytes = encode(content);
  assert.equal(bytes.length, MAX_IMPORT_BYTES);
  const result = decodeTextFile('emoji.md', bytes);
  assert.equal(result.ok, true);
  assert.equal(result.value.content, content);
});
test('rejects overlong text without silently truncating it', () => {
  const result = decodeTextFile('long.txt', encode('a'.repeat(MAX_CONTENT + 1)));
  assert.equal(result.ok, false);
  assert.equal('value' in result, false);
});
test('truncates only the suggested title to the existing title limit', () => {
  const result = decodeTextFile('a'.repeat(220) + '.txt', encode('Full text'));
  assert.equal(result.ok, true);
  assert.equal(result.value.title.length, 200);
  assert.equal(result.value.content, 'Full text');
});
test('rechecks byte limit even if caller bypasses metadata validation', () => {
  assert.equal(decodeTextFile('a.txt', new Uint8Array(MAX_IMPORT_BYTES + 1)).ok, false);
});
test('uses an editable fallback for a whitespace-only filename stem', () => {
  const result = decodeTextFile('   .txt', encode('Text'));
  assert.equal(result.ok, true);
  assert.equal(result.value.title, 'Texto importado');
});
test('allows returning to the import page after authentication', () => {
  assert.equal(safeReturnPath('/biblioteca/importar'), '/biblioteca/importar');
  assert.equal(safeReturnPath('//evil.invalid/biblioteca/importar'), '/');
  assert.equal(safeReturnPath('/biblioteca/importar/../../admin'), '/');
});
