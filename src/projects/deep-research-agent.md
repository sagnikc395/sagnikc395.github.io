---
title: Building a Deep Research Agent from Scratch
date: 2026-03-21
lead: a multi-agent deep research system using open-source models, firecrawl MCP for web search, and smolagents for agent coordination - all wrapped in a TUI.
topics: [python, agents, deep-research-agent, tui, smolagents, firecrawl, huggingface]
image: 
subimages:
---

## motivation

i kept running into the same problem - i'd start researching a topic, open thirty tabs, skim half of them, lose track of what i'd already read, and end up with a scattered mess of notes. openai's deep research and perplexity are good at this, but they're black boxes. i couldn't see what they were doing, couldn't steer them, and couldn't run them locally.

so i built my own. the idea was to take the core loop behind deep research - plan, search, read, synthesize - and implement it as a multi-agent system using entirely open-source models. i wanted it to run in the terminal because that's where i already live when i'm working.

anthropic published a [great writeup](https://www.anthropic.com/engineering/multi-agent-research-system) on how they built their internal multi-agent research system. karpathy's [autoresearch](https://github.com/karpathy/autoresearch) was another reference point. both confirmed the same intuition: a single agent trying to do everything is worse than multiple specialized agents working in parallel. that became the design principle.

## how it works

the pipeline has four stages. each one is a separate concern with a clear interface to the next.

### 1. planning

the user types a question into the TUI. a planner LLM takes this raw question and produces a research map - not just a list of search queries, but a structured outline of the problem space. what are the key dimensions of this topic? what needs to be understood first before the deeper questions make sense? what are the likely disagreements or open questions in the literature?

this step matters more than i initially expected. a good research map means the agents downstream aren't duplicating work or missing entire angles. a bad one means you get five summaries of the same wikipedia article.

### 2. splitting

the research map gets passed to a splitter LLM that decomposes it into non-overlapping subtasks. each subtask is scoped tightly enough that a single agent can handle it - one focused question, one thread of investigation. the output is structured JSON so the coordinator can parse and distribute it cleanly.

the non-overlapping part is important. early versions without this constraint produced redundant searches and contradictory summaries because multiple agents were covering the same ground from slightly different angles.

### 3. coordinated research

this is the core of the system. a coordinator agent reads the subtask list and spins up one sub-agent per subtask. each sub-agent gets access to [firecrawl](https://www.firecrawl.dev/)'s MCP toolkit, which means it can search the web, scrape pages, and extract content - all through native tool calls, no wrapper code.

the sub-agents work independently. they search, read, follow links when something looks promising, and produce a mini-report with their findings. the coordinator collects everything.

i used [smolagents](https://github.com/huggingface/smolagents) for the orchestration layer. it handles multi-agent coordination, tool use, and the agent loop without requiring me to write a custom scheduler or message-passing system. each sub-agent gets its own context and toolset, so they don't interfere with each other.

### 4. synthesis

once all sub-agents report back, the coordinator stitches their mini-reports into one coherent markdown document. this isn't just concatenation - the synthesizer LLM reorganizes the information, resolves contradictions between sources, and produces a report that actually reads like something a person wrote. the output is saved to `results.md`.

## design decisions

**why open-source models?** i'm using [hugging face](https://huggingface.co/) inference API throughout the pipeline. the honest answer is that i wanted to see how far open-source models could go on a task that people assume requires frontier models. for planning and splitting, they're more than capable. for synthesis, the quality gap is narrower than you'd think - especially when the sub-agents have already done the hard work of finding and extracting relevant information.

**why firecrawl MCP?** the model context protocol gives agents a standardized way to use tools. firecrawl exposes search and scraping as MCP tools, which means i didn't have to write any glue code to connect agents to the web. an agent calls `search`, gets results, calls `scrape` on a URL, gets clean text. it just works. if i swap out the agent framework tomorrow, the tools still work.

**why a TUI?** mostly because i wanted to watch the agents work. there's something satisfying about seeing subtasks appear, watching agents search in parallel, and seeing the final report materialize. it also makes debugging much easier - you can see exactly where the pipeline stalls or produces bad output.

## what i learned

**the splitter determines everything.** i spent more time tuning the splitting step than any other part of the system. if the subtasks overlap, you get redundancy. if they're too broad, the sub-agents produce shallow summaries. if they're too narrow, you miss the bigger picture. getting the granularity right is the difference between a useful report and a pile of loosely related paragraphs.

**parallel agents need guardrails.** without constraints, sub-agents will sometimes chase the same popular sources. i added deduplication at the URL level, but the deeper problem is semantic overlap - two agents finding different articles that say the same thing. this is still an open problem in the current version.

**MCP is underrated as an integration pattern.** writing custom API clients for every tool an agent needs is tedious and fragile. MCP standardizes this. once firecrawl had an MCP server, plugging it into smolagents was trivial. i expect this pattern to become the default for agent-tool integration.

**open-source models struggle most at synthesis.** planning and splitting work well. searching and extracting work well. but the final synthesis step - taking ten mini-reports and weaving them into a cohesive narrative - is where you most feel the gap between open-source and frontier models. it's good enough, but this is the bottleneck for quality.

## setup

the project uses [uv](https://docs.astral.sh/uv/) for dependency management and requires python >= 3.13.

```bash
git clone https://github.com/sagnikc395/deep-research.git
cd deep-research
uv sync
cp .env.sample .env
# add your HF_TOKEN and FIRECRAWL_API_KEY to .env
uv run python main.py
```

## what's next

- **memory**: the agent currently starts from scratch every time. i want to add persistent memory so it can build on previous research sessions - if you researched transformer architectures last week, it shouldn't re-discover the basics when you ask about attention mechanisms today.
- **obsidian integration**: i'm planning to integrate with [obscure](https://github.com/sagnikc395/obscure), a CLI tool i built for interacting with obsidian vaults. the idea is that the agent could autonomously scan your notes for open questions and kick off research to fill gaps in your knowledge base.

## references

- [Anthropic - How we built our multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system)
- [autoresearch](https://github.com/karpathy/autoresearch)

ref: [deep-research-agent](https://github.com/sagnikc395/deep-research-agent)
