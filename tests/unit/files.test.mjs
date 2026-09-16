import assert from 'node:assert/strict';
import test from 'node:test';
import { MAX_FILE_BYTES, TUS_CHUNK_BYTES, buildFileKey, parseFileKey, validateFileMetadata } from '../../src/lib/files/validation.ts';
const id='123e4567-e89b-42d3-a456-426614174000';
test('limits application files to 50 MB on the free plan',()=>{assert.equal(MAX_FILE_BYTES,50_000_000);assert.equal(TUS_CHUNK_BYTES,6*1024*1024);assert.equal(validateFileMetadata('a.pdf',MAX_FILE_BYTES).ok,true);assert.equal(validateFileMetadata('a.pdf',MAX_FILE_BYTES+1).ok,false)});
test('accepts arbitrary safe file names and rejects unsafe names',()=>{for(const name of ['nota.txt','leitura.md','dados.csv','texto.PDF','carta.doc','relatorio.docx','foto.jpg','audio.mp3','arquivo.zip','sem-extensao'])assert.equal(validateFileMetadata(name,10).ok,true);for(const name of ['../a.txt','a/b.txt','a\\b.md','a\0.txt','a\n.txt'])assert.equal(validateFileMetadata(name,10).ok,false)});
test('uses a generic MIME type for unknown extensions',()=>{const result=validateFileMetadata('arquivo.xyz',10);assert.equal(result.ok,true);if(result.ok)assert.equal(result.contentType,'application/octet-stream')});
test('builds and parses opaque Unicode file keys without content hashing',()=>{const key=buildFileKey(id,'Leitura ç.docx');assert.deepEqual(parseFileKey(key),{requestId:id,originalName:'Leitura ç.docx'});assert.equal(parseFileKey('../'+key),null);assert.equal(parseFileKey(key+'/x'),null)});
