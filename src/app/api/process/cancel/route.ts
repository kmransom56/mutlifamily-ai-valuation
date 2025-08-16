import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { jobId } = await request.json();
    if (!jobId) return NextResponse.json({ error: 'Job ID required' }, { status: 400 });

    const userId = (session.user as any).id || session.user.email || 'anonymous';
    const jobDir = path.join(process.cwd(), 'uploads', jobId);
    const metadataPath = path.join(jobDir, 'job_metadata.json');
    if (!fs.existsSync(metadataPath)) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
    if (metadata.userId !== userId) return NextResponse.json({ error: 'Access denied' }, { status: 403 });

    const pidPath = path.join(jobDir, 'pid');
    if (fs.existsSync(pidPath)) {
      try {
        const pid = parseInt(fs.readFileSync(pidPath, 'utf-8'), 10);
        if (!Number.isNaN(pid)) {
          try { process.kill(pid); } catch {}
          try { fs.unlinkSync(pidPath); } catch {}
        }
      } catch {}
    }

    metadata.status = 'cancelled';
    metadata.failedAt = new Date().toISOString();
    metadata.error = 'Job cancelled by user';
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to cancel job' }, { status: 500 });
  }
}