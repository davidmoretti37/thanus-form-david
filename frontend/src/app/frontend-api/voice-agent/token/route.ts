import { NextResponse } from 'next/server';

export async function GET() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.error('❌ OPENAI_API_KEY not configured');
    return NextResponse.json(
      { error: 'OpenAI API key not configured' },
      { status: 500 }
    );
  }

  try {
    // Generate ephemeral key from OpenAI
    const response = await fetch(
      'https://api.openai.com/v1/realtime/client_secrets',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session: {
            type: 'realtime',
            model: 'gpt-realtime-mini-2025-10-06',
            audio: {
              output: {
                voice: 'shimmer',
              },
            },
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Failed to generate ephemeral key:', errorText);
      return NextResponse.json(
        { error: 'Failed to generate ephemeral key' },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Return ephemeral key (starts with "ek_")
    return NextResponse.json({
      clientSecret: data.value,
      expiresAt: data.expires_at
    });
  } catch (error) {
    console.error('❌ Ephemeral key generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate ephemeral key' },
      { status: 500 }
    );
  }
}
