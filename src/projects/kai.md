---
title: Building Kai - a Tiny Coding Agent in your Terminal
date: 2026-04-07
lead: a minimal, hackable claude code-style cli agent that runs an llm in a tool-use loop against your local filesystem and shell, wrapped in a bubble tea repl — now rewritten in go.
topics: [go, agents, groq, cli, tool-use, bubbletea]
image: 
subimages:
---

## motivation

i've been using claude code daily for months now, and at some point the curiosity got too loud to ignore. what is this thing actually doing? strip away the polish and the product surface, and what's left? how much code does it really take to get an llm to read files, run shell commands, and edit code in a loop until a task is done?

so i built kai. the goal wasn't to compete with claude code - it was to understand it. take the core idea (an llm in a tool-use loop, talking to your filesystem and shell, with a repl on top) and implement the smallest version of it that actually works. no plugins, no mcp servers, no clever scheduling - just the loop, six tools, and a terminal ui.

the result is something i can read end-to-end in an afternoon. that was the whole point.

## the rewrite

kai started as a typescript project using bun, ink, and openrouter. it worked, but the dependency story bothered me — bun's compile output, the react runtime, the zod schema layer. i rewrote it in go and the result is simpler end-to-end: one `go build` command, a self-contained binary, and a dependency tree i can actually audit. the switch from openrouter to [groq](https://groq.com) dropped latency noticeably, which matters a lot when you're watching a streaming agent loop.

the architecture is mostly the same idea, just expressed in go idioms instead of typescript ones.

## how it works

the architecture has three layers, each one a thin wrapper over the next.

### 1. the repl

