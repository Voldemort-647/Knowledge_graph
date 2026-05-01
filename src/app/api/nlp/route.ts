import { NextRequest, NextResponse } from 'next/server';
import { runNlpCypher, fetchStoredGraph } from '@/lib/graph-store';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Primary model + fallbacks if rate-limited
const MODELS = [
  'openrouter/free',
  'nvidia/nemotron-3-super-120b-a12b:free',
];

const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 2000; // 2s, 4s, 8s

/* ─── Cypher extractor ────────────────────────────────────── */

function extractCypher(content: string): string {
  // Try fenced code block first
  const fenced = content.match(/```(?:cypher|json)?\s*([\s\S]*?)```/i);
  if (fenced) {
    const inner = fenced[1].trim();
    try {
      const parsed = JSON.parse(inner) as { cypher?: string };
      if (parsed.cypher) return parsed.cypher.trim();
    } catch {
      return inner;
    }
  }

  // Try raw JSON
  const trimmed = content.trim();
  try {
    const parsed = JSON.parse(trimmed) as { cypher?: string };
    if (parsed.cypher) return parsed.cypher.trim();
  } catch {
    // fall through
  }

  // Try to extract JSON from mixed content
  const jsonMatch = trimmed.match(/\{[\s\S]*"cypher"\s*:\s*"[\s\S]*"\s*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]) as { cypher?: string };
      if (parsed.cypher) return parsed.cypher.trim();
    } catch {
      // fall through
    }
  }

  return trimmed;
}

/* ─── Graph context builder ───────────────────────────────── */

async function buildGraphContext(): Promise<string> {
  try {
    const { nodes, edges } = await fetchStoredGraph();

    if (nodes.length === 0) {
      return 'GRAPH IS EMPTY. No nodes or edges exist. Create everything fresh.';
    }

    const nodeMap = new Map(nodes.map((n) => [n.id, n.label]));

    const nodeLines = nodes.map(
      (n) => `NODE: id="${n.id}" label="${n.label}" pos=(${n.posX},${n.posY}) color="${n.color}"`
    );

    const edgeLines = edges.map((e) => {
      const src = nodeMap.get(e.sourceNodeId) || '?';
      const tgt = nodeMap.get(e.targetNodeId) || '?';
      return `EDGE: "${src}" --[${e.relationship}]--> "${tgt}"`;
    });

    const xs = nodes.map((n) => n.posX);
    const ys = nodes.map((n) => n.posY);
    const maxX = Math.max(...xs);
    const maxY = Math.max(...ys);

    const lines = [
      `${nodes.length} nodes, ${edges.length} edges.`,
      `Labels: ${nodes.map((n) => `"${n.label}"`).join(', ')}`,
      `Occupied area: X=[${Math.min(...xs)}..${maxX}], Y=[${Math.min(...ys)}..${maxY}]`,
      `Place new nodes starting at posX=${maxX + 250}, posY=100, spacing 200px apart.`,
      '',
      ...nodeLines,
    ];

    if (edgeLines.length > 0) {
      lines.push('', ...edgeLines);
    }

    return lines.join('\n');
  } catch (err) {
    console.error('buildGraphContext failed:', err);
    return 'Could not fetch graph state. Use MERGE on label to avoid duplicates.';
  }
}

/* ─── System prompt (kept concise for free-tier token limits) */

const SYSTEM_PROMPT = `You generate Neo4j Cypher queries. Follow these rules EXACTLY:

SCHEMA:
- Nodes: label GraphNode. Properties: id, label, color, posX, posY, createdAt, updatedAt, emoji (optional), imageUrl (optional).
- Edges: type RELATES_TO. Properties: id, sourceNodeId, targetNodeId, relationship, edgeType, animated, lineStyle, thickness, createdAt.

RULES FOR EXISTING NODES:
- You receive the current graph state. BEFORE creating anything, check if the entity already exists.
- If a node with the same or similar label exists, MATCH it by id: MATCH (x:GraphNode {id: "existing-id-here"})
- NEVER create a duplicate of an existing node.
- Only CREATE nodes for entities NOT in the graph state.

RULES FOR NEW NODES:
- Use CREATE (n:GraphNode {id: randomUUID(), label: "Name", color: "#0d9488", posX: 500, posY: 100, createdAt: datetime(), updatedAt: datetime()})
- Place new nodes at least 200px from existing nodes.

RULES FOR RELATIONSHIPS:
- Use CREATE then SET. Example:
  CREATE (a)-[r:RELATES_TO]->(b) SET r.id = randomUUID(), r.sourceNodeId = a.id, r.targetNodeId = b.id, r.relationship = "founded", r.edgeType = "smoothstep", r.animated = true, r.lineStyle = "dashed", r.thickness = 2, r.createdAt = datetime()
- NEVER put properties inside brackets like [:RELATES_TO {id: ...}].
- NEVER use MERGE for relationships.

FORBIDDEN: DELETE, DROP, REMOVE, APOC, CALL, LOAD CSV.

OUTPUT: Return ONLY valid JSON: {"cypher": "YOUR CYPHER HERE"}. No markdown, no explanation.`;

