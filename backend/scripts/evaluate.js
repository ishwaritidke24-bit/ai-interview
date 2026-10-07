require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const kitService = require('../src/services/kitService');
const researchService = require('../src/services/researchService');
const User = require('../src/models/User');
const Kit = require('../src/models/Kit');

const parseArgs = () => {
  const args = process.argv.slice(2);
  let input = '';
  let output = '';
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--input' && args[i + 1]) input = args[i + 1];
    if (args[i] === '--output' && args[i + 1]) output = args[i + 1];
  }
  
  // Fallback for when npm strips flags and passes them positionally
  if (!input && !output && args.length >= 2) {
    if (!args[0].startsWith('--')) input = args[0];
    if (!args[1].startsWith('--')) output = args[1];
  }

  if (!input || !output) {
    console.error('Usage: npm run evaluate -- --input <input_file> --output <output_file>');
    process.exit(1);
  }
  return { input, output };
};

const runBatch = async () => {
  const { input, output } = parseArgs();

  const inputPath = path.resolve(process.cwd(), input);
  const outputPath = path.resolve(process.cwd(), output);

  if (!fs.existsSync(inputPath)) {
    console.error(`Input file not found: ${inputPath}`);
    process.exit(1);
  }

  const cases = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  const results = [];

  // Connect to DB for the pipeline to function
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ai_interview_prep');

  // Ensure an evaluator user exists
  let evaluator = await User.findOne({ email: 'evaluator@local.test' });
  if (!evaluator) {
    evaluator = await User.create({ email: 'evaluator@local.test', passwordHash: 'noop' });
  }

  for (let i = 0; i < cases.length; i++) {
    const caseData = cases[i];
    console.log(`\nEvaluating case ${i + 1}/${cases.length}: ${caseData.id || 'Unknown'}`);
    
    try {
      // Create empty kit structurally identical to API creation
      const newKit = await kitService.createKit(evaluator._id, {
        jd: caseData.jd,
        company_url: caseData.company_url,
        days: caseData.days_available
      });

      // Execute exact same pipeline
      await researchService.runInitialResearch(newKit._id, evaluator._id, caseData.jd);
      
      // Fetch the finalized document
      const completedKit = await Kit.findById(newKit._id);

      results.push({
        id: caseData.id,
        status: completedKit.status,
        generationStatus: completedKit.generationStatus,
        kit: completedKit
      });
      
      console.log(`✓ Case ${caseData.id} finished with status: ${completedKit.status}`);
    } catch (err) {
      console.error(`✗ Case ${caseData.id} failed fundamentally:`, err.message);
      results.push({
        id: caseData.id,
        status: 'failed',
        error: err.message
      });
    }
  }

  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf8');
  console.log(`\nBatch evaluation complete. Results written to ${output}`);
  
  await mongoose.connection.close();
};

runBatch().catch(err => {
  console.error('Fatal batch error:', err);
  process.exit(1);
});
