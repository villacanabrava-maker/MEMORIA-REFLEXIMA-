import assert from 'node:assert/strict';
import test from 'node:test';
import { MAX_FILE_BYTES, attachmentHeader, buildFileKey, fileDigest, parseFileKey, validateFileBytes, validateFileMetadata } from '../../src/lib/files/validation.ts';

const id = '123e4567-e89b-42d3-a456-426614174000';
const encode = (value) => new TextEncoder().encode(value);

test('accepts supported file metadata and rejects unsafe names/types/sizes', () => {
  for (const name of ['nota.txt','leitura.md','texto.PDF']) assert.equal(validateFileMetadata(name, 10).ok, true);
  for (const name of ['a.docx','a.html','../a.txt','a/b.txt','a\\b.md','a\0.txt','a\n.txt']) assert.equal(validateFileMetadata(name, 10).ok, false);
  for (const size of [0,-1,1.5,MAX_FILE_BYTES+1]) assert.equal(validateFileMetadata('a.txt', size).ok, false);
});

test('validates simple PDF signature and UTF-8 text', () => {
  assert.equal(validateFileBytes('a.pdf', encode('%PDF-1.7\nfixture')).ok, true);
  assert.equal(validateFileBytes('a.pdf', encode('not-pdf')).ok, false);
  assert.equal(validateFileBytes('a.txt', encode('Texto válido\n')).ok, true);
  assert.equal(validateFileBytes('a.txt', new Uint8Array([0xff])).ok, false);
  assert.equal(validateFileBytes('a.txt', encode('a\0b')).ok, false);
});

test('builds and parses an opaque key with Unicode filename and digest', async () => {
  const bytes = encode('fixture');
  const digest = await fileDigest(bytes);
  const key = buildFileKey(id, digest, 'Leitura ç.md');
  assert.deepEqual(parseFileKey(key), { requestId:id, digest, originalName:'Leitura ç.md' });
  assert.equal(parseFileKey('../' + key), null);
  assert.equal(parseFileKey(key + '/x'), null);
});

test('download header uses RFC 5987 encoding and a neutral ASCII fallback', () => {
  const header = attachmentHeader('Leitura ç.md');
  assert.match(header, /^attachment; filename="original"; filename\*=UTF-8''/);
  assert.match(header, /Leitura%20%C3%A7\.md/);
});
