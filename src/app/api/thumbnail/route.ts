import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import * as pdfjs from 'pdfjs-dist';

let createCanvas: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  createCanvas = require('canvas').createCanvas;
} catch {
  createCanvas = null;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');
    const file = searchParams.get('file');
    const pageParam = parseInt(searchParams.get('page') || '1', 10);

    if (!jobId || !file) {
      return NextResponse.json({ error: 'jobId and file are required' }, { status: 400 });
    }

    const safeFile = file.replace(/[\/\\]/g, '');
    const ext = path.extname(safeFile).toLowerCase();
    if (ext !== '.pdf') {
      return NextResponse.json({ error: 'Only PDF thumbnails supported' }, { status: 400 });
    }

    const pdfPath = path.join(process.cwd(), 'uploads', jobId, safeFile);
    if (!fs.existsSync(pdfPath)) {
      return NextResponse.json({ error: 'Source file not found' }, { status: 404 });
    }

    const page = Math.max(1, pageParam);
    const thumbsDir = path.join(process.cwd(), 'outputs', jobId, 'thumbnails');
    fs.mkdirSync(thumbsDir, { recursive: true });
    const thumbPath = path.join(thumbsDir, `${safeFile.replace(/\.pdf$/i, '')}-p${page}.png`);

    if (fs.existsSync(thumbPath)) {
      const buf = fs.readFileSync(thumbPath);
      return new NextResponse(buf, {
        status: 200,
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=86400'
        }
      });
    }

    if (!createCanvas) {
      // Return a tiny placeholder PNG if rendering not available
      const placeholder = Buffer.from(
        '89504e470d0a1a0a0000000d4948445200000004000000040806000000f2b8bffa0000000b4944415408d7636000010000050001fdd2f2210000000049454e44ae426082',
        'hex'
      );
      return new NextResponse(placeholder, {
        status: 200,
        headers: { 'Content-Type': 'image/png', 'Cache-Control': 'no-cache' }
      });
    }

    const data = new Uint8Array(fs.readFileSync(pdfPath));
    const loadingTask: any = (pdfjs as any).getDocument({ data });
    const pdf = await loadingTask.promise;
    const pageNum = Math.min(page, pdf.numPages || 1);
    const pdfPage = await pdf.getPage(pageNum);

    const viewport = pdfPage.getViewport({ scale: 1.25 });
    const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
    const ctx = canvas.getContext('2d');

    const renderTask = (pdfPage as any).render({ canvasContext: ctx, viewport });
    if (renderTask && renderTask.promise) {
      await renderTask.promise;
    } else {
      await renderTask;
    }

    const out = canvas.toBuffer('image/png');
    fs.writeFileSync(thumbPath, out);

    return new NextResponse(out, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=86400'
      }
    });
  } catch (e) {
    console.error('Thumbnail generation failed:', e);
    return NextResponse.json({ error: 'Failed to generate thumbnail' }, { status: 500 });
  }
}