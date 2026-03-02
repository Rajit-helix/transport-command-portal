const citySeedRows = [
  "Airport",
  "Bengaluru",
  "Bhubaneswar",
  "City Center",
  "Cuttack",
  "Mysuru",
  "Puri",
  "Railway Station",
  "Tech Park"
];

exports.up = (pgm) => {
  pgm.createTable("cities", {
    id: "id",
    name: { type: "varchar(120)", notNull: true, unique: true },
    state: { type: "varchar(80)" },
    country: { type: "varchar(80)", notNull: true, default: "India" },
    is_active: { type: "boolean", notNull: true, default: true },
    created_at: { type: "timestamp", notNull: true, default: pgm.func("NOW()") },
    updated_at: { type: "timestamp", notNull: true, default: pgm.func("NOW()") }
  });

  pgm.createIndex("cities", ["is_active", "name"]);

  for (const city of citySeedRows) {
    pgm.sql(
      `INSERT INTO cities (name)
       VALUES ('${city}')
       ON CONFLICT (name) DO NOTHING`
    );
  }
};

exports.down = (pgm) => {
  pgm.dropTable("cities");
};
