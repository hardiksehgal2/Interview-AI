/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  console.log('🔥 Next.js API Route (App Router) called');
  
  try {
    const body = await request.json();
    console.log('📡 Received payload:', body);
    
    // Forward to your FastAPI backend
    const response = await fetch('http://127.0.0.1:8000/api/analyze-code', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    console.log('📡 FastAPI Response Status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ FastAPI Error:', errorText);
      return NextResponse.json({ 
        error: 'FastAPI Error', 
        details: errorText 
      }, { status: response.status });
    }

    const result = await response.json();
    console.log('✅ FastAPI Success:', result);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('❌ API Route Error:', error);
    return NextResponse.json({ 
      error: 'Internal Server Error', 
      message: error.message 
    }, { status: 500 });
  }
}