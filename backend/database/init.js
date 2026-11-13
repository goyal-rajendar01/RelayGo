require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const fs = require('fs');
const path = require('path');
const pool = require('../config/db');
const seed = require('./seed');

async function initialize() {
  try {
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await pool.runScript(schema);
    console.log('PostgreSQL schema is ready.');

    await seed();
    console.log('Database setup completed.');
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  initialize().catch((err) => {
    console.error('Database setup failed:', err.message);
    process.exitCode = 1;
  });
}

module.exports = initialize;
