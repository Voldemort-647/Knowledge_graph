import { NextRequest, NextResponse } from 'next/server';
import { runNlpCypher, fetchStoredGraph } from '@/lib/graph-store';

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

/**
 * Build a compact text summary of the current graph for AI context.
 * Keeps token count low while giving the model full awareness of
 * existing entities, their positions, and connections.
 */
async function buildGraphContext(): Promise<string> {
  try {
    const { nodes, edges } = await fetchStoredGraph();

    if (nodes.length === 0) {
      return 'The graph is currently empty. No existing nodes or edges.';
    }

    // Build node summary: label, id, and position
    const nodeLines = nodes.map(
      (n) => `  - "${n.label}" (id: ${n.id}, pos: ${n.posX},${n.posY}, color: ${n.color})`
    );

    // Build edge summary: source label → target label with relationship
    const nodeMap = new Map(nodes.map((n) => [n.id, n.label]));
    const edgeLines = edges.map((e) => {
      const srcLabel = nodeMap.get(e.sourceNodeId) || e.sourceNodeId;
      const tgtLabel = nodeMap.get(e.targetNodeId) || e.targetNodeId;
      return `  - "${srcLabel}" --[${e.relationship}]--> "${tgtLabel}"`;
    });

    // Compute occupied position bounds so AI can place new nodes in free space
    const xs = nodes.map((n) => n.posX);
    const ys = nodes.map((n) => n.posY);
    const bounds = `Occupied area: X [${Math.min(...xs)}..${Math.max(...xs)}], Y [${Math.min(...ys)}..${Math.max(...ys)}]`;

    const parts = [
      `Current graph has ${nodes.length} node(s) and ${edges.length} edge(s).`,
      bounds,
      '',
      'Existing nodes:',
      ...nodeLines,
    ];

    if (edgeLines.length > 0) {
      parts.push('', 'Existing edges:', ...edgeLines);
    }

    return parts.join('\n');
  } catch (error) {
    console.error('Failed to fetch graph context:', error);
    return 'Could not retrieve current graph state. Treat as if graph may have existing data.';
  }
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

    // Fetch the current graph state and build context for the AI
    const graphContext = await buildGraphContext();

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
              'You convert natural language graph descriptions into safe Neo4j Cypher for this schema only. Nodes must be labeled GraphNode. Relationships must use RELATES_TO. Every new node must set id, label, color, posX, posY, createdAt, updatedAt, and optional emoji/imageUrl. Every relationship must set id, sourceNodeId, targetNodeId, relationship, edgeType, animated (must be true), lineStyle, thickness, createdAt. Keep graphs readable: space nodes generously on a grid, avoid overlapping positions, and prefer left-to-right or top-to-bottom flows that minimize edge crossings. Never emit DELETE, DROP, REMOVE, APOC, CALL, or LOAD CSV. Return only JSON with a single "cypher" string.\n\nIMPORTANT: You will be given the current state of the graph. Use MERGE on the label property to reuse existing nodes instead of creating duplicates. When adding new nodes, place them in positions that do not overlap with existing nodes (offset by at least 200px). When the user refers to an existing entity, always connect to the existing node rather than creating a new one.',
          },
          {
            role: 'user',
            content: `## Current Graph State\n${graphContext}\n\n## User Request\n${prompt.trim()}\n\nUse MERGE on label to connect to existing nodes. When you need new ids, use randomUUID(). Use ISO timestamps via datetime(). Place new nodes away from occupied positions. Do not include explanations.`,
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
