require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');

const port = process.env.PORT || 3001;

connectDB().then(() => {
  app.listen(port, () => {
    console.log(`Backend server listening on port ${port}`);
  });
});
