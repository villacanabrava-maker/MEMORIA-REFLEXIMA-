import test from 'node:test';
import assert from 'node:assert/strict';
import { BRAIN_AI_CONTRACT_VERSION, brainSuggestionJsonSchema, validateBrainAISuggestions } from '../../src/lib/brain/ai-contract.ts';

const memoryId = '70000000-0000-4000-8000-000000000001';
const evidenceId = '71000000-0000-4000-8000-000000000001';
const allowedMemories = new Set([memoryId]);
const allowedEvidence = new Set([evidenceId]);

const validPayload = {
  suggestions: [{
    insight_type: 'thinking_pattern',
    title: 'Parte do concreto para o abstrato',
    statement: 'Os materiais selecionados sugerem uma recorrência deste movimento argumentativo.',
    memory_refs: [{ id: memoryId, role: 'supports' }],
    evidence_refs: [{ id: evidenceId, role: 'example' }],
    caveat: 'Interpretação limitada ao contexto recuperado nesta execução.',
  }],
};

test('brain AI contract has an explicit version and strict top-level schema', () => {
  assert.equal(BRAIN_AI_CONTRACT_VERSION, 'brain-insight-v1');
  assert.equal(brainSuggestionJsonSchema.additionalProperties, false);
  assert.deepEqual(brainSuggestionJsonSchema.required, ['suggestions']);
});

test('accepts structured suggestions that only cite allowed context', () => {
  const result = validateBrainAISuggestions(validPayload, allowedMemories, allowedEvidence);
  assert.equal(result.ok, true);
  assert.equal(result.value.suggestions[0].title, 'Parte do concreto para o abstrato');
});

test('rejects hallucinated memory ids even when JSON shape is valid', () => {
  const payload = structuredClone(validPayload);
  payload.suggestions[0].memory_refs[0].id = '70000000-0000-4000-8000-000000000002';
  const result = validateBrainAISuggestions(payload, allowedMemories, allowedEvidence);
  assert.equal(result.ok, false);
  assert.match(result.message, /memória fora do contexto/i);
});

test('rejects hallucinated evidence ids even when JSON shape is valid', () => {
  const payload = structuredClone(validPayload);
  payload.suggestions[0].evidence_refs[0].id = '71000000-0000-4000-8000-000000000002';
  const result = validateBrainAISuggestions(payload, allowedMemories, allowedEvidence);
  assert.equal(result.ok, false);
  assert.match(result.message, /evidência fora do contexto/i);
});

test('rejects unknown fields and unsupported insight types', () => {
  const withExtra = structuredClone(validPayload);
  withExtra.suggestions[0].secret = 'not allowed';
  assert.equal(validateBrainAISuggestions(withExtra, allowedMemories, allowedEvidence).ok, false);

  const badType = structuredClone(validPayload);
  badType.suggestions[0].insight_type = 'personality_diagnosis';
  assert.equal(validateBrainAISuggestions(badType, allowedMemories, allowedEvidence).ok, false);
});

test('rejects too many suggestions and overlong fields', () => {
  const tooMany = { suggestions: Array.from({ length: 6 }, () => structuredClone(validPayload.suggestions[0])) };
  assert.equal(validateBrainAISuggestions(tooMany, allowedMemories, allowedEvidence).ok, false);

  const longTitle = structuredClone(validPayload);
  longTitle.suggestions[0].title = 'x'.repeat(201);
  assert.equal(validateBrainAISuggestions(longTitle, allowedMemories, allowedEvidence).ok, false);
});
