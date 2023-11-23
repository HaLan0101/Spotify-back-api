const redis = require('redis');
require('dotenv').config();
const client = redis.createClient(process.env.REDIS_URL);

module.exports = client;
