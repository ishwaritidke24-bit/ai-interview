require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');

const port = process.env.PORT || 3001;

app.listen(port, () => {
  console.log(`Backend server listening on port ${port}`);
});

connectDB().catch(err => {
  console.error("Warning: Could not connect to MongoDB on startup. Make sure MongoDB is running.", err.message);
});
