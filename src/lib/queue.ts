import { Queue, Worker, JobsOptions } from 'bullmq';
import IORedis from 'ioredis';

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379');

export const processingQueue = new Queue('processing', { connection });
export const exportQueue = new Queue('export', { connection });

export type ProcessingJobData = {
  jobId: string;
  userId: string;
  args: { cmd: string; cwd: string; args: string[] };
};

export type ExportJobData = {
  jobId: string;
  userId: string;
  payload: any;
};

export async function enqueueProcessing(data: ProcessingJobData, opts: JobsOptions = {}) {
  return processingQueue.add('process', data, { removeOnComplete: 100, removeOnFail: 100, ...opts });
}

export async function enqueueExport(data: ExportJobData, opts: JobsOptions = {}) {
  return exportQueue.add('export', data, { removeOnComplete: 100, removeOnFail: 100, ...opts });
}