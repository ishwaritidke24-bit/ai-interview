const mongoose = require('mongoose');
const Kit = require('./src/models/Kit');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    const kits = await Kit.find({ status: 'failed' }).sort({ createdAt: -1 }).limit(5);
    console.log(`Found ${kits.length} failed kits.`);
    for (const k of kits) {
      console.log(`Kit ID: ${k._id}`);
      console.log(`Generation Status: ${k.generationStatus}`);
      console.log(`Generation Stage: ${k.generationStage}`);
      console.log(`Generation Error: ${JSON.stringify(k.generationError, null, 2)}`);
      console.log(`Internal Research Error: ${k.internal_research?.error}`);
      console.log('---');
    }
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
