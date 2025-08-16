import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import fs from 'fs';
import path from 'path';
import { enqueueProcessing } from '@/lib/queue';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { jobId } = await request.json();
    if (!jobId) return NextResponse.json({ error: 'Job ID required' }, { status: 400 });

    const uploadsDir = path.join(process.cwd(), 'uploads', jobId);
    const metadataPath = path.join(uploadsDir, 'job_metadata.json');
    if (!fs.existsSync(metadataPath)) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

    const meta = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
    const userId = (session.user as any).id || session.user.email || 'anonymous';
    if (meta.userId !== userId) return NextResponse.json({ error: 'Access denied' }, { status: 403 });

    // Build spawn args from existing files
    const aiProcessingDir = path.join(process.cwd(), 'ai_processing');
    const mainScript = path.join(aiProcessingDir, 'src', 'main.py');
    const venvPythonUnix = path.join(aiProcessingDir, 'venv', 'bin', 'python3');
    const venvPythonWin = path.join(aiProcessingDir, 'venv', 'Scripts', 'python.exe');
    let pythonCmd = 'python3';
    if (fs.existsSync(venvPythonUnix)) pythonCmd = venvPythonUnix; else if (fs.existsSync(venvPythonWin)) pythonCmd = venvPythonWin;

    const outputDir = path.join(process.cwd(), 'outputs', jobId);
    fs.mkdirSync(outputDir, { recursive: true });

    const files = meta.files || [];
    const args: string[] = [
      mainScript,
      '--output-dir', outputDir,
      '--job-id', jobId
    ];
    const paths = {
      rent_roll: files.find((f: any) => f.type === 'rent_roll')?.path,
      t12: files.find((f: any) => f.type === 't12')?.path,
      offering_memo: files.find((f: any) => f.type === 'offering_memo')?.path,
      template: files.find((f: any) => f.type === 'template')?.path
    };
    if (paths.rent_roll) args.push('--rent-roll', paths.rent_roll);
    if (paths.t12) args.push('--t12', paths.t12);
    if (paths.offering_memo) args.push('--om', paths.offering_memo);
    if (paths.template) args.push('--template', paths.template);

    if (process.env.REDIS_URL) {
      await enqueueProcessing({ jobId, userId, args: { cmd: pythonCmd, cwd: aiProcessingDir, args } });
    } else {
      // No queue: immediate 202, the regular POST /api/process path handles non-queued
    }

    // Reset metadata status to processing
    meta.status = 'processing';
    meta.progress = 0;
    meta.failedAt = undefined;
    meta.error = undefined;
    fs.writeFileSync(metadataPath, JSON.stringify(meta, null, 2));

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: 'Retry failed' }, { status: 500 });
  }
}