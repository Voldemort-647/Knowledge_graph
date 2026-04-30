import LZString from 'lz-string';

/**
 * Minimal data needed to reconstruct a graph from a shared URL.
 */
export interface SharedGraphData {
  nodes: Array<{
    label: string;
    color: string;
    imageUrl?: string | null;
    position: { x: number; y: number };
  }>;
  edges: Array<{
    source: string;
    target: string;
    label?: string;
  }>;
}

const HASH_PREFIX = 'shared=';

/**
 * Encode a graph (nodes + edges) into a URL-safe hash string.
 *
 * The format is:  `#shared=<uri_encoded_lz_compressed_base64_json>`
 *
 * We first JSON.stringify the data, then compress with lz-string,
 * then URI-encode so it's safe inside a URL hash fragment.
 */
export function encodeGraphToHash(
  nodes: Array<{
    id: string;
    data: { label: string; color?: string; imageUrl?: string | null };
    position: { x: number; y: number };
  }>,
  edges: Array<{ id: string; source: string; target: string; label?: string }>,
): string {
  const shareData: SharedGraphData = {
    nodes: nodes.map((n) => ({
      label: n.data.label,
      color: n.data.color || '#0d9488',
      imageUrl: n.data.imageUrl ?? null,
      position: {
        x: Math.round(n.position.x),
        y: Math.round(n.position.y),
      },
    })),
    edges: edges.map((e) => ({
      source: e.source,
      target: e.target,
      label: e.label ?? undefined,
    })),
  };

  const json = JSON.stringify(shareData);
  const compressed = LZString.compressToEncodedURIComponent(json);
  return `#${HASH_PREFIX}${compressed}`;
}

/**
 * Decode a URL hash back into graph data.
 *
 * Accepts:
 *   - Full hash string starting with `#shared=`
 *   - Just the value portion (no `#` prefix)
 *
 * Returns `null` if the hash doesn't contain valid shared data.
 */
export function decodeGraphFromHash(hash: string): SharedGraphData | null {
  let raw = hash;

  // Strip leading `#` if present
  if (raw.startsWith('#')) {
    raw = raw.slice(1);
  }

  // Must start with our prefix
  if (!raw.startsWith(HASH_PREFIX)) {
    return null;
  }

  const encoded = raw.slice(HASH_PREFIX.length);
  if (!encoded) {
    return null;
  }

  const json = LZString.decompressFromEncodedURIComponent(encoded);
  if (!json) {
    return null;
  }

  try {
    const data = JSON.parse(json) as SharedGraphData;

    // Basic validation
    if (!Array.isArray(data.nodes) || !Array.isArray(data.edges)) {
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

/**
 * Extract the shareable graph data from the current browser URL hash.
 * Returns `null` if there's no shared graph in the URL.
 */
export function getSharedGraphFromCurrentUrl(): SharedGraphData | null {
  if (typeof window === 'undefined') return null;
  return decodeGraphFromHash(window.location.hash);
}

/**
 * Generate the full shareable URL for the current page with the graph
 * encoded in the hash fragment.
 */
export function generateShareUrl(
  nodes: Array<{
    id: string;
    data: { label: string; color?: string; imageUrl?: string | null };
    position: { x: number; y: number };
  }>,
  edges: Array<{ id: string; source: string; target: string; label?: string }>,
): string {
  const hash = encodeGraphToHash(nodes, edges);
  // Use the current origin + path + the hash
  if (typeof window !== 'undefined') {
    return `${window.location.origin}${window.location.pathname}${hash}`;
  }
  return hash;
}

/**
 * Clean the shared graph hash from the current URL without a full page reload.
 */
export function clearSharedHash(): void {
  if (typeof window !== 'undefined' && window.location.hash) {
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
  }
}
