import { PrismaClient } from '@prisma/client';

let prisma: PrismaClient | null = null;
export function getPrisma() {
  if (!process.env.DATABASE_URL) return null;
  if (!prisma) prisma = new PrismaClient();
  return prisma;
}

export async function recordJobStart(data: {
  jobId: string;
  userId: string;
  status: string;
  progress?: number;
  propertyId?: string;
  files?: Array<{ name: string; originalName: string; type: string; mimeType: string; size: number; path: string; uploadedAt: string }>;
}) {
  const db = getPrisma();
  if (!db) return;
  const job = await db.jobRecord.upsert({
    where: { jobId: data.jobId },
    create: {
      jobId: data.jobId,
      userId: data.userId,
      status: data.status,
      progress: data.progress ?? 0,
      propertyId: data.propertyId,
      startedAt: new Date(),
      files: {
        create: (data.files || []).map(f => ({
          name: f.name,
          originalName: f.originalName,
          type: f.type,
          mimeType: f.mimeType,
          size: f.size,
          path: f.path,
          uploadedAt: new Date(f.uploadedAt)
        }))
      }
    },
    update: {
      status: data.status,
      progress: data.progress ?? 0,
      startedAt: new Date()
    }
  });
  return job;
}

export async function recordJobProgress(jobId: string, progress: number) {
  const db = getPrisma();
  if (!db) return;
  await db.jobRecord.update({ where: { jobId }, data: { progress } });
}

export async function recordJobComplete(jobId: string) {
  const db = getPrisma();
  if (!db) return;
  await db.jobRecord.update({ where: { jobId }, data: { status: 'completed', progress: 100, completedAt: new Date() } });
}

export async function recordJobFailed(jobId: string, error: string) {
  const db = getPrisma();
  if (!db) return;
  await db.jobRecord.update({ where: { jobId }, data: { status: 'failed', error, failedAt: new Date() } });
}