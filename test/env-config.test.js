const test = require('node:test');
const assert = require('node:assert/strict');
const { isValidCursorApiKey } = require('../electron/env-config');

test('validates cursor api key shape', () => {
  assert.equal(isValidCursorApiKey('short'), false);
  assert.equal(isValidCursorApiKey('обнови ключ пожалуйста!!!!!!!'), false);
  assert.equal(isValidCursorApiKey('crsr_' + 'a'.repeat(40)), true);
  assert.equal(isValidCursorApiKey('key_' + 'b'.repeat(40)), true);
});
