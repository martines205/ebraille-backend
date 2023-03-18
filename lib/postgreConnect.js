import pg from "pg";
const { Pool } = pg;

const EbrailleDB = new Pool({
  user: "postgres",
  host: "localhost",
  database: "ebraille",
  password: "root",
  port: 5432,
});

export { EbrailleDB };
