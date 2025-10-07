import { NextResponse } from 'next/server';

export async function GET() {
  // A chave deve estar nas variáveis de ambiente do backend
  const openaiKey = process.env.OPENAI_API_KEY;

  if (!openaiKey) {
    return NextResponse.json(
      { error: 'OpenAI API key not configured' },
      { status: 500 }
    );
  }

  return NextResponse.json({ apiKey: openaiKey });
}
