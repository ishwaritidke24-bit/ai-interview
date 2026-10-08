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

const port = Number(process.env.PORT || 3001);

const exitWithStartupError = (message) => {
  console.error(`[FATAL] ${message}`);
  process.exit(1);
};

const startServer = async () => {
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    exitWithStartupError('PORT must be an integer between 1 and 65535.');
    return;
  }

  try {
    // Do not make a billable LLM request during startup. API failures are reported
    // against the generation job, while the health and auth endpoints remain usable.
    await connectDB();
  } catch (error) {
    exitWithStartupError(`Unable to connect to MongoDB: ${error.message}`);
    return;
  }

  const server = app.listen(port, () => {
    console.log(`Backend server listening on port ${port}`);
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      exitWithStartupError(`Port ${port} is already in use. Stop the other backend process or set PORT to a free port.`);
      return;
    }

    exitWithStartupError(`HTTP server failed to start: ${error.message}`);
  });
};

startServer();
