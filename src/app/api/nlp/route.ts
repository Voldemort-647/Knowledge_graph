import { NextRequest, NextResponse } from 'next/server';
import { runNlpCypher } from '@/lib/graph-store';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_MODEL = 'openai/gpt-4o-mini';

function extractCypher(content: string): string {
  const fencedMatch = content.match(/```(?:cypher)?\s*([\s\S]*?)```/i);
  const raw = fencedMatch ? fencedMatch[1] : content;
  const trimmed = raw.trim();

  try {
    const parsed = JSON.parse(trimmed) as { cypher?: string };
    if (parsed.cypher) return parsed.cypher.trim();
  } catch {
    // fall through
  }

  return trimmed;
}

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'OPENROUTER_API_KEY is not configured' }, { status: 500 });
    }

    const completion = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'You convert natural language graph descriptions into safe Neo4j Cypher for this schema only. Nodes must be labeled GraphNode. Relationships must use RELATES_TO. Every new node must set id, label, color, posX, posY, createdAt, updatedAt, and optional emoji/imageUrl. Every relationship must set id, sourceNodeId, targetNodeId, relationship, edgeType, animated (must be true), lineStyle, thickness, createdAt. Keep graphs readable: space nodes generously on a grid, avoid overlapping positions, and prefer left-to-right or top-to-bottom flows that minimize edge crossings. Never emit DELETE, DROP, REMOVE, APOC, CALL, or LOAD CSV. Return only JSON with a single "cypher" string.',
          },
          {
            role: 'user',
            content: `Create or extend the current graph from this request:\n${prompt.trim()}\n\nUse MERGE where appropriate. When you need ids, use randomUUID(). Use ISO timestamps via datetime(). Do not include explanations.`,
          },
        ],
      }),
    });

    const payload = (await completion.json()) as {
      error?: { message?: string };
      choices?: Array<{ message?: { content?: string } }>;
    };

    if (!completion.ok) {
      return NextResponse.json(
        { error: payload.error?.message || 'OpenRouter request failed' },
        { status: completion.status }
      );
    }

    const content = payload.choices?.[0]?.message?.content;
    if (!content) {
      return NextResponse.json({ error: 'Model did not return content' }, { status: 500 });
    }

    const cypher = extractCypher(content);
    return NextResponse.json(await runNlpCypher(cypher));
  } catch (error) {
    console.error('Error generating Cypher:', error);
    const message = error instanceof Error ? error.message : 'Failed to generate Cypher';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
