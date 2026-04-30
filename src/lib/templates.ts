/* ─── Graph Templates ─── */

export interface TemplateNode {
  label: string;
  color: string;
  position: { x: number; y: number };
}

export interface TemplateEdge {
  source: string;
  target: string;
  label: string;
}

export interface GraphTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  accentColor: string;
  nodes: TemplateNode[];
  edges: TemplateEdge[];
}

export const GRAPH_TEMPLATES: GraphTemplate[] = [
  {
    id: 'tech-stack',
    name: 'Tech Stack',
    description: 'Modern web development technology relationships',
    icon: '💻',
    accentColor: '#0d9488',
    nodes: [
      { label: 'React', color: '#0d9488', position: { x: 0, y: 0 } },
      { label: 'Next.js', color: '#0d9488', position: { x: 250, y: -80 } },
      { label: 'Vercel', color: '#0d9488', position: { x: 500, y: -80 } },
      { label: 'TypeScript', color: '#0d9488', position: { x: 250, y: 80 } },
      { label: 'Node.js', color: '#059669', position: { x: 500, y: 80 } },
      { label: 'Express', color: '#059669', position: { x: 750, y: 80 } },
    ],
    edges: [
      { source: 'React', target: 'Next.js', label: 'built_on' },
      { source: 'Next.js', target: 'Vercel', label: 'deployed_on' },
      { source: 'TypeScript', target: 'Next.js', label: 'powers' },
      { source: 'TypeScript', target: 'React', label: 'typed_with' },
      { source: 'Node.js', target: 'Express', label: 'runs' },
    ],
  },
  {
    id: 'company-org',
    name: 'Company Org',
    description: 'Corporate organizational hierarchy',
    icon: '🏢',
    accentColor: '#d97706',
    nodes: [
      { label: 'CEO', color: '#d97706', position: { x: 300, y: 0 } },
      { label: 'CTO', color: '#d97706', position: { x: 100, y: 150 } },
      { label: 'CFO', color: '#d97706', position: { x: 500, y: 150 } },
      { label: 'Lead Dev', color: '#ea580c', position: { x: 0, y: 300 } },
      { label: 'Lead Design', color: '#ea580c', position: { x: 200, y: 300 } },
      { label: 'Engineer', color: '#dc2626', position: { x: 0, y: 450 } },
      { label: 'Designer', color: '#dc2626', position: { x: 200, y: 450 } },
    ],
    edges: [
      { source: 'CEO', target: 'CTO', label: 'manages' },
      { source: 'CEO', target: 'CFO', label: 'manages' },
      { source: 'CTO', target: 'Lead Dev', label: 'leads' },
      { source: 'CTO', target: 'Lead Design', label: 'leads' },
      { source: 'Lead Dev', target: 'Engineer', label: 'mentors' },
      { source: 'Lead Design', target: 'Designer', label: 'mentors' },
    ],
  },
  {
    id: 'solar-system',
    name: 'Solar System',
    description: 'Planetary system with orbital relationships',
    icon: '🌍',
    accentColor: '#dc2626',
    nodes: [
      { label: 'Sun', color: '#d97706', position: { x: 300, y: 250 } },
      { label: 'Mercury', color: '#9ca3af', position: { x: 100, y: 100 } },
      { label: 'Venus', color: '#ea580c', position: { x: 250, y: 50 } },
      { label: 'Earth', color: '#0d9488', position: { x: 400, y: 100 } },
      { label: 'Mars', color: '#dc2626', position: { x: 530, y: 180 } },
      { label: 'Moon', color: '#6b7280', position: { x: 550, y: 50 } },
    ],
    edges: [
      { source: 'Sun', target: 'Mercury', label: 'orbits' },
      { source: 'Sun', target: 'Venus', label: 'orbits' },
      { source: 'Sun', target: 'Earth', label: 'orbits' },
      { source: 'Sun', target: 'Mars', label: 'orbits' },
      { source: 'Earth', target: 'Moon', label: 'has_moon' },
    ],
  },
  {
    id: 'data-science',
    name: 'Data Science',
    description: 'Machine learning and data analysis ecosystem',
    icon: '🧠',
    accentColor: '#059669',
    nodes: [
      { label: 'Python', color: '#059669', position: { x: 0, y: 0 } },
      { label: 'Pandas', color: '#059669', position: { x: 300, y: -80 } },
      { label: 'TensorFlow', color: '#dc2626', position: { x: 300, y: 80 } },
      { label: 'Neural Networks', color: '#d97706', position: { x: 600, y: 0 } },
      { label: 'Data Analysis', color: '#ea580c', position: { x: 550, y: -120 } },
      { label: 'Scikit-learn', color: '#0d9488', position: { x: 550, y: 120 } },
    ],
    edges: [
      { source: 'Python', target: 'Pandas', label: 'powers' },
      { source: 'Python', target: 'TensorFlow', label: 'powers' },
      { source: 'TensorFlow', target: 'Neural Networks', label: 'builds' },
      { source: 'Pandas', target: 'Data Analysis', label: 'enables' },
      { source: 'Python', target: 'Scikit-learn', label: 'supports' },
    ],
  },
];
