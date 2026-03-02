const permissionRows = [
  "routes:create",
  "routes:update",
  "routes:delete",
  "vehicles:read",
  "vehicles:create",
  "vehicles:update",
  "vehicles:delete",
  "schedules:read",
  "schedules:create",
  "schedules:update",
  "schedules:delete",
  "driver_assignments:read",
  "driver_assignments:create",
  "driver_assignments:update",
  "driver_assignments:delete",
  "bookings:read",
  "bookings:create",
  "bookings:cancel",
  "bookings:update_status",
  "admin:users:read",
  "admin:audit:read",
  "admin:analytics:read"
];

exports.up = (pgm) => {
  pgm.createExtension("pgcrypto", { ifNotExists: true });

  pgm.createTable("roles", {
    id: "id",
    name: { type: "varchar(50)", notNull: true, unique: true }
  });

  pgm.createTable("users", {
    id: { type: "uuid", primaryKey: true, default: pgm.func("gen_random_uuid()") },
    full_name: { type: "varchar(120)", notNull: true },
    email: { type: "varchar(160)", notNull: true, unique: true },
    password_hash: { type: "text", notNull: true },
    role_id: {
      type: "integer",
      notNull: true,
      references: 'roles',
      onDelete: "RESTRICT"
    },
    token_version: { type: "integer", notNull: true, default: 0 },
    is_active: { type: "boolean", notNull: true, default: true },
    created_at: { type: "timestamp", notNull: true, default: pgm.func("NOW()") },
    updated_at: { type: "timestamp", notNull: true, default: pgm.func("NOW()") }
  });

  pgm.createTable("permissions", {
    id: "id",
    name: { type: "varchar(120)", notNull: true, unique: true }
  });

  pgm.createTable("role_permissions", {
    role_id: { type: "integer", references: "roles", notNull: true, onDelete: "CASCADE" },
    permission_id: { type: "integer", references: "permissions", notNull: true, onDelete: "CASCADE" }
  });
  pgm.addConstraint("role_permissions", "role_permissions_unique", {
    unique: ["role_id", "permission_id"]
  });

  pgm.createTable("vehicles", {
    id: { type: "uuid", primaryKey: true, default: pgm.func("gen_random_uuid()") },
    registration_number: { type: "varchar(30)", notNull: true, unique: true },
    vehicle_type: { type: "varchar(50)", notNull: true },
    capacity: { type: "integer", notNull: true },
    status: { type: "varchar(30)", notNull: true, default: "ACTIVE" },
    is_active: { type: "boolean", notNull: true, default: true },
    deleted_at: { type: "timestamp" },
    created_at: { type: "timestamp", notNull: true, default: pgm.func("NOW()") },
    updated_at: { type: "timestamp", notNull: true, default: pgm.func("NOW()") }
  });

  pgm.createTable("routes", {
    id: { type: "uuid", primaryKey: true, default: pgm.func("gen_random_uuid()") },
    source: { type: "varchar(120)", notNull: true },
    destination: { type: "varchar(120)", notNull: true },
    base_price: { type: "numeric(10,2)", notNull: true },
    distance_km: { type: "numeric(10,2)", notNull: true },
    is_active: { type: "boolean", notNull: true, default: true },
    deleted_at: { type: "timestamp" },
    created_at: { type: "timestamp", notNull: true, default: pgm.func("NOW()") },
    updated_at: { type: "timestamp", notNull: true, default: pgm.func("NOW()") }
  });

  pgm.createTable("schedules", {
    id: { type: "uuid", primaryKey: true, default: pgm.func("gen_random_uuid()") },
    route_id: { type: "uuid", notNull: true, references: "routes", onDelete: "CASCADE" },
    vehicle_id: { type: "uuid", notNull: true, references: "vehicles", onDelete: "RESTRICT" },
    departure_time: { type: "timestamp", notNull: true },
    arrival_time: { type: "timestamp", notNull: true },
    total_seats: { type: "integer", notNull: true },
    available_seats: { type: "integer", notNull: true },
    status: { type: "varchar(30)", notNull: true, default: "SCHEDULED" },
    created_at: { type: "timestamp", notNull: true, default: pgm.func("NOW()") },
    updated_at: { type: "timestamp", notNull: true, default: pgm.func("NOW()") }
  });

  pgm.createTable("bookings", {
    id: { type: "uuid", primaryKey: true, default: pgm.func("gen_random_uuid()") },
    customer_id: { type: "uuid", notNull: true, references: "users", onDelete: "RESTRICT" },
    schedule_id: { type: "uuid", notNull: true, references: "schedules", onDelete: "RESTRICT" },
    seat_count: { type: "integer", notNull: true },
    total_price: { type: "numeric(10,2)", notNull: true },
    status: { type: "varchar(30)", notNull: true, default: "PENDING" },
    created_at: { type: "timestamp", notNull: true, default: pgm.func("NOW()") },
    updated_at: { type: "timestamp", notNull: true, default: pgm.func("NOW()") }
  });

  pgm.createTable("driver_assignments", {
    id: { type: "uuid", primaryKey: true, default: pgm.func("gen_random_uuid()") },
    driver_id: { type: "uuid", notNull: true, references: "users", onDelete: "CASCADE" },
    schedule_id: { type: "uuid", notNull: true, references: "schedules", onDelete: "CASCADE" },
    assignment_status: { type: "varchar(30)", notNull: true, default: "ASSIGNED" },
    created_at: { type: "timestamp", notNull: true, default: pgm.func("NOW()") },
    updated_at: { type: "timestamp", notNull: true, default: pgm.func("NOW()") }
  });
  pgm.addConstraint("driver_assignments", "driver_schedule_unique", {
    unique: ["driver_id", "schedule_id"]
  });

  pgm.createTable("audit_logs", {
    id: "bigserial",
    actor_user_id: { type: "uuid", references: "users" },
    action: { type: "varchar(120)", notNull: true },
    entity_type: { type: "varchar(60)", notNull: true },
    entity_id: { type: "varchar(64)" },
    request_id: { type: "varchar(64)" },
    metadata: { type: "jsonb" },
    created_at: { type: "timestamp", notNull: true, default: pgm.func("NOW()") }
  });

  pgm.createIndex("routes", ["deleted_at", "is_active"]);
  pgm.createIndex("vehicles", ["deleted_at", "status"]);
  pgm.createIndex("schedules", ["route_id", "departure_time"]);
  pgm.createIndex("bookings", ["customer_id", "status"]);
  pgm.createIndex("driver_assignments", ["driver_id", "assignment_status"]);
  pgm.createIndex("audit_logs", ["created_at"]);

  pgm.sql("INSERT INTO roles (name) VALUES ('ADMIN'),('TRANSPORT_MANAGER'),('DRIVER'),('CUSTOMER')");
  for (const permission of permissionRows) {
    pgm.sql(`INSERT INTO permissions (name) VALUES ('${permission}')`);
  }

  pgm.sql(`
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id
    FROM roles r CROSS JOIN permissions p
    WHERE r.name = 'ADMIN'
  `);

  pgm.sql(`
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id
    FROM roles r
    JOIN permissions p ON p.name IN (
      'routes:create','routes:update','routes:delete',
      'vehicles:read','vehicles:create','vehicles:update','vehicles:delete',
      'schedules:read','schedules:create','schedules:update','schedules:delete',
      'driver_assignments:read','driver_assignments:create','driver_assignments:update','driver_assignments:delete',
      'bookings:read','bookings:update_status',
      'admin:analytics:read'
    )
    WHERE r.name = 'TRANSPORT_MANAGER'
  `);

  pgm.sql(`
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id
    FROM roles r
    JOIN permissions p ON p.name IN ('driver_assignments:read','driver_assignments:update','bookings:read')
    WHERE r.name = 'DRIVER'
  `);

  pgm.sql(`
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id
    FROM roles r
    JOIN permissions p ON p.name IN ('bookings:create','bookings:read','bookings:cancel')
    WHERE r.name = 'CUSTOMER'
  `);
};

exports.down = (pgm) => {
  pgm.dropTable("audit_logs");
  pgm.dropTable("driver_assignments");
  pgm.dropTable("bookings");
  pgm.dropTable("schedules");
  pgm.dropTable("routes");
  pgm.dropTable("vehicles");
  pgm.dropTable("role_permissions");
  pgm.dropTable("permissions");
  pgm.dropTable("users");
  pgm.dropTable("roles");
};
