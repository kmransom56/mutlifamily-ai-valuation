import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;
    const decodedFilename = decodeURIComponent(filename);
    
    // Security validation
    if (decodedFilename.includes('..') || decodedFilename.includes('/') || decodedFilename.includes('\\')) {
      return NextResponse.json(
        { error: 'Invalid filename' },
        { status: 400 }
      );
    }

<<<<<<< HEAD
    const filePath = path.join(process.cwd(), '..', '..', '..', 'output', 'pitch_decks', decodedFilename);
=======
    const filePath = path.join(process.cwd(), 'storage', 'exports', decodedFilename);
>>>>>>> 7729ef7fd006f35818317aff5db096f8429d4db3

    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    const fileBuffer = fs.readFileSync(filePath);
    
    // Determine content type based on file extension
    let contentType = 'application/octet-stream';
    if (decodedFilename.endsWith('.json')) {
      contentType = 'application/json';
    } else if (decodedFilename.endsWith('.pptx')) {
      contentType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    } else if (decodedFilename.endsWith('.xlsx')) {
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    } else if (decodedFilename.endsWith('.pdf')) {
      contentType = 'application/pdf';
    }
    
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
<<<<<<< HEAD
        'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
=======
        'Content-Type': contentType,
>>>>>>> 7729ef7fd006f35818317aff5db096f8429d4db3
        'Content-Disposition': `attachment; filename="${decodedFilename}"`,
        'Content-Length': fileBuffer.length.toString(),
      },
    });

  } catch (error) {
    console.error('File download error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
