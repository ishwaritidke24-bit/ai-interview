const mongoose = require('mongoose');
const Kit = require('./src/models/Kit');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    const k = await Kit.findById('6ac7216741cafff48e47e978');
    console.log(`Kit ID: ${k._id}`);
    console.log(`Status: ${k.status}`);
    console.log(`Generation Status: ${k.generationStatus}`);
    console.log(`Generation Stage: ${k.generationStage}`);
    console.log(`Generation Error: ${JSON.stringify(k.generationError, null, 2)}`);
    console.log(`Internal Research: ${JSON.stringify(k.internal_research, null, 2)}`);
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
