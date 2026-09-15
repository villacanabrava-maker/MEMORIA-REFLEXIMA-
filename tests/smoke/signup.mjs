import assert from 'node:assert/strict';

// Run with SELF_SIGNUP_ENABLED=true against a local build. No user is created.
const base = process.env.TEST_BASE_URL ?? 'http://127.0.0.1:3000';
const response = await fetch(`${base}/cadastro`, { redirect: 'manual' });
assert.equal(response.status, 200, 'Signup page must be reachable without a session');
assert.match(response.headers.get('cache-control') ?? '', /no-store/);
const html = await response.text();
assert.match(html, /Criar minha conta/);
assert.match(html, /name="email"/);
assert.match(html, /name="password"/);
assert.match(html, /name="confirmation"/);
const login = await fetch(`${base}/login`);
assert.match(await login.text(), /href="\/cadastro"/);
console.log('PASS: signup rendering and login link; no credentials submitted');
