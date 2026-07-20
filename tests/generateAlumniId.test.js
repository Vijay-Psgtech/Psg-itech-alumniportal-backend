const assert = require('assert');
const { generateAlumniId } = require('../middleware/generateAlumniId');
const Counter = require('../models/Counter');

(async () => {
  const originalFindOneAndUpdate = Counter.findOneAndUpdate;
  Counter.findOneAndUpdate = async () => ({ seq: 1 });

  try {
    let nextCalled = false;
    const req = {};
    const res = {};

    await generateAlumniId(req, res, () => {
      nextCalled = true;
    });

    assert.strictEqual(nextCalled, true, 'generateAlumniId should call next()');
    assert.strictEqual(req.alumniId, 'PSGiTech-ALUM-000001');
    console.log('generateAlumniId regression test passed');
  } finally {
    Counter.findOneAndUpdate = originalFindOneAndUpdate;
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
