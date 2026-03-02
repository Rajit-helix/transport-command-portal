import { query, pool } from "../src/config/db.js";

const DEFAULT_PASSWORD_HASH = "$2a$12$nLctvdGL.QLzc4bhp6zoUugeqYTyQycbpiw4oMrenraxvHu/M9IrC";

async function seed() {
  await query(
    `INSERT INTO users (full_name, email, password_hash, role_id)
     SELECT 'System Admin', 'admin@transport.local', $1, r.id
     FROM roles r
     WHERE r.name = 'ADMIN'
     ON CONFLICT (email)
     DO UPDATE SET
       full_name = EXCLUDED.full_name,
       password_hash = EXCLUDED.password_hash,
       role_id = EXCLUDED.role_id,
       is_active = TRUE,
       updated_at = NOW()`,
    [DEFAULT_PASSWORD_HASH]
  );

  await query(
    `INSERT INTO users (full_name, email, password_hash, role_id)
     SELECT 'Manager One', 'manager@transport.local', $1, r.id
     FROM roles r
     WHERE r.name = 'TRANSPORT_MANAGER'
     ON CONFLICT (email)
     DO UPDATE SET
       full_name = EXCLUDED.full_name,
       password_hash = EXCLUDED.password_hash,
       role_id = EXCLUDED.role_id,
       is_active = TRUE,
       updated_at = NOW()`,
    [DEFAULT_PASSWORD_HASH]
  );

  await query(
    `INSERT INTO users (full_name, email, password_hash, role_id)
     SELECT 'Driver One', 'driver@transport.local', $1, r.id
     FROM roles r
     WHERE r.name = 'DRIVER'
     ON CONFLICT (email)
     DO UPDATE SET
       full_name = EXCLUDED.full_name,
       password_hash = EXCLUDED.password_hash,
       role_id = EXCLUDED.role_id,
       is_active = TRUE,
       updated_at = NOW()`,
    [DEFAULT_PASSWORD_HASH]
  );

  await query(
    `INSERT INTO users (full_name, email, password_hash, role_id)
     SELECT 'Customer One', 'customer@transport.local', $1, r.id
     FROM roles r
     WHERE r.name = 'CUSTOMER'
     ON CONFLICT (email)
     DO UPDATE SET
       full_name = EXCLUDED.full_name,
       password_hash = EXCLUDED.password_hash,
       role_id = EXCLUDED.role_id,
       is_active = TRUE,
       updated_at = NOW()`,
    [DEFAULT_PASSWORD_HASH]
  );

  await query(
    `INSERT INTO vehicles (registration_number, vehicle_type, capacity)
     VALUES ('KA01AB1234','BUS',50), ('KA01XY9876','MINI_BUS',30)
     ON CONFLICT (registration_number) DO NOTHING`
  );

  await query(
    `INSERT INTO cities (name)
     VALUES
      ('Airport'),
      ('Bengaluru'),
      ('Bhubaneswar'),
      ('City Center'),
      ('Cuttack'),
      ('Mysuru'),
      ('Puri'),
      ('Railway Station'),
      ('Tech Park')
     ON CONFLICT (name) DO NOTHING`
  );

  await query(
    `INSERT INTO routes (source, destination, base_price, distance_km)
     SELECT 'City Center','Airport',350,28
     WHERE NOT EXISTS (
       SELECT 1 FROM routes WHERE source = 'City Center' AND destination = 'Airport' AND deleted_at IS NULL
     )`
  );

  await query(
    `INSERT INTO routes (source, destination, base_price, distance_km)
     SELECT 'Tech Park','Railway Station',220,15.5
     WHERE NOT EXISTS (
       SELECT 1 FROM routes WHERE source = 'Tech Park' AND destination = 'Railway Station' AND deleted_at IS NULL
     )`
  );

  await query(
    `INSERT INTO schedules (route_id, vehicle_id, departure_time, arrival_time, total_seats, available_seats)
     SELECT r.id, v.id, NOW() + INTERVAL '3 hour', NOW() + INTERVAL '4 hour', v.capacity, v.capacity
     FROM routes r
     JOIN vehicles v ON v.registration_number = 'KA01AB1234'
     WHERE r.source = 'City Center' AND r.destination = 'Airport'
       AND NOT EXISTS (
         SELECT 1 FROM schedules s WHERE s.route_id = r.id AND s.vehicle_id = v.id
       )
     LIMIT 1`
  );
}

seed()
  .then(async () => {
    await pool.end();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error(error);
    await pool.end();
    process.exit(1);
  });
