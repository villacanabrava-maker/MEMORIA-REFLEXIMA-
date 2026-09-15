import assert from 'node:assert/strict';

// Tests the real Next.js build without a user session. No credentials or files sent.
const base = process.env.TEST_BASE_URL ?? 'http://127.0.0.1:3000';
const response = await fetch(`${base}/biblioteca/importar`, { redirect: 'manual' });
assert.equal(response.status, 307);
assert.match(response.headers.get('cache-control') ?? '', /no-store/);
const location = new URL(response.headers.get('location'), base);
assert.equal(location.pathname, '/login');
assert.equal(location.searchParams.get('retorno'), '/biblioteca/importar');
const login = await fetch(location);
assert.equal(login.status, 200);
assert.match(await login.text(), /name="retorno" value="\/biblioteca\/importar"/);
console.log('PASS: import route requires authentication and preserves the safe login destination');
