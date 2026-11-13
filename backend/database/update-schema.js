require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const pool = require('../config/db');

async function update() {
  try {
    console.log('Modifying packages table ENUM...');
    await pool.query(`
      ALTER TABLE packages 
      MODIFY COLUMN status ENUM(
        'open',
        'requested',
        'accepted',
        'picked_up',
        'in_transit',
        'delivered_pending_confirmation',
        'delivered',
        'cancelled',
        'disputed'
      ) DEFAULT 'open'
    `);
    console.log('SUCCESS: packages.status ENUM updated with delivered_pending_confirmation!');
  } catch (err) {
    console.error('Error updating schema:', err.message);
  } finally {
    process.exit(0);
  }
}

update();
