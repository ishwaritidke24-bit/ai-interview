require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');

const requiredEnvVars = [
  'MONGODB_URI',
  'SESSION_SECRET',
  'FRONTEND_URL',
  'LLM_API_KEY'
];

const missingEnvVars = requiredEnvVars.filter(v => !process.env[v]);
if (missingEnvVars.length > 0) {
  console.error(`[FATAL] Missing required environment variables: ${missingEnvVars.join(', ')}`);
  process.exit(1);
}

const port = process.env.PORT || 3001;

app.listen(port, () => {
  console.log(`Backend server listening on port ${port}`);
});

connectDB().catch(err => {
  console.error("Warning: Could not connect to MongoDB on startup. Make sure MongoDB is running.", err.message);
});
