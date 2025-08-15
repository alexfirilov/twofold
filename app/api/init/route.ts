// API route for initializing the application
import { NextResponse } from 'next/server';
import { initializeApp } from '../../lib/startup';

export async function POST() {
  try {
    await initializeApp();
    return NextResponse.json({ success: true, message: 'Application initialized successfully' });
  } catch (error) {
    console.error('Initialization failed:', error);
    return NextResponse.json(
      { success: false, error: 'Initialization failed' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    await initializeApp();
    return NextResponse.json({ success: true, message: 'Application initialized successfully' });
  } catch (error) {
    console.error('Initialization failed:', error);
    return NextResponse.json(
      { success: false, error: 'Initialization failed' },
      { status: 500 }
    );
  }
}