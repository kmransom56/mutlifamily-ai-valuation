import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userId = (session.user as any).id || session.user.email || 'anonymous';
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) return NextResponse.json({ jobs: [] });

    const jobs: any[] = [];
    const jobIds = fs.readdirSync(uploadsDir).filter((d) => fs.existsSync(path.join(uploadsDir, d, 'job_metadata.json')));
    for (const id of jobIds) {
      try {
        const metadata = JSON.parse(fs.readFileSync(path.join(uploadsDir, id, 'job_metadata.json'), 'utf-8'));
        if (metadata.userId === userId) jobs.push(metadata);
      } catch {}
    }

    return NextResponse.json({ jobs });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to list jobs' }, { status: 500 });
  }
}