the user types into a [bubble tea v2](https://charm.land/bubbletea/v2) terminal ui. bubble tea models the ui as a pure `Update(msg) → (model, cmd)` state machine — keyboard events, window resizes, and streamed tokens from the agent all arrive as messages, and the view is a pure function of the model state. that separation makes the rendering logic easy to follow and the input handling predictable.

the tui in `internal/tui/tui.go` owns the transcript (a slice of `transcriptEntry` values with roles for user, assistant, tool, and error), the input line with a cursor, scroll offset, and a status string that changes from "ready" → "thinking" → "streaming" → "running tools" as the agent works. streaming tokens from the model are forwarded over a buffered channel and picked up by a `waitForStream` command, so the ui stays responsive while the model runs in a goroutine.

### 2. the message loop

the agent loop lives in `internal/core/message_loop.go`. send the conversation to the model. if the model streams text, forward tokens to the tui via callbacks. if the model streams tool-call deltas, accumulate them by index until the stream closes, then dispatch them. append the results as `tool` role messages and loop again. that's the whole agent.

the key detail is delta accumulation: groq streams tool calls as partial json fragments indexed by position. `accumulateToolCallDelta` merges these into complete `toolCallAccumulator` structs before dispatching, so the tool executor always sees finished argument json.

models are accessed through [groq](https://groq.com) via `github.com/conneroisu/groq-go`. the default is `llama-3.3-70b-versatile` but a `--model` flag lets you point at any groq-hosted model. this made it easy to compare how different open-source models behave in the same loop.

### 3. the tools

there are six of them, defined in `internal/tools/`:

- `bash` — run a shell command (with a millisecond timeout)
- `read` — read a file with optional offset and line limit
- `write` — create or overwrite a file, including parent directories
- `edit` — exact string-replace edits inside a file, with an optional replace-all flag
- `glob` — find files by pattern including `**`
- `grep` — search file contents with a regex

each tool implements the `Tool` interface:

```go
type Tool interface {
    Name() string
    Description() string
    Parameters() map[string]any
    Call(input map[string]any) Result
    RenderToolCall(input map[string]any) string
    RenderResult(result Result) string
}
```

`tools.Definitions()` in `registry.go` converts each tool's `Parameters()` map into groq function definitions via a json round-trip. add a new tool by implementing the interface and registering it in `registry.go` — that's the whole extension story. `All()` controls the order presented to the model, which turns out to matter: tools listed earlier get slightly more weight in ambiguous situations.

## design decisions

**why go?** `go build -o dist/kai ./cmd/kai` produces a self-contained binary for any platform. no runtime to ship, no version pinning, no install dance. the compiled output is smaller than the bun equivalent and the build is faster. for a tool meant to be hackable and disposable, that matters.

**why groq?** i wanted fast inference for open-source models without managing my own vllm instance. groq's hardware gives noticeably lower latency than api-routed inference, which makes the streaming feel more alive. the `groq-go` client exposes an openai-compatible streaming api so the client code in `internal/api/` stays thin.

**why bubble tea instead of ink?** ink (react in the terminal) was the right call for the typescript version — i already knew react. go has bubble tea, which is idiomatic go: a state machine with messages instead of a component tree with hooks. the mental model maps better to what a terminal ui actually is. lipgloss v2 handles styling and word-wrap with the same color-aware width calculations you need when rendering inside a fixed-width pane.

**why no mcp?** same answer as before. the six built-in tools cover the loop i wanted to study. if i ever want to plug into external tool servers, mcp is the obvious extension point — but not before i need it.

## what i learned

**the loop is the whole thing.** i kept expecting to find some clever piece of machinery hiding inside agent frameworks — a planner, a scheduler, a memory subsystem. there isn't one. the entire agent is "call the model, run the tools it asks for, append the results, repeat." everything else is product polish on top of that core. once you've written it once, the mystery evaporates. the rewrite confirmed this: the go version of the loop is a hundred lines shorter than the typescript version and does the same thing.

**tool design matters more than prompt design.** i spent a while tuning the system prompt before realizing the bigger lever was the tool surface itself. clear tool names, tight schemas, and good error messages from the tools do more to steer model behavior than any amount of "you are a helpful assistant" preamble. the model reads the schema; treat it like an api you're designing for a careful but literal user.

**streaming changes the feel completely.** the first version buffered the model's response and rendered it all at once. it worked but felt dead. switching to token streaming — forwarded over a channel to bubble tea — made the thing feel alive in a way that's hard to overstate. latency didn't change; perceived latency collapsed.

**edit is the tool that needs the most care.** read, write, and bash are easy. `edit` — string-replace inside a file — is where models get into trouble. ambiguous matches, whitespace mismatches, partial overlaps. requiring exact string matches and erroring loudly when something is wrong turned out to be much better than trying to be clever about fuzzy matching. let the model retry with a better string.

**delta accumulation is a real implementation detail.** streaming tool calls arrive as partial json fragments, one delta per chunk. you have to accumulate them by index before you can unmarshal the arguments. getting this wrong produces silent failures where the tool is called with an empty or truncated argument map. it's the one place in the loop where the streaming api leaks through the abstraction.

## setup

```bash
export GROQ_API_KEY=your_key_here
go run ./cmd/kai
# or pick a different model
go run ./cmd/kai --model llama-3.1-8b-instant
```

building a standalone binary:

```bash
go build -o dist/kai ./cmd/kai
```

with [task](https://taskfile.dev/):

```bash
task run
task build    # local binary into dist/
task release  # cross-compile for linux/macos/windows
task test
```

## what's next

- **a todo tool**: claude code's task list is one of those features you don't appreciate until you watch an agent without one drift mid-task. a tiny scratchpad the model can write to and read from would go a long way.
- **mcp client support**: not because i need it yet, but because it's the obvious extension point. the tool executor is already a thin dispatch layer — plugging an mcp transport behind it would be straightforward.
- **better diff rendering in the repl**: when the agent edits a file, i want to see the diff inline, not just "edited foo.go." bubble tea makes this easy; i just haven't done it.

## references

- [Anthropic - Building effective agents](https://www.anthropic.com/research/building-effective-agents)
- [bubble tea](https://charm.land/bubbletea/v2)
- [groq](https://groq.com)
- [groq-go](https://github.com/conneroisu/groq-go)

ref: [kai](https://github.com/sagnikc395/kai)
