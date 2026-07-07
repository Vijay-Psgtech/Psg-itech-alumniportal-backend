const test = require('node:test');
const assert = require('node:assert/strict');
const Alumni = require('../models/Alumni');

test('alumni documents can be created without explicit location coordinates', async () => {
  const doc = new Alumni({
    alumniId: 'TEST-ALUMNI-001',
    firstName: 'Test',
    email: 'test-alumni@example.com',
    password: '123456',
    department: 'CSE',
    batchYear: '2020',
    role: 'Alumni',
  });

  await doc.validate();
  assert.deepEqual(doc.location.coordinates, [0, 0]);
});
