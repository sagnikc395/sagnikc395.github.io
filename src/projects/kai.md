---
title: Kai
date: 2026-08-23
lead: a minimal, hackable coding assistant that runs entirely in the terminal with local models through Ollama.
topics: [python, coding-assistant, agents, ollama, textual, local-llm]
image:
subimages:
references:
  - title: kai
    url: https://github.com/sagnikc395/kai
    author: Sagnik Chatterjee
  - title: OpenAI Codex
    url: https://github.com/openai/codex
    author: OpenAI
  - title: Hermes Agent
    url: https://github.com/NousResearch/hermes-agent
    author: Nous Research
  - title: Ollama
    url: https://ollama.com/
    author: Ollama
---

## A coding agent you can take apart

Kai is a small, open-source coding assistant for the terminal. It follows the same basic pattern as tools like Claude Code: give a language model access to a focused set of filesystem and shell tools, let it decide when to use them, feed the results back into the conversation, and repeat until the task is finished.

The difference is that Kai is deliberately compact and fully local. Inference runs through [Ollama](https://ollama.com/), so there is no API key and project context does not have to leave your machine. The codebase is small enough to read, modify, and use as a starting point for experimenting with coding agents.

## The agent loop

The core of Kai is a streaming tool-use loop. A user message is added to the conversation and sent to the model along with the available tool definitions. As the response streams back, ordinary text is forwarded to the terminal interface while tool calls are accumulated.

The architecture was inspired by open-source terminal agents including [OpenAI Codex](https://github.com/openai/codex) and [Hermes Agent](https://github.com/NousResearch/hermes-agent). In particular, Kai borrows the idea of a small core loop that lets a model inspect a workspace, call explicit tools, observe their results, and continue iteratively. Kai reduces that pattern to a compact Python implementation built around local inference.

When the model requests a tool, Kai executes it, appends the result to the conversation, and asks the model to continue. The loop ends when the model returns a normal response without another pending tool call. This keeps the control flow straightforward while still allowing the model to inspect a repository, make changes, run commands, and verify its own work across several steps.

Kai currently gives the model six tools:

- `bash` for running shell commands
- `read` for reading files with line numbers
- `write` for creating or replacing files
- `edit` for exact string replacements
- `glob` for finding files by pattern
- `grep` for searching file contents with regular expressions

Each tool implements the same interface for its name, description, input schema, execution, and terminal rendering. A central registry turns those definitions into the tool schema the model receives, which makes adding or removing capabilities uncomplicated.

## Local inference, isolated behind a backend

Kai defaults to `qwen2.5-coder:7b`, served locally by Ollama. The model can be changed from the command line, and Kai works with other Ollama models that support tool calls.

The rest of the application does not depend directly on Ollama. The agent loop talks to a small backend protocol that emits text and completed tool calls as streaming events. Ollama-specific message conversion and error handling live in one adapter. That boundary keeps the conversation and tool layers portable: adding another inference provider means implementing a backend rather than rewriting the application.

Conversation history is stored in an OpenAI-compatible shape and translated only when it crosses the Ollama boundary. This is especially useful for tool messages, whose representation differs between providers.

## A terminal interface built for streaming

The interface is built with Textual and shows streamed responses, tool status, and a scrollable transcript. The TUI owns display and keyboard handling, while the agent loop owns model interaction. Keeping those concerns separate makes it possible to change how a tool call is rendered without changing how it is executed.

Kai can run directly from a checkout, as a Python module, or as an installed `kai` command. Command-line options expose the model, Ollama host, context window, and temperature without complicating the default experience.

## Getting started

Kai requires Python 3.10 or newer, Ollama, and a model with tool support.

```bash
git clone https://github.com/sagnikc395/kai
cd kai
uv sync

ollama serve
ollama pull qwen2.5-coder:7b
python main.py
```

You can select another model with `python main.py --model <model>` or point Kai at an Ollama server on another machine with `--host`.

## Why keep it small

Coding agents become difficult to understand quickly. Prompts, provider adapters, tool schemas, execution logic, conversation state, and interface code can easily collapse into one large abstraction. Kai keeps those pieces in separate, narrow modules while retaining the full agent cycle.

That makes the project useful in two ways: it is a practical local assistant, and it is a readable reference implementation for anyone who wants to understand or extend a tool-using coding agent.

## references

- [Kai](https://github.com/sagnikc395/kai)
- [OpenAI Codex](https://github.com/openai/codex)
- [Hermes Agent](https://github.com/NousResearch/hermes-agent)
- [Ollama](https://ollama.com/)

ref: [kai](https://github.com/sagnikc395/kai)
