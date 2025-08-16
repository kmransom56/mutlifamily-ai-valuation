import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { sseSendProgressUpdate, sseSendJobComplete, sseSendError } from '@/lib/sse-manager';

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379');

new Worker('processing', async job => {
  const { jobId, userId, args } = job.data as { jobId: string; userId: string; args: { cmd: string; cwd: string; args: string[] } };

  try {
    const child = spawn(args.cmd, args.args, { cwd: args.cwd });

    child.stdout.on('data', (data: Buffer) => {
      const text = data.toString();
      const match = text.match(/PROGRESS:\s*(\d{1,3})\s*(.*)/i);
      if (match) {
        const pct = Math.min(100, Math.max(0, parseInt(match[1], 10)));
        const msg = match[2] || 'Processing';
        sseSendProgressUpdate(jobId, userId, pct, msg);
      }
    });

    await new Promise<void>((resolve, reject) => {
      child.on('error', reject);
      child.on('close', code => {
        if (code === 0) resolve(); else reject(new Error(`Exited ${code}`));
      });
    });

    const outputDir = path.join(process.cwd(), 'outputs', jobId);
    const downloadUrls: Record<string, string> = {};
    if (fs.existsSync(outputDir)) {
      const files = fs.readdirSync(outputDir);
      files.forEach(file => {
        if (/[.](json|pdf|xlsx|pptx)$/.test(file)) {
          const key = file.replace(/\.[^/.]+$/, '');
          downloadUrls[key] = `/api/files?jobId=${jobId}&file=${encodeURIComponent(file)}`;
        }
      });
    }
    sseSendJobComplete(jobId, userId, {
      jobId,
      status: 'completed',
      message: 'Processing complete',
      downloadUrls,
      timestamp: new Date().toISOString()
    });
  } catch (e: any) {
    sseSendError(jobId, userId, e?.message || 'Processing failed');
    throw e;
  }
}, { connection });