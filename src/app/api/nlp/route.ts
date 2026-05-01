import { NextRequest, NextResponse } from 'next/server';
import { runNlpCypher, fetchStoredGraph } from '@/lib/graph-store';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_MODEL = 'google/gemma-4-26b-a4b-it:free';

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
 * Build a detailed context of the current graph for the AI model.
 * Provides exact node IDs, labels, positions, and relationships so
 * the model can MATCH existing nodes by id instead of creating duplicates.
 */
async function buildGraphContext(): Promise<string> {
  try {
    const { nodes, edges } = await fetchStoredGraph();

    if (nodes.length === 0) {
      return 'GRAPH STATE: The graph is currently EMPTY. There are zero nodes and zero edges. You may freely CREATE all new nodes.';
    }

    const nodeMap = new Map(nodes.map((n) => [n.id, n.label]));

    // List every node with its exact id so the model can MATCH by id
    const nodeLines = nodes.map(
      (n) => `  NODE id="${n.id}" label="${n.label}" pos=(${n.posX},${n.posY}) color="${n.color}"`
    );

    // List every edge with source/target labels and ids
    const edgeLines = edges.map((e) => {
      const srcLabel = nodeMap.get(e.sourceNodeId) || '?';
      const tgtLabel = nodeMap.get(e.targetNodeId) || '?';
      return `  EDGE "${srcLabel}"(${e.sourceNodeId}) --[${e.relationship}]--> "${tgtLabel}"(${e.targetNodeId})`;
    });

    // Provide occupied positions so new nodes avoid overlap
    const xs = nodes.map((n) => n.posX);
    const ys = nodes.map((n) => n.posY);
    const maxX = Math.max(...xs);
    const maxY = Math.max(...ys);

    // Build a lookup table the model can reference
    const labelList = nodes.map((n) => `"${n.label}"`).join(', ');

    const parts = [
      `GRAPH STATE: ${nodes.length} node(s), ${edges.length} edge(s).`,
      `ALL EXISTING LABELS: [${labelList}]`,
      `Occupied area: X=[${Math.min(...xs)}..${maxX}], Y=[${Math.min(...ys)}..${maxY}]`,
      `Suggested position for new nodes: start at posX=${maxX + 250}, posY=${maxY + 250} and offset each new node by 200.`,
      '',
      'ALL EXISTING NODES (use MATCH by id for these):',
      ...nodeLines,
    ];

    if (edgeLines.length > 0) {
      parts.push('', 'ALL EXISTING EDGES:', ...edgeLines);
    }

    return parts.join('\n');
  } catch (error) {
    console.error('Failed to fetch graph context:', error);
    return 'GRAPH STATE: Could not retrieve. Assume the graph may already contain nodes. Use MERGE on label to avoid duplicates.';
  }
}

const SYSTEM_PROMPT = `You are a Neo4j Cypher generator. You MUST follow these rules strictly:

SCHEMA RULES:
- All nodes use label :GraphNode
- All relationships use type :RELATES_TO
- New nodes MUST set: id (use randomUUID()), label, color, posX, posY, createdAt (use datetime()), updatedAt (use datetime()), and optionally emoji and imageUrl

RELATIONSHIP SYNTAX — CRITICAL:
- ALWAYS use CREATE for relationships, NEVER use MERGE for relationships
- Relationships MUST use this exact syntax pattern:
  CREATE (a)-[r:RELATES_TO]->(b) SET r.id = randomUUID(), r.sourceNodeId = a.id, r.targetNodeId = b.id, r.relationship = "label here", r.edgeType = "smoothstep", r.animated = true, r.lineStyle = "dashed", r.thickness = 2, r.createdAt = datetime()
- NEVER put properties inside the relationship brackets like [:RELATES_TO {id: ...}] — this causes syntax errors
- ALWAYS set relationship properties using SET after the CREATE pattern

EXISTING NODE RULES:
You will receive the COMPLETE current graph state listing every existing node with its exact id and label, and every existing edge.

BEFORE generating any Cypher, you MUST:
1. READ the entire list of existing nodes and their labels
2. For EVERY entity the user mentions, CHECK if a node with that label (or a semantically equivalent label) ALREADY EXISTS in the graph state
3. If an existing node matches → use MATCH (n:GraphNode {id: "<exact-id-from-graph-state>"}) to reference it. NEVER create a new node for an entity that already exists.
4. ONLY use CREATE for entities that have NO matching node in the graph state
5. For new nodes, place them at positions that do NOT overlap with existing nodes (offset by at least 200px from all occupied positions)

NODE MERGE RULE: If you are unsure whether a node exists, use MERGE on the label property: MERGE (n:GraphNode {label: "<label>"}) ON CREATE SET n.id = randomUUID(), ...

FORBIDDEN OPERATIONS: DELETE, DETACH DELETE, DROP, REMOVE, CALL, APOC, LOAD CSV — never use these.

OUTPUT: Return ONLY a JSON object with a single key "cypher" containing the Cypher query string. No explanations, no markdown.`;

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
        temperature: 0.1,
        messages: [
          {
            role: 'system',
            content: SYSTEM_PROMPT,
          },
          {
            role: 'user',
            content: [
              '=== CURRENT GRAPH STATE (READ THIS CAREFULLY) ===',
              graphContext,
              '',
              '=== USER REQUEST ===',
              prompt.trim(),
              '',
              '=== INSTRUCTIONS ===',
              'Step 1: Check every entity in the user request against ALL EXISTING NODES listed above.',
              'Step 2: For each entity that ALREADY EXISTS, use MATCH (n:GraphNode {id: "<exact-id>"}) — do NOT create a duplicate.',
              'Step 3: For each entity that does NOT exist, use CREATE with a new randomUUID() id and a position offset from occupied areas.',
              'Step 4: Create the requested RELATES_TO relationships between matched/created nodes.',
              'IMPORTANT: Creating a duplicate node for an existing entity is an ERROR. Always reuse existing nodes by their id.',
            ].join('\n'),
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
