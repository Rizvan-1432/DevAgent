const test = require('node:test');
const assert = require('node:assert/strict');
const { redactSecrets, mapErrorToRu } = require('../electron/errors-ru');

test('redactSecrets hides tokens', () => {
  const s = redactSecrets('key=crsr_abcdefghijklmnopqrstuvwxyz123456 GITHUB_TOKEN=ghp_ABCDEFGHIJKLMNOPQRST');
  assert.equal(s.includes('crsr_abcdefghijklmnopqrstuvwxyz123456'), false);
  assert.match(s, /crsr_••••|ghp_••••/);
});

test('mapErrorToRu network', () => {
  assert.match(mapErrorToRu(new Error('Network request failed')), /интернет|сети/i);
});

test('mapErrorToRu invalid key', () => {
  assert.match(mapErrorToRu(new Error('Invalid API Key')), /Ключ Cursor/i);
});
