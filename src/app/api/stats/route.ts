import { NextResponse } from 'next/server';
import { getGraphStats } from '@/lib/graph-store';

export async function GET() {
  try {
    return NextResponse.json(await getGraphStats());
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json({ error: 'Failed to fetch statistics' }, { status: 500 });
  }
}
