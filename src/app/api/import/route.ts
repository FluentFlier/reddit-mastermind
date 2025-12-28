import { NextRequest, NextResponse } from 'next/server';
import pdfParse from 'pdf-parse';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const pdf = await pdfParse(buffer);
    const text = pdf.text || '';

    if (!text.trim()) {
      return NextResponse.json({ success: false, error: 'PDF has no extractable text' }, { status: 400 });
    }

    const data = extractFromText(text);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Import failed',
    }, { status: 500 });
  }
}

function extractFromText(text: string) {
  const subreddits = Array.from(new Set(text.match(/r\/[A-Za-z0-9_]+/g) || []))
    .map((name) => ({ name, description: '' }));

  const urlMatch = text.match(/https?:\/\/[^\s)]+/i) || text.match(/\b[a-z0-9.-]+\.[a-z]{2,}\b/i);
  const website = urlMatch ? String(urlMatch[0]).replace(/[),.]+$/, '') : '';

  const nameMatch = text.match(/\bSlideforge\b/i);
  const company = nameMatch
    ? { name: 'Slideforge', description: '', positioning: '', website }
    : website
      ? { name: website.split('.')[0], description: '', positioning: '', website }
      : null;

  return {
    company,
    personas: [],
    subreddits,
    keywords: [],
    extractedText: text.slice(0, 4000),
  };
}
