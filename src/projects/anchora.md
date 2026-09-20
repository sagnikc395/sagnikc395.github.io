---
title: "Anchora — a workflow engine for agents"
date: 2026-05-20
lead: a Go service that runs small DAGs of dependent agent calls, either inline in the request or as durable jobs backed by PostgreSQL and Redis, with leases, fenced writes, and resume-from-progress so a worker dying costs only the work actually lost.
topics: [go, distributed-systems, workflow-engine, agents, postgresql, redis]
image:
subimages:
references:
  - title: anchora
    url: https://github.com/sagnikc395/anchora
    author: Sagnik Chatterjee
  - title: Eino — LLM application framework for Go
    url: https://github.com/cloudwego/eino
    author: CloudWeGo
  - title: Hugging Face Inference Providers
    url: https://huggingface.co/docs/inference-providers
    author: Hugging Face
  - title: Server-Sent Events specification
    url: https://html.spec.whatwg.org/multipage/server-sent-events.html
    author: WHATWG
---

## Why I built this

Most of the agent orchestration I had written before this was a loop with a list of prompts in it. That works right up until two steps could run at once, or one step needs another's output, or the process dies halfway through and there is nothing to resume from.

Anchora is my attempt to take that seriously without building a platform. It runs small workflows made of dependent agent calls: you describe the steps, the engine checks that their dependencies form a valid DAG, runs whatever is ready at the same time, and makes successful outputs available to later steps. There is no UI, no authentication, and no scheduler. Agents are the one abstraction.

## The workflow shape

A step has an `id`, an `agent`, a `prompt`, and optionally `depends_on`. Prompts interpolate an earlier step's output with `{{steps.<id>.output}}`:

```json
{
  "steps": [
    {
      "id": "research",
      "agent": "research",
      "prompt": "Explain Go select in a few sentences."
    },
    {
      "id": "summary",
      "agent": "research",
      "depends_on": ["research"],
      "prompt": "Summarize this:\n{{steps.research.output}}"
    }
  ]
}
```

Validation happens before anything runs, and it is deliberately strict: empty steps, missing fields, duplicate IDs or dependencies, self-dependencies, unknown dependencies, cycles, and negative retry settings are all rejected up front. Steps in the same ready wave run concurrently. A failed dependency skips everything downstream of it, and a failed workflow still returns the results collected so far along with the step that broke.

Retries are configured globally rather than per step. `max_retries` counts attempts after the first call, and the delay is linear — retry number times `retry_delay_ms`.

## Two ways to run the same engine

The synchronous endpoint calls the workflow engine directly in the request. The job endpoint stores a validated job in PostgreSQL, pushes its ID onto a Redis list, and returns `202`. A worker claims the ID, runs the *same* engine, writes step and job updates back to PostgreSQL, and records events. A third endpoint polls those events and re-exposes them as Server-Sent Events, so a client can watch a job without holding a connection open through the actual work.

Keeping one engine behind both paths was the design decision I cared most about. The durable path adds delivery, ownership, and recovery around the execution; it does not get its own semantics for what a workflow means.

## Making delivery survive a dead worker

The interesting part was everything after "a worker picked up the job."

A claimed job is not removed from Redis. It moves into a lease set scored by a deadline and tagged with the claiming worker, and PostgreSQL records the same ownership on the job row. The owner renews both on a heartbeat. A worker that dies stops renewing, and a reaper on any node returns the job to the ready list.

That makes delivery at-least-once, which is only acceptable if redelivery is cheap. Two things make it cheap:

**Writes are fenced.** Everything a worker writes while running a job is conditional on it still holding the PostgreSQL lease. A partitioned worker that has already been replaced cannot overwrite the new owner's progress when it comes back.

**A redelivered job resumes instead of restarting.** Steps that already succeeded are replayed from the store rather than calling their agents again, so a crash costs only the work that was genuinely lost — which matters when every step is a paid model call.

A job that keeps coming back is dead-lettered after `async.max_attempts` deliveries instead of looping forever.

## Two reapers

There are two sweeps, and they cover different failures. The Redis sweep handles the ordinary case of a worker dying: its lease expires and the job goes back on the ready list. The PostgreSQL sweep handles jobs whose queue entry vanished entirely — a Redis flush, a failover — and re-enqueues them. It waits one extra lease period so the cheaper sweep gets the first chance.

Shutdown is handled separately from failure. `SIGINT` and `SIGTERM` drain in-flight jobs, and a worker shutting down releases its claim and requeues the job, so a rolling restart does not have to wait out the full visibility timeout.

## What an agent is

The core engine depends on exactly this:

```go
type Agent interface {
    Run(context.Context, string) (string, error)
}
```

Everything else is wiring. The executable connects named agents to an [Eino](https://github.com/cloudwego/eino) OpenAI-compatible chat model, defaulting `base_url` to Hugging Face's Inference Providers router, so pointing a workflow at a different provider is a config change rather than a code change. Each generation sends the configured system instruction, when present, followed by the rendered prompt as a user message, and fails if the model returns no text.

Keeping the interface this small is what let the workflow tests run against in-memory fakes with no services and no network.

## Testing it

Unit tests cover the workflow engine including resume, the synchronous router, the Eino adapter, configuration, and the whole worker lifecycle — claim, resume, duplicate delivery, lease loss, shutdown requeue, dead-lettering, and reaping. All of it runs against fakes, so `go test -race ./...` needs nothing running.

The Lua scripts and the SQL are the parts fakes cannot honestly cover, so they have their own integration tests that skip unless both a PostgreSQL and a Redis URL are set. `task test-integration` brings up the compose services and sets them.

## What I learned

The workflow engine was the easy half. DAG validation, ready waves, and prompt interpolation are a day of work and they are fully testable in memory.

The half that took the thinking was accepting at-least-once delivery and then making it survivable: leases that expire, writes that are fenced on ownership, and resume that replays completed steps from the store. Each one is small in isolation. Together they are the difference between a queue that loses work when a node dies and one that does not.

Configuration turned out to matter more than I expected too. `lease_ms` has to sit above the slowest step's latency, or a perfectly healthy but slow job gets taken away mid-run — a distributed-systems bug whose actual cause is a number in a YAML file.

## Limitations and next steps

There is no scheduler, no authentication, and no UI. Retries are global rather than per step, which is wrong for a workflow that mixes a cheap classification call with an expensive long-context one. Queue durability depends on Redis; the compose file turns on append-only persistence with per-second fsync, and the PostgreSQL-side reaper covers whatever a restart still loses, but that is a floor rather than a guarantee.

The next things I would add are per-step retry and timeout policy, conditional edges so a step can skip its branch on a predicate rather than only on failure, and structured outputs so `{{steps.x.output}}` can address a field instead of a whole blob of text.

ref: [anchora](https://github.com/sagnikc395/anchora)
