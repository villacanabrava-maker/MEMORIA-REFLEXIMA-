import assert from 'node:assert/strict';

const base = process.env.TEST_BASE_URL ?? 'http://127.0.0.1:3000';
const page = await fetch(`${base}/biblioteca/arquivos`, { redirect:'manual' });
assert.equal(page.status, 307);
const location = new URL(page.headers.get('location'), base);
assert.equal(location.pathname, '/login');
assert.equal(location.searchParams.get('retorno'), '/biblioteca/arquivos');

const api = await fetch(`${base}/api/arquivos`, { method:'POST', redirect:'manual' });
assert.equal(api.status, 401);
assert.match(api.headers.get('content-type') ?? '', /application\/json/);
assert.match(api.headers.get('cache-control') ?? '', /no-store/);
console.log('PASS: file pages redirect guests and file API returns JSON 401');
