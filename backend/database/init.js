require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function init() {
  console.log('--- Initializing RelayGo Database ---');
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
  });

  try {
    const dbName = process.env.DB_NAME || 'relaygo';
    console.log(`Ensuring database '${dbName}' exists...`);
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await connection.query(`USE \`${dbName}\`;`);
    console.log(`Using database '${dbName}'.`);

    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    console.log('Executing schema.sql...');
    await connection.query(schemaSql);
    console.log('Schema created successfully!');

    await connection.end();

    // Now invoke seed.js
    console.log('\nRunning database seed...');
    require('./seed');
  } catch (err) {
    console.error('Database initialization error:', err);
    await connection.end();
    process.exit(1);
  }
}

init();

