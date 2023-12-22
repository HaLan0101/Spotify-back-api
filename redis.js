const {createClient} = require('redis');
const dotenv = require('dotenv');
dotenv.config();

const client = createClient({
  url: process.env.REDIS_URL,
});
client.on('connect', function () {
  console.log('Connected to Redis!');
});

client.on('error', error => {
  console.log('REDIS ERROR', error);
});

module.exports = client;
