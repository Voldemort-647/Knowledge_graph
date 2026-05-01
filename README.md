# 🔬 Forensic — AuraDB Knowledge Graph Builder

A visual, AI-powered knowledge graph builder that lets you create, connect, and explore entity relationships using **Neo4j AuraDB** as the graph database. Describe what you want in plain English, and the AI generates Cypher queries to build your graph in real time.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![Neo4j](https://img.shields.io/badge/Neo4j-AuraDB-blue?logo=neo4j)
![React Flow](https://img.shields.io/badge/React_Flow-12-teal)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker)
![License](https://img.shields.io/badge/License-MIT-green)

---

## ✨ Features

- **🤖 NLP → Cypher** — Describe a graph in natural language and AI (via OpenRouter / GPT-4o-mini) converts it into Neo4j Cypher queries
- **🕸️ Interactive Graph Canvas** — Drag, zoom, and pan nodes on a React Flow canvas with animated edges
- **➕ Manual CRUD** — Create nodes and edges manually with custom labels, emojis, and colors
- **🎨 Dark / Light Mode** — Toggle between themes with a polished glassmorphism UI
- **🔍 Focus Mode** — Full-screen graph view for presentations
- **📊 Graph Statistics** — View node counts, edge counts, top-connected entities
- **📤 Import / Export** — Import graph data or export the canvas as an image
- **🔄 Auto-Layout** — Dagre-powered automatic graph layout (LR / TB)
- **💾 Persistent Positions** — Node positions are saved back to AuraDB when you drag them

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 16 (App Router, Turbopack) |
| **Language** | TypeScript 5 |
| **Graph DB** | Neo4j AuraDB |
| **AI** | OpenRouter API (GPT-4o-mini) |
| **Graph UI** | React Flow (@xyflow/react) |
| **Styling** | Tailwind CSS 4 + shadcn/ui + Framer Motion |
| **Layout** | Dagre (@dagrejs/dagre) |
| **Runtime** | Bun (dev) / Node.js 20 (production) |

---

## 📁 Project Structure

```
forensic/
├── docker/                     # Docker configuration
│   ├── Dockerfile.client       # Multi-stage build (Bun → Node)
│   └── docker-compose.yml      # Compose for one-command deployment
├── public/
│   └── logo.svg                # Application logo
├── src/
│   ├── app/
│   │   ├── api/                # Next.js API routes
│   │   │   ├── edges/          # CRUD for graph edges
│   │   │   ├── graph/          # Fetch / clear / import graph
│   │   │   ├── nlp/            # NLP → Cypher endpoint
│   │   │   ├── nodes/          # CRUD for graph nodes
│   │   │   └── stats/          # Graph statistics
│   │   ├── layout.tsx          # Root layout with theme provider
│   │   └── page.tsx            # Main graph workspace UI
│   ├── components/
│   │   ├── graph/              # GraphCanvas, ShareButton, etc.
│   │   └── ui/                 # shadcn/ui components
│   ├── lib/
│   │   ├── graph-store.ts      # Neo4j business logic layer
│   │   ├── layout.ts           # Dagre auto-layout
│   │   └── neo4j.ts            # Neo4j driver singleton
│   └── services/
│       └── api.ts              # Frontend API client
├── .env                        # Environment variables (not committed)
├── package.json
└── next.config.ts
```

---

## 🚀 Getting Started

### Prerequisites

- **Bun** ≥ 1.3 — [Install Bun](https://bun.sh)
- **Node.js** ≥ 20 (only needed for production builds)
- A **Neo4j AuraDB** free instance — [Create one](https://neo4j.com/cloud/aura-free/)
- An **OpenRouter** API key — [Get one](https://openrouter.ai/keys)

### 1. Clone the repository

```bash
git clone https://github.com/Voldemort-647/Knowledge_graph.git
cd Knowledge_graph
```

### 2. Set up environment variables

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Then fill in the values:

```env
# ─── Neo4j AuraDB ────────────────────────────────────
# Get these from your AuraDB instance dashboard
NEO4J_URI=neo4j+s://xxxxxxxx.databases.neo4j.io
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your-auradb-password

# ─── OpenRouter (AI) ─────────────────────────────────
# Get your key at https://openrouter.ai/keys
OPENROUTER_API_KEY=sk-or-v1-your-openrouter-api-key
```

> **⚠️ Important:** Never commit your `.env` file. It is already listed in `.gitignore`.

#### Where to find your AuraDB credentials

1. Go to [Neo4j Aura Console](https://console.neo4j.io/)
2. Create a **Free** instance (or use an existing one)
3. Copy the **Connection URI** (`neo4j+s://...`), **Username**, and **Password**

#### Where to get your OpenRouter API key

1. Go to [OpenRouter Keys](https://openrouter.ai/keys)
2. Create a new key and copy it
3. Make sure you have credits or a free tier model available

### 3. Install dependencies

```bash
bun install
```

### 4. Start the development server

```bash
bun run dev
```

The app will be running at **http://localhost:3000**.

### 5. Build for production (optional)

```bash
bun run build
bun run start
```

---


## 🔌 API Reference

All endpoints are under `/api/`:

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/graph` | Fetch all nodes and edges |
| `DELETE` | `/api/graph/clear` | Delete all nodes and edges |
| `POST` | `/api/graph/import` | Import a graph from JSON |
| `GET` | `/api/nodes` | List all nodes |
| `POST` | `/api/nodes` | Create a new node |
| `PATCH` | `/api/nodes/update` | Update a node |
| `DELETE` | `/api/nodes?id=...` | Delete a node |
| `PATCH` | `/api/nodes/position` | Batch update node positions |
| `POST` | `/api/edges` | Create a new edge |
| `PATCH` | `/api/edges/update` | Update an edge |
| `DELETE` | `/api/edges?id=...` | Delete an edge |
| `POST` | `/api/nlp` | Convert natural language → Cypher and apply |
| `GET` | `/api/stats` | Get graph statistics |

---

## 🧠 How NLP → Cypher Works

1. You type a prompt like: *"Create a network showing Elon Musk founded SpaceX and Tesla"*
2. The backend sends this to **OpenRouter** (GPT-4o-mini) with a system prompt constraining output to safe Cypher
3. The AI returns a Cypher `CREATE` / `MERGE` query targeting `GraphNode` nodes and `RELATES_TO` relationships
4. The query is validated (no `DELETE`, `DROP`, `APOC`, etc.) and executed against **AuraDB**
5. The full graph is re-fetched and rendered with animated edges on the canvas

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m 'Add my feature'`
4. Push to the branch: `git push origin feature/my-feature`
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License.
