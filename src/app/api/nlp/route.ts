import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import ZAI from 'z-ai-web-dev-sdk';

const NLP_SYSTEM_PROMPT = `You are a knowledge graph extraction engine. Given a natural language description of relationships, extract entities and relationships into a structured JSON format.

You MUST respond with ONLY valid JSON (no markdown, no code blocks, no explanation). The JSON must follow this exact structure:

{
  "nodes": [
    { "label": "Entity Name", "imageUrl": null }
  ],
  "edges": [
    { "source": "Source Entity Name", "target": "Target Entity Name", "relationship": "relationship_type" }
  ]
}

Rules:
- Extract all entities mentioned as nodes
- Extract all relationships as edges
- Use the exact entity names as written (case-sensitive matching)
- Keep relationship labels short and descriptive (1-3 words)
- Use null for imageUrl if no image is mentioned
- If the input is ambiguous, make reasonable assumptions
- Return valid JSON only, no other text`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt } = body;

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    // Call LLM to extract graph from natural language
    const zai = await ZAI.create();

    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'assistant',
          content: NLP_SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: `Extract the knowledge graph from: "${prompt.trim()}"`,
        },
      ],
      thinking: { type: 'disabled' },
    });

    const rawResponse = completion.choices[0]?.message?.content;

    if (!rawResponse) {
      return NextResponse.json(
        { error: 'No response from AI' },
        { status: 500 }
      );
    }

    // Parse JSON response safely
    let graphData;
    try {
      // Try to extract JSON from the response (handle markdown code blocks)
      let jsonStr = rawResponse.trim();
      const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
      }
      graphData = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('JSON parse error:', parseError, 'Raw response:', rawResponse);
      return NextResponse.json(
        { error: 'Failed to parse AI response as JSON', raw: rawResponse },
        { status: 422 }
      );
    }

    // Validate structure
    if (!graphData.nodes || !Array.isArray(graphData.nodes)) {
      return NextResponse.json(
        { error: 'Invalid graph data: missing nodes array' },
        { status: 422 }
      );
    }

    if (!graphData.edges || !Array.isArray(graphData.edges)) {
      return NextResponse.json(
        { error: 'Invalid graph data: missing edges array' },
        { status: 422 }
      );
    }

    // Create nodes in database (use MERGE-like logic via upsert)
    const nodeMap = new Map<string, string>(); // label -> id

    for (const nodeData of graphData.nodes) {
      if (!nodeData.label || typeof nodeData.label !== 'string') continue;

      // Check if node with this label already exists
      const existing = await db.graphNode.findFirst({
        where: { label: nodeData.label.trim() },
      });

      if (existing) {
        nodeMap.set(nodeData.label.trim(), existing.id);
      } else {
        // Spread new nodes around the center
        const angle = (nodeMap.size / Math.max(graphData.nodes.length, 1)) * Math.PI * 2;
        const radius = 200 + Math.random() * 150;

        const newNode = await db.graphNode.create({
          data: {
            label: nodeData.label.trim(),
            imageUrl: nodeData.imageUrl || null,
            color: getRandomColor(),
            posX: Math.cos(angle) * radius + 400,
            posY: Math.sin(angle) * radius + 300,
          },
        });
        nodeMap.set(nodeData.label.trim(), newNode.id);
      }
    }

    // Create edges
    const createdEdges = [];
    for (const edgeData of graphData.edges) {
      const sourceId = nodeMap.get(edgeData.source?.trim());
      const targetId = nodeMap.get(edgeData.target?.trim());

      if (!sourceId || !targetId) continue;
      if (sourceId === targetId) continue; // Skip self-loops

      const sanitizedRel = (edgeData.relationship || 'related_to')
        .trim()
        .replace(/[^a-zA-Z0-9_\- ]/g, '')
        .substring(0, 50);

      if (!sanitizedRel) continue;

      // Check for duplicate
      const existingEdge = await db.graphEdge.findFirst({
        where: {
          sourceNodeId: sourceId,
          targetNodeId: targetId,
          relationship: sanitizedRel,
        },
      });

      if (!existingEdge) {
        const edge = await db.graphEdge.create({
          data: {
            relationship: sanitizedRel,
            sourceNodeId: sourceId,
            targetNodeId: targetId,
          },
        });
        createdEdges.push(edge);
      }
    }

    // Return the complete updated graph
    const allNodes = await db.graphNode.findMany({
      orderBy: { createdAt: 'asc' },
    });

    const allEdges = await db.graphEdge.findMany({
      include: {
        sourceNode: true,
        targetNode: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const reactFlowNodes = allNodes.map((node) => ({
      id: node.id,
      type: 'customNode',
      position: { x: node.posX, y: node.posY },
      data: {
        label: node.label,
        imageUrl: node.imageUrl,
        color: node.color,
      },
    }));

    const reactFlowEdges = allEdges.map((edge) => ({
      id: edge.id,
      source: edge.sourceNodeId,
      target: edge.targetNodeId,
      label: edge.relationship,
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#0d9488', strokeWidth: 2 },
      labelStyle: { fill: '#0d9488', fontSize: 12, fontWeight: 600 },
      labelBgStyle: { fill: '#ffffff', fillOpacity: 0.9 },
      labelBgPadding: [8, 4] as [number, number],
      labelBgBorderRadius: 4,
    }));

    return NextResponse.json({
      success: true,
      message: `Created ${graphData.nodes.length} nodes and ${createdEdges.length} edges`,
      nodes: reactFlowNodes,
      edges: reactFlowEdges,
    });
  } catch (error) {
    console.error('NLP processing error:', error);
    return NextResponse.json(
      { error: 'Failed to process natural language input' },
      { status: 500 }
    );
  }
}

// Generate colors for new nodes
const NODE_COLORS = [
  '#0d9488', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316',
  '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#a855f7',
  '#ef4444', '#d946ef', '#f472b6', '#84cc16', '#fdba74',
  '#fde047', '#86efac', '#5eead4', '#67e8f9', '#fb923c',
];

function getRandomColor(): string {
  return NODE_COLORS[Math.floor(Math.random() * NODE_COLORS.length)];
}
