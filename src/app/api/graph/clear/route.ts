import { NextResponse } from 'next/server';
import { clearGraphStore } from '@/lib/graph-store';

export async function DELETE() {
  try {
    await clearGraphStore();
    return NextResponse.json({ success: true, message: 'Graph cleared' });
  } catch (error) {
    console.error('Error clearing graph:', error);
    return NextResponse.json({ error: 'Failed to clear graph' }, { status: 500 });
  }
}
