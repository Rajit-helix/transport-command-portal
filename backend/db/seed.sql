INSERT INTO roles (name)
VALUES ('ADMIN'), ('TRANSPORT_MANAGER'), ('DRIVER'), ('CUSTOMER')
ON CONFLICT (name) DO NOTHING;

INSERT INTO permissions (name)
VALUES
('routes:create'),('routes:update'),('routes:delete'),
('vehicles:read'),('vehicles:create'),('vehicles:update'),('vehicles:delete'),
('schedules:read'),('schedules:create'),('schedules:update'),('schedules:delete'),
('driver_assignments:read'),('driver_assignments:create'),('driver_assignments:update'),('driver_assignments:delete'),
('bookings:read'),('bookings:create'),('bookings:cancel'),('bookings:update_status'),
('admin:users:read'),('admin:audit:read'),('admin:analytics:read')
ON CONFLICT (name) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r CROSS JOIN permissions p
WHERE r.name = 'ADMIN'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.name IN (
  'routes:create','routes:update','routes:delete',
  'vehicles:read','vehicles:create','vehicles:update','vehicles:delete',
  'schedules:read','schedules:create','schedules:update','schedules:delete',
  'driver_assignments:read','driver_assignments:create','driver_assignments:update','driver_assignments:delete',
  'bookings:read','bookings:update_status','admin:analytics:read'
)
WHERE r.name = 'TRANSPORT_MANAGER'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.name IN ('driver_assignments:read','driver_assignments:update','bookings:read')
WHERE r.name = 'DRIVER'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.name IN ('bookings:create','bookings:read','bookings:cancel')
WHERE r.name = 'CUSTOMER'
ON CONFLICT DO NOTHING;

-- password: Password@123
INSERT INTO users (full_name, email, password_hash, role_id)
SELECT 'System Admin', 'admin@transport.local', '$2a$12$xPrvIpQfTW8RNLlbOO2N0.iz9P0f5hPSFqdtYY4cYNSeN5e7/geaW', id FROM roles WHERE name = 'ADMIN'
ON CONFLICT (email) DO NOTHING;

INSERT INTO users (full_name, email, password_hash, role_id)
SELECT 'Manager One', 'manager@transport.local', '$2a$12$xPrvIpQfTW8RNLlbOO2N0.iz9P0f5hPSFqdtYY4cYNSeN5e7/geaW', id FROM roles WHERE name = 'TRANSPORT_MANAGER'
ON CONFLICT (email) DO NOTHING;

INSERT INTO users (full_name, email, password_hash, role_id)
SELECT 'Driver One', 'driver@transport.local', '$2a$12$xPrvIpQfTW8RNLlbOO2N0.iz9P0f5hPSFqdtYY4cYNSeN5e7/geaW', id FROM roles WHERE name = 'DRIVER'
ON CONFLICT (email) DO NOTHING;

INSERT INTO users (full_name, email, password_hash, role_id)
SELECT 'Customer One', 'customer@transport.local', '$2a$12$xPrvIpQfTW8RNLlbOO2N0.iz9P0f5hPSFqdtYY4cYNSeN5e7/geaW', id FROM roles WHERE name = 'CUSTOMER'
ON CONFLICT (email) DO NOTHING;

INSERT INTO vehicles (registration_number, vehicle_type, capacity)
VALUES ('KA01AB1234', 'BUS', 50), ('KA01XY9876', 'MINI_BUS', 30)
ON CONFLICT (registration_number) DO NOTHING;

INSERT INTO cities (name)
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
ON CONFLICT (name) DO NOTHING;

INSERT INTO routes (source, destination, base_price, distance_km)
SELECT 'City Center', 'Airport', 350, 28
WHERE NOT EXISTS (SELECT 1 FROM routes WHERE source = 'City Center' AND destination = 'Airport' AND deleted_at IS NULL);

INSERT INTO routes (source, destination, base_price, distance_km)
SELECT 'Tech Park', 'Railway Station', 220, 15.5
WHERE NOT EXISTS (SELECT 1 FROM routes WHERE source = 'Tech Park' AND destination = 'Railway Station' AND deleted_at IS NULL);

INSERT INTO schedules (route_id, vehicle_id, departure_time, arrival_time, total_seats, available_seats)
SELECT r.id, v.id, NOW() + INTERVAL '3 hour', NOW() + INTERVAL '4 hour', v.capacity, v.capacity
FROM routes r
JOIN vehicles v ON v.registration_number = 'KA01AB1234'
WHERE r.source = 'City Center' AND r.destination = 'Airport'
  AND NOT EXISTS (
    SELECT 1 FROM schedules s WHERE s.route_id = r.id AND s.vehicle_id = v.id
  )
LIMIT 1;
