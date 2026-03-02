exports.up = (pgm) => {
  pgm.sql(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_cities_name_lower_unique
    ON cities (LOWER(name));
  `);
};

exports.down = (pgm) => {
  pgm.sql("DROP INDEX IF EXISTS idx_cities_name_lower_unique;");
};
