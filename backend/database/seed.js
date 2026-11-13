/**
 * RelayGo Database Seed Script
 * ==============================
 * Run with: npm run seed  (or: node database/seed.js)
 *
 * This script:
 * 1. Seeds an empty database without overwriting existing users
 * 2. Inserts 1 admin, 3 senders, 3 travelers with bcrypt-hashed passwords
 * 3. Creates traveler profiles (all verified)
 * 4. Creates 5 journeys
 * 5. Creates 6 packages in various statuses
 * 6. Creates delivery requests (including one full accepted→delivered flow)
 * 7. Creates OTP records, a released transaction, a rating
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const bcrypt = require('bcrypt');
const pool = require('../config/db');

const SALT_ROUNDS = 10;

async function seed() {
  let connection;
  let transactionStarted = false;
  try {
    connection = await pool.getConnection();
    console.log('Connected to PostgreSQL. Starting seed...\n');

    const [existingUsers] = await connection.query('SELECT id FROM users LIMIT 1');
    if (existingUsers.length > 0) {
      console.log('Seed skipped: the database already contains users.');
      return;
    }

    await connection.beginTransaction();
    transactionStarted = true;
    await connection.query(
      `TRUNCATE TABLE disputes, reports, ratings_reviews, transactions, otp_verifications,
       delivery_requests, packages, journeys, traveler_profiles, users RESTART IDENTITY CASCADE`
    );

    // ── Hash passwords ─────────────────────────────────────────
    console.log('Hashing passwords...');
    const adminHash    = await bcrypt.hash('Admin@123',    SALT_ROUNDS);
    const senderHash   = await bcrypt.hash('Sender@123',   SALT_ROUNDS);
    const travelerHash = await bcrypt.hash('Traveler@123', SALT_ROUNDS);
    console.log('Passwords hashed.\n');

    // ── Insert users ───────────────────────────────────────────
    console.log('Inserting users...');

    // Admin
    await connection.query(
      `INSERT INTO users (name, email, password_hash, phone, role) VALUES (?, ?, ?, ?, ?)`,
      ['Admin RelayGo', 'admin@relaygo.com', adminHash, '+91-9000000000', 'admin']
    );

    // Senders (IDs 2, 3, 4)
    const senders = [
      ['Priya Sharma',   'sender1@relaygo.com', '+91-9100000001'],
      ['Arjun Mehta',    'sender2@relaygo.com', '+91-9100000002'],
      ['Kavya Reddy',    'sender3@relaygo.com', '+91-9100000003'],
    ];
    for (const [name, email, phone] of senders) {
      await connection.query(
        `INSERT INTO users (name, email, password_hash, phone, role) VALUES (?, ?, ?, ?, 'sender')`,
        [name, email, senderHash, phone]
      );
    }

    // Travelers (IDs 5, 6, 7)
    const travelers = [
      ['Rohit Verma',    'traveler1@relaygo.com', '+91-9200000001'],
      ['Anjali Singh',   'traveler2@relaygo.com', '+91-9200000002'],
      ['Nikhil Joshi',   'traveler3@relaygo.com', '+91-9200000003'],
    ];
    for (const [name, email, phone] of travelers) {
      await connection.query(
        `INSERT INTO users (name, email, password_hash, phone, role) VALUES (?, ?, ?, ?, 'traveler')`,
        [name, email, travelerHash, phone]
      );
    }

    console.log('Users inserted (IDs 1–7).\n');

    // ── Traveler profiles ──────────────────────────────────────
    console.log('Inserting traveler profiles...');

    const travelerProfileData = [
      [5, 'Aadhaar', 'XXXX-XXXX-1001', 'verified', 'NOW()', 4.80, 12, 'Frequent Mumbai-Delhi flyer. Fast and reliable.'],
      [6, 'Passport', 'P-20230001',    'verified', 'NOW()', 4.50,  7, 'Business traveler, handle packages with care.'],
      [7, 'Aadhaar', 'XXXX-XXXX-2002', 'verified', 'NOW()', 4.20,  5, 'South India corridor specialist.'],
    ];

    for (const [userId, idType, idNum, status, , avgR, totalD, bio] of travelerProfileData) {
      await connection.query(
        `INSERT INTO traveler_profiles (user_id, id_type, id_number, verification_status, verified_at, avg_rating, total_deliveries, bio)
         VALUES (?, ?, ?, ?, NOW(), ?, ?, ?)`,
        [userId, idType, idNum, status, avgR, totalD, bio]
      );
    }

    console.log('Traveler profiles inserted.\n');

    // ── Journeys ───────────────────────────────────────────────
    console.log('Inserting journeys...');

    // journeys: traveler_id, from, to, date, time, capacity, expected_reward, notes, status
    const journeys = [
      [5, 'Mumbai',    'Delhi',     '2026-11-10', '08:00:00', 20.00, 500.00, 'Flying IndiGo 6E-123, can carry up to 20kg',         'active'],
      [6, 'Delhi',     'Bangalore', '2026-11-12', '10:30:00', 15.00, 600.00, 'Business trip, prefer small parcels',                 'active'],
      [7, 'Bangalore', 'Chennai',   '2026-11-08', '07:00:00', 10.00, 300.00, 'Road trip via NH-44',                                 'active'],
      [5, 'Mumbai',    'Pune',      '2026-11-06', '09:00:00',  8.00, 150.00, 'Daily commute, can carry small packages',             'active'],
      [6, 'Chennai',   'Hyderabad', '2026-11-15', '14:00:00', 12.00, 400.00, 'Train journey, secure compartment',                   'active'],
    ];

    for (const [tId, from, to, date, time, cap, reward, notes, status] of journeys) {
      await connection.query(
        `INSERT INTO journeys (traveler_id, from_location, to_location, departure_date, departure_time,
           available_capacity, remaining_capacity, expected_reward, notes, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [tId, from, to, date, time, cap, cap, reward, notes, status]
      );
    }

    console.log('Journeys inserted (IDs 1–5).\n');

    // ── Packages ───────────────────────────────────────────────
    console.log('Inserting packages...');

    const packages = [
      // sender_id, title, desc, from, to, preferred_date, weight, dim, category, budget, status
      [2, 'Birthday Gift Box',    'Wrapped gift for family',       'Mumbai', 'Delhi',     '2026-11-10', 2.50,  '30x20x15cm', 'Gift',       400.00, 'open'],
      [2, 'Electronics Package',  'Laptop and accessories',        'Mumbai', 'Delhi',     '2026-11-10', 3.00,  '45x30x10cm', 'Electronics',500.00, 'delivered'],
      [3, 'Ayurvedic Medicines',  'Herbal medicines for parents',  'Delhi',  'Bangalore', '2026-11-12', 1.50,  '25x15x10cm', 'Medicine',   350.00, 'open'],
      [3, 'Handmade Saree',       'Traditional handloom saree',    'Mumbai', 'Pune',      '2026-11-06', 0.80,  '20x15x5cm',  'Clothing',   200.00, 'in_transit'],
      [4, 'Books Collection',     'Set of 10 textbooks',           'Bangalore','Chennai', '2026-11-08', 5.00,  '40x30x20cm', 'Books',      250.00, 'accepted'],
      [4, 'Dry Fruits Pack',      'Assorted premium dry fruits',   'Delhi',  'Bangalore', '2026-11-12', 2.00,  '20x20x10cm', 'Food',       300.00, 'open'],
    ];

    for (const [sId, title, desc, from, to, date, weight, dim, cat, budget, status] of packages) {
      await connection.query(
        `INSERT INTO packages (sender_id, title, description, from_location, to_location,
           preferred_date, weight, dimensions, category, budget, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [sId, title, desc, from, to, date, weight, dim, cat, budget, status]
      );
    }

    console.log('Packages inserted (IDs 1–6).\n');

    // ── Delivery Requests ──────────────────────────────────────
    console.log('Inserting delivery requests...');

    // Package 2 (delivered): accepted request from traveler 5 (journey 1: Mumbai→Delhi)
    // package_id, journey_id, traveler_id, sender_id, status, message, agreed_reward
    await connection.query(
      `INSERT INTO delivery_requests (package_id, journey_id, traveler_id, sender_id, status, message, agreed_reward)
       VALUES (?, ?, ?, ?, 'accepted', ?, ?)`,
      [2, 1, 5, 2, 'I can deliver this safely. I travel this route weekly.', 480.00]
    );

    // Package 4 (in_transit): accepted request from traveler 5 (journey 4: Mumbai→Pune)
    await connection.query(
      `INSERT INTO delivery_requests (package_id, journey_id, traveler_id, sender_id, status, message, agreed_reward)
       VALUES (?, ?, ?, ?, 'accepted', ?, ?)`,
      [4, 4, 5, 3, 'Happy to carry this, it fits my bag perfectly.', 180.00]
    );

    // Package 5 (accepted): accepted request from traveler 7 (journey 3: Bangalore→Chennai)
    await connection.query(
      `INSERT INTO delivery_requests (package_id, journey_id, traveler_id, sender_id, status, message, agreed_reward)
       VALUES (?, ?, ?, ?, 'accepted', ?, ?)`,
      [5, 3, 7, 4, 'Books are my specialty! I will handle them well.', 240.00]
    );

    // Package 1 (open): a pending request
    await connection.query(
      `INSERT INTO delivery_requests (package_id, journey_id, traveler_id, sender_id, status, message, agreed_reward)
       VALUES (?, ?, ?, ?, 'pending', ?, ?)`,
      [1, 1, 5, 2, 'I can carry this along with my other packages.', 380.00]
    );

    console.log('Delivery requests inserted.\n');

    // ── Transactions ───────────────────────────────────────────
    console.log('Inserting transactions...');

    // Package 2 — RELEASED (delivered)
    await connection.query(
      `INSERT INTO transactions (package_id, delivery_request_id, sender_id, traveler_id, amount, status, released_at)
       VALUES (?, ?, ?, ?, ?, 'released', NOW())`,
      [2, 1, 2, 5, 480.00]
    );

    // Package 4 — HELD (in_transit)
    await connection.query(
      `INSERT INTO transactions (package_id, delivery_request_id, sender_id, traveler_id, amount, status)
       VALUES (?, ?, ?, ?, ?, 'held')`,
      [4, 2, 3, 5, 180.00]
    );

    // Package 5 — HELD (accepted)
    await connection.query(
      `INSERT INTO transactions (package_id, delivery_request_id, sender_id, traveler_id, amount, status)
       VALUES (?, ?, ?, ?, ?, 'held')`,
      [5, 3, 4, 7, 240.00]
    );

    console.log('Transactions inserted.\n');

    // ── OTP verifications ──────────────────────────────────────
    console.log('Inserting OTP records...');

    const future = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const futureStr = future.toISOString().slice(0, 19).replace('T', ' ');

    // Package 4 (in_transit) — pickup OTP already used, delivery OTP active
    await connection.query(
      `INSERT INTO otp_verifications (package_id, otp_type, otp_code, is_used, expires_at, used_at)
       VALUES (?, 'pickup', '000000', TRUE, ?, NOW())`,
      [4, futureStr]
    );
    await connection.query(
      `INSERT INTO otp_verifications (package_id, otp_type, otp_code, is_used, expires_at)
       VALUES (?, 'delivery', '000000', FALSE, ?)`,
      [4, futureStr]
    );

    // Package 5 (accepted) — pickup OTP generated and waiting
    await connection.query(
      `INSERT INTO otp_verifications (package_id, otp_type, otp_code, is_used, expires_at)
       VALUES (?, 'pickup', '000000', FALSE, ?)`,
      [5, futureStr]
    );

    console.log('OTP records inserted.\n');

    // ── Ratings ────────────────────────────────────────────────
    console.log('Inserting ratings...');

    // Rating for package 2 (delivered) — sender 2 rates traveler 5
    await connection.query(
      `INSERT INTO ratings_reviews (package_id, sender_id, traveler_id, rating, review)
       VALUES (?, ?, ?, ?, ?)`,
      [2, 2, 5, 5, 'Excellent service! Package arrived in perfect condition. Highly recommended!']
    );

    // Update traveler 5 avg_rating
    await connection.query(
      `UPDATE traveler_profiles SET avg_rating = 4.80 WHERE user_id = 5`
    );

    console.log('Ratings inserted.\n');

    // ── Update journey remaining capacities ────────────────────
    console.log('Updating journey capacities...');

    // Journey 1: delivered package 2 (3kg) + pending package 1 not yet accepted
    // Package 2 was accepted from journey 1, so capacity reduced by 3kg
    await connection.query('UPDATE journeys SET remaining_capacity = remaining_capacity - 3.00 WHERE id = 1');

    // Journey 4: package 4 accepted (0.80kg)
    await connection.query('UPDATE journeys SET remaining_capacity = remaining_capacity - 0.80 WHERE id = 4');

    // Journey 3: package 5 accepted (5kg)
    await connection.query('UPDATE journeys SET remaining_capacity = remaining_capacity - 5.00 WHERE id = 3');

    await connection.commit();
    transactionStarted = false;

    console.log('Journey capacities updated.\n');

    // ── Summary ────────────────────────────────────────────────
    console.log('═══════════════════════════════════════════════════');
    console.log('✅ Seed completed successfully!\n');
    console.log('Credentials:');
    console.log('  Admin:     admin@relaygo.com     / Admin@123');
    console.log('  Sender 1:  sender1@relaygo.com   / Sender@123');
    console.log('  Sender 2:  sender2@relaygo.com   / Sender@123');
    console.log('  Sender 3:  sender3@relaygo.com   / Sender@123');
    console.log('  Traveler 1: traveler1@relaygo.com / Traveler@123');
    console.log('  Traveler 2: traveler2@relaygo.com / Traveler@123');
    console.log('  Traveler 3: traveler3@relaygo.com / Traveler@123');
    console.log('═══════════════════════════════════════════════════');

  } catch (err) {
    if (connection && transactionStarted) await connection.rollback();
    throw err;
  } finally {
    if (connection) connection.release();
  }
}

if (require.main === module) {
  seed()
    .then(() => pool.end())
    .catch(async (err) => {
      console.error('Seed failed:', err.message);
      await pool.end();
      process.exitCode = 1;
    });
}

module.exports = seed;
