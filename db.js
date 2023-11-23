const pgPromise = require('pg-promise');
require('dotenv').config();
const pgp = pgPromise({});
const db = pgp(process.env.DATABASE_URL);

module.exports = db;
