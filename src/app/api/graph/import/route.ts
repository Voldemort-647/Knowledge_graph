import { NextRequest, NextResponse } from 'next/server';
import { importGraphStore } from '@/lib/graph-store';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const nodes = Array.isArray(body.nodes) ? body.nodes : [];
    const edges = Array.isArray(body.edges) ? body.edges : [];

    return NextResponse.json(await importGraphStore({ nodes, edges }));
  } catch (error) {
    console.error('Error importing graph:', error);
    return NextResponse.json({ error: 'Failed to import graph' }, { status: 500 });
  }
}
