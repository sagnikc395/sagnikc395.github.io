---
title: Building Kai - a Tiny Coding Agent in your Terminal
date: 2026-04-07
lead: a minimal, hackable claude code-style cli agent that runs an llm in a tool-use loop against your local filesystem and shell, wrapped in an ink-based repl.
topics: [typescript, bun, ink, react, agents, openrouter, cli, tool-use]
image: 
subimages:
---

## motivation

i've been using claude code daily for months now, and at some point the curiosity got too loud to ignore. what is this thing actually doing? strip away the polish and the product surface, and what's left? how much code does it really take to get an llm to read files, run shell commands, and edit code in a loop until a task is done?

so i built kai. the goal wasn't to compete with claude code - it was to understand it. take the core idea (an llm in a tool-use loop, talking to your filesystem and shell, with a repl on top) and implement the smallest version of it that actually works. no plugins, no mcp servers, no clever scheduling - just the loop, six tools, and a terminal ui.

the result is something i can read end-to-end in an afternoon. that was the whole point.

## how it works

the architecture has three layers, each one a thin wrapper over the next.

### 1. the repl

the user types into an [ink](https://github.com/vadimdemedes/ink) + react ui. ink is one of those libraries that sounds like a gimmick until you use it - rendering a terminal interface as a react component tree turns out to be exactly the right abstraction. state, input handling, scrollback, streaming output - all of it just works the way you'd expect from any react app.

the repl is dumb on purpose. it collects user input, hands it to the agent loop, and renders whatever comes back. it doesn't know anything about tools, models, or message history. that separation made the rest of the system much easier to reason about.

### 2. the message loop

the agent loop lives in `src/core/message_loop.ts` and it's almost embarrassingly simple. send the conversation to the model. if the model returns text, render it and wait for the next user message. if the model returns a tool call, dispatch it through the tool executor, append the result to the conversation, and loop again. that's it. that's the whole agent.

i talk to models through [openrouter](https://openrouter.ai) so i can swap providers without rewriting the client. the default is `anthropic/claude-sonnet-4` but a `--model` flag lets you point at anything openrouter exposes. this turned out to be useful for comparing how different models behave inside the same loop - some models over-call tools, some under-call them, and you only see this clearly when you can switch with a flag.

### 3. the tools

there are six of them, defined in `src/tools/`:

- `bash` — run a shell command
- `read` — read a file
- `write` — create or overwrite a file
- `edit` — string-replace edits inside a file
- `glob` — find files by pattern
- `grep` — search file contents

each tool is a zod schema plus a function. `zod-to-json-schema` converts the schema into the json-schema format the model expects, so the tool definitions and the runtime validation come from the same source of truth. add a new tool by writing a new file in `src/tools/` and registering it - that's the whole extension story.

this set is deliberately small. you can do almost anything with read, write, edit, and bash - the other two are conveniences that save tokens. resisting the urge to add more tools was harder than i expected.

## design decisions

**why bun?** mostly because of `bun build --compile`. one command produces a single self-contained binary for linux, macos, and windows (x64 and arm64). no node version pinning, no `npm install` dance for users, no runtime to ship. drop the binary on your `PATH` and run `kai`. for a tool that's supposed to be hackable and disposable, that distribution story matters.

**why openrouter?** i didn't want to lock the project to one provider's sdk. openrouter gives me a single openai-compatible endpoint and a long list of models behind it. swapping `anthropic/claude-sonnet-4` for an open-source model is a one-flag change. it also means the client code in `src/api/` is tiny - it's just an http call.

**why ink?** because the alternative is `readline` and ansi escape codes, and i've written enough of those for one lifetime. ink lets the ui be a react component, which means streaming tokens, scrollback, and input handling are all things i already know how to do. the repl in `src/ui/` is maybe two hundred lines.

**why no mcp?** mcp is great, but adding it would have doubled the surface area of the project for a feature i didn't need. the six built-in tools cover the loop i wanted to study. if i ever want to plug into external tool servers, mcp is the obvious place to go - but not before i need it.

## what i learned

**the loop is the whole thing.** i kept expecting to find some clever piece of machinery hiding inside agent frameworks - a planner, a scheduler, a memory subsystem. there isn't one. the entire agent is "call the model, run the tools it asks for, append the results, repeat." everything else is product polish on top of that core. once you've written it once, the mystery evaporates.

**tool design matters more than prompt design.** i spent a while tuning the system prompt before realizing the bigger lever was the tool surface itself. clear tool names, tight schemas, and good error messages from the tools do more to steer model behavior than any amount of "you are a helpful assistant" preamble. the model reads the schema; treat it like an api you're designing for a careful but literal user.

**streaming changes the feel completely.** the first version buffered the model's response and rendered it all at once. it worked but felt dead. switching to token streaming - which ink handles trivially - made the thing feel alive in a way that's hard to overstate. latency didn't change; perceived latency collapsed.

**edit is the tool that needs the most care.** read, write, and bash are easy. `edit` - string-replace inside a file - is where models get into trouble. ambiguous matches, whitespace mismatches, partial overlaps. requiring exact string matches and erroring loudly when something is wrong turned out to be much better than trying to be clever about fuzzy matching. let the model retry with a better string.

## setup

```bash
bun install
export OPENROUTER_API_KEY=your_key_here
bun run start
# or pick a different model
bun run src/index.ts --model anthropic/claude-opus-4
```

building a standalone binary:

```bash
bun run build         # local build into ./dist
bun run build:all     # cross-compile for linux/macos/windows
```

## what's next

- **a todo tool**: claude code's task list is one of those features you don't appreciate until you watch an agent without one drift mid-task. a tiny scratchpad the model can write to and read from would go a long way.
- **mcp client support**: not because i need it yet, but because it's the obvious extension point. the tool executor is already a thin dispatch layer - plugging an mcp transport behind it would be straightforward.
- **better diff rendering in the repl**: when the agent edits a file, i want to see the diff inline, not just "edited foo.ts." ink makes this easy; i just haven't done it.

## references

- [Anthropic - Building effective agents](https://www.anthropic.com/research/building-effective-agents)
- [ink](https://github.com/vadimdemedes/ink)
- [openrouter](https://openrouter.ai)

ref: [kai](https://github.com/sagnikc395/kai)