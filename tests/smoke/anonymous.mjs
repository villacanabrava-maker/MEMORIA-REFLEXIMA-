import assert from 'node:assert/strict';

const origin = process.env.APP_TEST_URL ?? 'http://127.0.0.1:3000';
const paths = ['/', '/biblioteca', '/biblioteca/novo', '/biblioteca/10000000-0000-4000-8000-000000000001', '/biblioteca/10000000-0000-4000-8000-000000000001/editar'];
const login = await fetch(`${origin}/login`, { signal: AbortSignal.timeout(10000) });
assert.equal(login.status, 200, 'Login page should render for a guest');
assert.match(await login.text(), /Entre no seu espa/);
for (const path of paths) {
  const response = await fetch(`${origin}${path}`, { redirect: 'manual', signal: AbortSignal.timeout(10000) });
  assert.equal(response.status, 307, `${path} must redirect a guest`);
  const target = new URL(response.headers.get('location'), origin);
  assert.equal(target.pathname, '/login');
  assert.equal(target.searchParams.get('retorno'), path);
  assert.match(response.headers.get('cache-control') ?? '', /no-store/);
}
console.log('PASS: login rendering and 5 private routes reject anonymous requests');