/* ─── POST handler ────────────────────────────────────────── */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const prompt = body?.prompt;

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'OPENROUTER_API_KEY is not configured' }, { status: 500 });
    }

    // Build graph context
    const graphContext = await buildGraphContext();

    // Build the base request payload
    const requestBody = {
      model: MODELS[0],
      temperature: 0.1,
      max_tokens: 4096,
      messages: [
        {
          role: 'system' as const,
          content: SYSTEM_PROMPT,
        },
        {
          role: 'user' as const,
          content: `CURRENT GRAPH:\n${graphContext}\n\nREQUEST: ${prompt.trim()}\n\nIMPORTANT: Check every entity against the existing nodes above. Use MATCH by id for existing ones. Only CREATE truly new entities. Return {"cypher": "..."}`,
        },
      ],
    };

    let rawText = '';
    let responseOk = false;
    let lastStatus = 500;

    // Retry loop
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      for (const model of MODELS) {
        requestBody.model = model;
        console.log(`[NLP] Attempt ${attempt + 1}: Sending request to ${model}...`);

        try {
          const response = await fetch(OPENROUTER_URL, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
              'HTTP-Referer': 'http://localhost:3000',
            },
            body: JSON.stringify(requestBody),
          });

          lastStatus = response.status;
          rawText = await response.text();

          if (response.ok) {
            console.log(`[NLP] ${model} succeeded.`);
            responseOk = true;
            break; // Break out of model loop
          }

          console.error(`[NLP] ${model} failed with status: ${response.status}`);

          if (response.status !== 429) {
            console.error(`[NLP] Non-rate-limit error:`, rawText.slice(0, 300));
            // For 400 bad request, we probably don't want to retry next model
            if (response.status === 400) {
              break;
            }
          }
        } catch (e) {
          console.error(`[NLP] Fetch error for ${model}:`, e);
        }
      }

      if (responseOk) {
        break; // Break out of retry loop
      }

      if (attempt < MAX_RETRIES - 1) {
        const delayMs = RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
        console.log(`[NLP] All models failed. Retrying in ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    if (!responseOk) {
      console.error('[NLP] All retries and fallbacks exhausted.');
      let errorMessage = `OpenRouter request failed (${lastStatus})`;
      try {
        const errPayload = JSON.parse(rawText) as { error?: { message?: string } };
        if (errPayload.error?.message) {
          errorMessage = errPayload.error.message;
        }
      } catch {
        // use default
      }
      return NextResponse.json({ error: errorMessage }, { status: lastStatus });
    }

    let payload: { choices?: Array<{ message?: { content?: string } }> };
    try {
      payload = JSON.parse(rawText);
    } catch {
      console.error('[NLP] Failed to parse response JSON:', rawText.slice(0, 300));
      return NextResponse.json({ error: 'Invalid JSON from OpenRouter' }, { status: 500 });
    }

    const content = payload.choices?.[0]?.message?.content;
    if (!content) {
      console.error('[NLP] No content in response:', rawText.slice(0, 300));
      return NextResponse.json({ error: 'Model returned empty content' }, { status: 500 });
    }

    console.log('[NLP] Model response:', content.slice(0, 300));

    const cypher = extractCypher(content);
    console.log('[NLP] Extracted Cypher:', cypher.slice(0, 300));

    return NextResponse.json(await runNlpCypher(cypher));
  } catch (error) {
    console.error('[NLP] Unhandled error:', error);
    const message = error instanceof Error ? error.message : 'Failed to generate Cypher';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
