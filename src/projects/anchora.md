---
title: Anchora
date: 2026-06-29
lead: a small Python workflow engine for running AI agent steps in order, with provider config, explicit state transitions, retries, and smolagents integration.
topics: [python, agents, workflow-engine, smolagents, litellm, huggingface]
image:
subimages:
---

## motivation

after building agent projects for a while, i kept running into the same boring problem: the model call itself was not the hard part. the hard part was making a sequence of agent steps behave like a real workflow.

you want one step to run after another. you want a clear state for each step. you want retries when a model provider flakes. you want logs that tell you where the workflow stopped. you want the provider and model to be configurable without rewriting code.

Anchora is my small attempt at that layer. it is not trying to be a full DAG orchestrator or a heavyweight agent framework. it is a minimal Python workflow engine for sequential AI-agent steps, built around a few explicit abstractions and backed by [smolagents](https://huggingface.co/docs/smolagents/en/index).

## the core idea

Anchora treats an agent workflow as an ordered list of `Step` values. each step has:

- an `id`
- an agent with a `run(...)` method
- a prompt
- a status
- an attempt count
- an output or error

the workflow runs each step in order. if a step succeeds, its output is stored and the next step runs. if it fails, the workflow moves through a retry path until retries are exhausted.

that sounds small because it is. the point is to make the execution model boring and inspectable, so the interesting work can happen inside the agents.

## how it works

the CLI starts by loading `.env`, reading `config.yaml`, and constructing a typed config object. the config has two parts:

```yaml
provider:
  name: huggingface
  model: Qwen/Qwen3-Next-80B-A3B-Thinking
  inference_provider: auto
  max_tokens: 1024

workflow:
  max_retries: 2
  retry_delay_ms: 500
```

from there, Anchora builds a model and a workflow:

1. resolve the provider API key from the provider name
2. create a smolagents model backend
3. create `ToolCallingAgent` instances
4. attach optional tools to agents
5. build ordered workflow steps
6. run each step through the state machine

the current example workflow has two agents. the first is a research agent that answers a prompt about Go's `select` statement. the second is a summarization agent that has access to a local `summarize` tool.

## provider layer

the provider config is intentionally simple. Hugging Face uses `InferenceClientModel`; other providers go through `LiteLLMModel`.

Anchora knows the default environment variable names for common providers:

- `huggingface` -> `HF_TOKEN`
- `groq` -> `GROQ_API_KEY`
- `openai` -> `OPENAI_API_KEY`

custom providers can set `provider.api_key_env`. non-Hugging Face models are normalized into LiteLLM-style model IDs when needed, so a config like `name: groq` and `model: llama-3.3-70b-versatile` can become `groq/llama-3.3-70b-versatile`.

this layer exists because agent experiments tend to drift across providers. i wanted the workflow code to stay stable while the model backend changed.

## state machine

the state machine is the part i care about most. a step can be:

- `pending`
- `running`
- `succeeded`
- `failed`
- `retrying`

and it can move only through valid events:

```text
pending -> running
running -> succeeded
running -> failed
failed -> retrying
retrying -> running
```

invalid transitions raise errors. that keeps the workflow lifecycle explicit instead of letting status strings drift around the codebase.

the retry logic sits on top of this. when an agent call fails, the workflow records the exception, marks the step failed, increments the attempt count, moves into retrying, waits for a configured delay, and starts the step again. if retries are exhausted, the workflow raises an error that includes the failed step ID.

## agent interface

the workflow does not depend directly on smolagents. it depends on a small protocol:

```python
class Agent(Protocol):
    def run(self, task: str, *, reset: bool = True) -> object:
        ...
```

that means any object with a compatible `run` method can be used as a step agent. smolagents is the current backend, but the workflow engine itself is not locked to it.

the default workflow uses `ToolCallingAgent` because tool use is where agent workflows become interesting. the example summarization tool is intentionally simple:

```python
@tool
def summarize(text: str) -> str:
    return f"Summary: {text[:100]} [truncated]"
```

it is enough to prove the wiring: tools can be attached to specific agents, and each step can have a different agent role.

## tests

the repo has focused pytest coverage around the pieces most likely to break:

- config parsing and provider API key resolution
- Hugging Face model construction
- valid and invalid state transitions
- workflow ordering
- retry success after temporary failures
- failure after retries are exhausted

these tests are small, but they match the project. for a workflow engine like this, correctness mostly means "does it run steps in order, does it retry predictably, and does it fail loudly at the right boundary?"

## setup

the project uses [uv](https://docs.astral.sh/uv/) and requires python >= 3.11.

```bash
git clone https://github.com/sagnikc395/anchora.git
cd anchora
uv sync
```

set a provider token in `.env` or your shell:

```bash
HF_TOKEN=your_huggingface_token_here
```

then run the workflow:

```bash
uv run anchora
```

the logs show state transitions and each step output.

to run tests:

```bash
uv run --extra dev pytest
```

## what i learned

**state is the product.** for agent workflows, the state transitions are not just implementation details. they are the thing that makes the system debuggable. a workflow that says "step failed after retry 2/2" is much easier to reason about than one that just exits somewhere inside an agent call.

**a sequential engine is still useful.** not every agent system needs a graph runtime. a lot of useful workflows are linear: research, summarize, extract, verify, write. starting with sequential execution keeps the abstractions honest.

**provider abstraction should be boring.** i do not want the rest of the code to know whether the model is coming from Hugging Face, Groq, OpenAI, or a custom endpoint. the provider layer is mostly environment variable resolution and backend construction, which is exactly where that complexity should live.

**small protocols keep options open.** by depending on an `Agent` protocol instead of a smolagents class, the workflow can later run other agent implementations without rewriting the execution engine.

## what's next

- pass outputs from earlier steps into later prompts
- add branching or conditional execution without turning the project into a full DAG engine
- persist workflow runs to disk so failed runs can be inspected later
- add structured step outputs instead of storing everything as text
- expose a small programmatic API for defining workflows outside the demo builder

ref: [anchora](https://github.com/sagnikc395/anchora)
