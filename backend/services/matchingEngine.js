const pool = require('../config/db');

/**
 * Match packages to journeys based on:
 * 1. Matching from/to locations (case-insensitive, trimmed)
 * 2. Journey departure_date within 3 days of package preferred_date
 * 3. Journey remaining_capacity >= package weight
 * 4. Journey status = 'active'
 * 5. Traveler must be verified
 * 6. Journey not already matched (accepted/picked_up/in_transit) for this package
 *
 * @param {number} packageId
 * @returns {Array} Matching journeys with traveler info
 */
const findMatchesForPackage = async (packageId) => {
  // Fetch the package
  const [packages] = await pool.query(
    'SELECT * FROM packages WHERE id = ?',
    [packageId]
  );

  if (packages.length === 0) {
    throw new Error('Package not found');
  }

  const pkg = packages[0];

  // Build preferred date range (±3 days)
  const preferred = new Date(pkg.preferred_date);
  const minDate = new Date(preferred);
  minDate.setDate(minDate.getDate() - 3);
  const maxDate = new Date(preferred);
  maxDate.setDate(maxDate.getDate() + 3);

  const minDateStr = minDate.toISOString().split('T')[0];
  const maxDateStr = maxDate.toISOString().split('T')[0];

  const fromLoc = `%${pkg.from_location.trim()}%`;
  const toLoc   = `%${pkg.to_location.trim()}%`;

  const [matches] = await pool.query(
    `SELECT
       j.id              AS journey_id,
       j.from_location,
       j.to_location,
       j.departure_date,
       j.departure_time,
       j.available_capacity,
       j.remaining_capacity,
       j.expected_reward,
       j.notes,
       j.status          AS journey_status,
       u.id              AS traveler_id,
       u.name            AS traveler_name,
       u.email           AS traveler_email,
       u.phone           AS traveler_phone,
       tp.avg_rating,
       tp.total_deliveries,
       tp.verification_status
     FROM journeys j
     JOIN users u ON u.id = j.traveler_id
     JOIN traveler_profiles tp ON tp.user_id = j.traveler_id
     WHERE j.status = 'active'
       AND tp.verification_status = 'verified'
       AND j.remaining_capacity >= ?
       AND j.departure_date BETWEEN ? AND ?
       AND LOWER(TRIM(j.from_location)) LIKE LOWER(?)
       AND LOWER(TRIM(j.to_location))   LIKE LOWER(?)
       AND j.id NOT IN (
         SELECT dr.journey_id
         FROM delivery_requests dr
         WHERE dr.package_id = ?
           AND dr.status IN ('accepted')
       )
     ORDER BY j.departure_date ASC, tp.avg_rating DESC`,
    [
      pkg.weight,
      minDateStr,
      maxDateStr,
      fromLoc,
      toLoc,
      packageId,
    ]
  );

  return matches.map((m) => ({
    ...m,
    id: m.journey_id,
    _id: m.journey_id,
    fromLocation: m.from_location,
    toLocation: m.to_location,
    departureDate: m.departure_date,
    availableCapacity: m.remaining_capacity,
    expectedReward: m.expected_reward,
    traveler: {
      name: m.traveler_name,
      averageRating: Number(m.avg_rating || 0),
      totalDeliveries: m.total_deliveries,
      verificationStatus: m.verification_status,
    },
  }));
};

module.exports = { findMatchesForPackage };
