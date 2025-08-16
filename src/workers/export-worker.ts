import { Worker } from 'bullmq';
import IORedis from 'ioredis';

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379');

new Worker('export', async job => {
  // Placeholder: generate exports asynchronously if needed
  // You can read job.data.payload and write files, then notify via SSE/Webhooks
  return true;
}, { connection });