import {createClient} from 'redis';
import dotenv from 'dotenv';

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

export default client;
