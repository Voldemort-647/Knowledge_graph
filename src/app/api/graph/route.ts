import { NextResponse } from 'next/server';
import { fetchGraphResponse } from '@/lib/graph-store';

export async function GET() {
  try {
    return NextResponse.json(await fetchGraphResponse());
  } catch (error) {
    console.error('Error fetching graph:', error);
    return NextResponse.json({ error: 'Failed to fetch graph' }, { status: 500 });
  }
}
