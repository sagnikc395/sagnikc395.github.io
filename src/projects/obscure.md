---
title: Obscure
date: 2025-09-17
lead: A CLI tool that brings semantic search and knowledge graph exploration to your Obsidian vault using ChromaDB and Bun.
topics: [agents, llm, obsidian, cli, typescript, bun, vector-search, knowledge-graphs, chromadb]
image:
subimages:
---

# motivation

so recently i have taken a new way to take notes for my graduate level classes. for the longest time i was a staunch believer in writing down using pen and paper the whole knowledge bank that i wanted for a subject -- however in the age of such good open source tools and knowledge management software, i have gradually turned to better solutions that can help me ease and manage my note taking in a much better way.

so i have been using obsidian for quite some time now and honestly i love it. my vault grew to hundreds of notes -- interconnected through wiki-links, tags, and loosely organized folders. finding things became harder over time.

but the main problem that i am facing is that there is no single good tool to summarize, infer insights and visualize the connections across my own knowledge base and notes from the terminal itself. obsidian's built-in search is keyword-based, which means you need to remember *how* you wrote something, not just *what* it was about.

say you wrote a note about attention mechanisms six months ago but can't remember the exact words you used. a keyword search for "transformers" won't find it if the note title was "self-attention in sequence models." semantic search solves this -- it matches on *meaning*, not exact text.

beyond search, i also wanted to understand the shape of my knowledge. which notes are densely connected? which tags cluster together? are there broken links pointing to notes i never wrote?

## solution

i am building obscure, which is a CLI tool that works with agents to intelligently analyze your obsidian vault -- it creates mind maps from your notes, surfaces insights and patterns across your writeups, and gives you a much deeper understanding of your knowledge base rather than just deep linkages and tag based directed graphs.

the agent based approach means it can reason about your notes contextually, find non-obvious connections, and generate visual mind maps that actually reflect how your ideas relate to each other.

## how it works

obscure has three core commands: **ingest**, **query**, and **graph**.

### ingesting your vault

```bash
bun run src/index.ts ingest ~/my-vault
```

the ingest pipeline walks your vault, finds every `.md` file, and processes them:

1. **frontmatter stripping** -- yaml metadata headers are removed so only actual content gets embedded.
2. **heading-based chunking** -- instead of splitting on arbitrary token counts, files are chunked at h1-h3 heading boundaries. this keeps each chunk semantically coherent -- a section about "backpropagation" stays together rather than being split mid-paragraph.
3. **upserting to chromadb** -- each chunk is stored with metadata (file path, heading, chunk index) and embeddings are generated automatically.

what makes this practical for daily use is **incremental sync**. running with `--sync` checks both modification time *and* content hash (md5) for each file. if you touched a file but didn't change it, it skips re-ingestion. only genuinely modified content gets re-processed.

there's also a **watch mode** (`--watch`) that monitors your vault in real-time with a 300ms debounce, so your search index stays current as you write.

### querying

```bash
bun run src/index.ts query "how do transformers work" -n 5
```

this sends your natural language question to chromadb, which returns the most semantically similar chunks along with relevance scores. each result shows the source file, heading, and a content preview -- so you can jump straight to the right note.

### knowledge graphs

```bash
bun run src/index.ts graph stats ~/my-vault
bun run src/index.ts graph neighbors ~/my-vault "MyNote"
```

the graph command parses wiki-links (`[[note]]`) and tags (`#topic`) across your entire vault, building a graph where:

- **notes and tags are nodes**
- **wiki-links create note-to-note edges**
- **tags create note-to-tag edges** (modeled as intermediate nodes, not direct note-to-note connections)

broken links -- references to notes that don't exist yet -- show up as stub nodes, which is surprisingly useful for finding gaps in your knowledge base. the `neighbors` subcommand lets you explore any note's incoming and outgoing connections.

## tech stack

i went all-in on **bun** as the runtime. it handles typescript natively, has fast file i/o via `Bun.file()`, built-in hashing with `Bun.CryptoHasher`, and auto-loads `.env` files -- no extra dependencies needed for any of that.

**chromadb** runs locally via docker and handles both vector storage and embedding generation. the cli uses **commander.js** for argument parsing and **chalk** for terminal output.

the whole thing is a single `bun run src/index.ts` entry point with no build step.

## design decisions i'm happy with

**heading-based chunking over token-based splitting.** most chunking strategies split on a fixed character or token count. by splitting at headings instead, each chunk maps to a logical section of a note. this makes search results more meaningful -- you get "the section about x" rather than "an arbitrary slice that happens to contain x."

**dual mtime + hash validation for sync.** checking only modification time leads to unnecessary re-indexing (editors often touch files without changing content). checking only hashes means computing a hash for every file on every run. the dual approach short-circuits: if mtime hasn't changed, skip entirely. if it has, hash to confirm actual content change.

**tags as graph nodes, not edge labels.** modeling tags as intermediate nodes rather than direct note-to-note relationships means you can query "all notes tagged #ml" or see which tags two notes share -- the graph captures more structure this way.

## getting started

if you want to try it:

```bash
git clone https://github.com/sagnikc395/obscure
cd obscure
bun install
docker compose up -d   # starts chromadb
cp .env.example .env
bun run src/index.ts ingest ~/your-vault --sync
bun run src/index.ts query "your question here"
```

you'll need bun (v1.3.9+) and docker installed.

## what's next

there's a placeholder for github integration that i'd like to flesh out -- indexing readmes and issue discussions from repos alongside notes. i'm also considering a lightweight web ui for graph visualization, since terminal output only goes so far when you're trying to see the shape of a knowledge base.

if you use obsidian and have ever wished you could just *ask* your notes a question, give obscure a try. the vault you've been building is more useful than you think -- it just needs a better way to search it.

ref: [obscure](https://github.com/sagnikc395/obscure)
