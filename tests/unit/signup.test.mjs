import assert from 'node:assert/strict';
import test from 'node:test';
import { previewFeatureEnabled, validateSignup } from '../../src/lib/auth/signup.ts';

// Fictional fixtures only. No application credentials or external requests.
test('signup validation trims email but preserves password', () => {
  const result = validateSignup(' demo@example.test ', ' fixture-password ', ' fixture-password ');
  assert.deepEqual(result, { ok: true, email: 'demo@example.test', password: ' fixture-password ' });
});
for (const value of [null, undefined, {}, 'missing-at', 'a@b', 'a b@example.test', 'x\0@example.test', 'a'.repeat(321) + '@example.test']) {
  test(`signup rejects invalid email ${String(value).slice(0, 20)}`, () => {
    assert.equal(validateSignup(value, 'fixture-password', 'fixture-password').ok, false);
  });
}
for (const value of [null, {}, '', 'short', 'bad\0password', 'a'.repeat(4097)]) {
  test(`signup rejects invalid password ${typeof value}/${typeof value === 'string' ? value.length : 0}`, () => {
    const result = validateSignup('demo@example.test', value, value);
    assert.equal(result.ok, false);
    assert.deepEqual(Object.keys(result).sort(), ['message', 'ok']);
  });
}
test('signup rejects mismatched passwords', () => {
  assert.equal(validateSignup('demo@example.test', 'fixture-password', 'different-password').ok, false);
});
test('preview defaults do not enable production or local features', () => {
  assert.equal(previewFeatureEnabled(undefined, 'preview'), true);
  for (const stage of ['production', 'development', undefined]) assert.equal(previewFeatureEnabled(undefined, stage), false);
});
test('explicit flags take precedence and fail closed', () => {
  for (const stage of ['preview', 'production', undefined]) {
    assert.equal(previewFeatureEnabled('true', stage), true);
    for (const value of ['false', '', 'yes', 'TRUE']) assert.equal(previewFeatureEnabled(value, stage), false);
  }
});
