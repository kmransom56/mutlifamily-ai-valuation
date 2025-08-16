const express = require('express');
const { ExpressAdapter } = require('@bull-board/express');
const { createBullBoard } = require('@bull-board/api');
const { BullMQAdapter } = require('@bull-board/api/bullMQAdapter');
const { Queue } = require('bullmq');
const IORedis = require('ioredis');

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379');
const processingQueue = new Queue('processing', { connection });
const exportQueue = new Queue('export', { connection });

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

createBullBoard({
  queues: [new BullMQAdapter(processingQueue), new BullMQAdapter(exportQueue)],
  serverAdapter,
});

const app = express();
app.use('/admin/queues', serverAdapter.getRouter());

const port = process.env.BULL_BOARD_PORT || 9999;
app.listen(port, () => {
  console.log(`Bull Board is running at http://localhost:${port}/admin/queues`);
});