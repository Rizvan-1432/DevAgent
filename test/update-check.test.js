const test = require('node:test');
const assert = require('node:assert/strict');
const { isNewer } = require('../electron/update-check');

test('isNewer versions', () => {
  assert.equal(isNewer('2.3.0', '2.2.1'), true);
  assert.equal(isNewer('2.2.1', '2.3.0'), false);
  assert.equal(isNewer('2.2.1', '2.2.1'), false);
});
