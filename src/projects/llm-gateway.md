---
title: Building an LLM Gateway in Python
date: 2026-05-21
lead: a FastAPI middleware layer for LLM calls with OpenAI-compatible chat completions, async microbatching, streaming fanout, Redis response caching, and queueing primitives for backpressure.
topics: [python, fastapi, llm, gateway, batching, redis, kafka]
image: 
subimages:
---

## motivation

once an application has more than one place calling an LLM, direct provider calls
start to get messy. every service needs an API key. every client decides its own
retry behavior. identical prompts get recomputed. there is no single place to see
latency, error rates, cache hits, or aggregate usage. and if the provider is slow
or down, the application has no layer where it can absorb pressure.

so i built a small LLM gateway. the idea is simple: put one service between the
application and the model provider, expose an OpenAI-compatible endpoint, and let
that service own the infrastructure concerns around inference traffic.

the current version is a FastAPI app with a deterministic echo provider for local
development. the echo backend is intentionally boring. it made the gateway
behavior testable without needing a real model account, and it kept the focus on
the middleware problems: batching, streaming, caching, disconnect handling, and
request queues.

```bash
curl -s http://127.0.0.1:8000/v1/chat/completions \
  -H 'content-type: application/json' \
  -d '{"messages":[{"role":"user","content":"hello gateway"}]}'
```

behind that endpoint, the request can be served from Redis, queued into a
microbatch, forwarded to a provider abstraction, or streamed back token by token
over server-sent events.

## how it works

the project has four main layers:

- `api/routes.py` exposes `/health`, `/stats`, and `/v1/chat/completions`
- `core/models.py` defines OpenAI-style chat request and response models
- `infra/providers.py` defines provider protocols and the local echo provider
- `services/` contains batching, caching, and queueing infrastructure

```text
Client
  |
  v
FastAPI /v1/chat/completions
  |
  +--> Redis response cache
  |
  +--> non-streaming request batcher
  |       |
  |       v
  |     provider.complete(...)
  |
  +--> streaming dynamic batcher
          |
          v
        provider.stream(...) -> per-client SSE channel
```

the public surface is deliberately familiar. a client sends chat messages to
`/v1/chat/completions`, sets `"stream": true` if it wants incremental output, and
gets back either a `chat.completion` JSON response or `chat.completion.chunk`
events.

## the non-streaming path

the non-streaming path runs through `AsyncRequestBatcher`.

each incoming request gets wrapped with an `asyncio.Future` and appended to an
in-memory batch. the batch flushes when one of two things happens:

- the queue reaches `BATCH_MAX_SIZE`
- the first request has waited `BATCH_MAX_WAIT_MS`

that small wait window is the heart of the tradeoff. if the gateway flushes
immediately, it behaves like a normal proxy and gives up batching efficiency. if
it waits too long, tail latency becomes visible to users. the default is a small
25ms window, which is enough to collect bursts without turning every request into
a slow request.

when the batch flushes, the gateway calls the provider for every request with
`asyncio.gather`. each caller still receives its own response. the batcher is not
combining prompts into one synthetic prompt; it is coordinating a group of
provider calls behind one scheduling policy.

the `/stats` endpoint exposes basic counters:

```bash
curl -s http://127.0.0.1:8000/stats
```

that returns queued request count, processed request count, processed batch count,
largest observed batch size, and the configured batch size and wait window.

## streaming without losing control

streaming makes batching more awkward.

for non-streaming requests, a batch has a clean shape: collect requests, call the
provider, resolve futures. streaming has to preserve a live connection for each
client while still grouping requests that arrive close together.

the project handles that with `DynamicBatcher`. each streaming request becomes a
`_StreamItem` with its own response channel:

```text
client A -> _StreamItem A -> asyncio.Queue[str | error | None]
client B -> _StreamItem B -> asyncio.Queue[str | error | None]
client C -> _StreamItem C -> asyncio.Queue[str | error | None]
```

the dynamic batcher opens the same short accumulation window as the non-streaming
batcher. once it has a batch, it starts provider streams in parallel. tokens from
each provider stream are placed onto that request's own channel, and the route
turns those tokens into server-sent events.

the important part is that token routing is per request. one slow stream should
not block another stream from delivering tokens, and one provider failure should
not crash the entire batcher loop. exceptions are sent through the same channel
as values and then followed by a `None` sentinel so the route can terminate the
response cleanly.

## client disconnects

LLM streaming has an easy-to-miss waste case: the browser tab closes, the client
goes away, but the server keeps generating tokens because nobody told the
provider stream to stop.

the streaming route polls `request.is_disconnected()` while it waits on the
response channel. if the client disconnects, the route marks the stream item as
cancelled. the batcher checks that flag while forwarding tokens. the provider
stream is wrapped with `aclosing`, so exiting early awaits `aclose()` instead of
waiting for garbage collection to clean up the connection later.

that sounds like a small implementation detail, but it is one of the places where
a gateway starts to behave like infrastructure instead of a thin wrapper. wasted
tokens are wasted money and wasted capacity.

## response caching

the Redis cache lives in `services/cache.py`.

the cache key is a SHA-256 hash over the stable request fields:

- model
- messages
- temperature
- max tokens

the `stream` flag is intentionally excluded. a streaming request and a
non-streaming request with the same model and prompt should reuse the same model
output. the non-streaming path stores one completed response string. the
streaming path stores the emitted chunks, so a cache hit can replay the same
server-sent event sequence without touching the provider.

```text
request
  -> make_cache_key(model, messages, temperature, max_tokens)
  -> Redis GET
  -> hit: return cached response or replay cached chunks
  -> miss: submit to batcher, then Redis SET with TTL
```

the TTL is configurable with `CACHE_TTL_SECONDS`, and the whole cache can be
disabled with `CACHE_ENABLED=false`. that made local testing easier, but it also
matches how i would want to run this in practice: caching is useful for some
workloads and actively wrong for others.

## request queues

the project also has a queue module for backpressure and distributed handoff.

`InMemoryRequestQueue` is the simple version. it wraps an `asyncio.Queue` with a
fixed max size and raises `QueueFullError` when the gateway should reject work
instead of letting memory grow without bound.

`KafkaRequestQueue` is the distributed version. it publishes request envelopes
with a `request_id`, `gateway_id`, and payload to a Kafka topic. workers consume
from the request topic and publish responses to a response topic. the gateway's
response consumer resolves the matching pending future when the corresponding
reply arrives.

that gives the project the outline of a multi-gateway deployment:

```text
Gateway instance
  -> Kafka request topic
  -> worker group
  -> Kafka response topic
  -> original gateway resolves pending future
```

the active FastAPI route currently goes through the batcher and cache path. the
queue module is a separate primitive, but it is the right place for admission
control once the gateway grows beyond a single process.

## design decisions

**why an OpenAI-compatible endpoint?** because the fastest gateway migration is a
base URL change. if existing clients can keep using the same request and response
shape, the gateway can be adopted without rewriting every call site.

**why start with an echo provider?** because provider integration was not the
interesting part yet. the gateway needed deterministic tests for batching,
streaming, disconnects, and caching. a local echo provider makes those behaviors
repeatable and keeps the system runnable without secrets.

**why FastAPI?** this is mostly async I/O: HTTP requests, streaming responses,
Redis calls, provider streams, Kafka producers and consumers. FastAPI sits on top
of the async Python stack cleanly, and its request object exposes the disconnect
signal needed for streaming cancellation.

**why Redis for the cache?** response caching needs to survive process restarts
and be shared across gateway instances. an in-memory cache would be simpler, but
it would not answer the actual infrastructure problem. Redis is the boring
choice, which is exactly what a cache layer should be.

**why Kafka in the queue layer?** the in-process batcher is enough for one gateway
instance. Kafka is for the next shape of the problem: multiple gateways accepting
requests, a worker group processing them, and responses routed back to the
gateway that owns the client connection.

## what i learned

**streaming and batching pull in opposite directions.** batching wants to wait
and coordinate. streaming wants to start sending data immediately. the dynamic
batcher is a compromise: wait briefly, start all streams in parallel, then keep
token delivery isolated per request.

**a gateway is mostly policy.** the provider call is just one function. the value
of the gateway is everything around it: when to admit work, when to reject it,
how long to wait for batching, whether a response is cacheable, how to stop work
after disconnect, and where to collect operational counters.

**cache keys need product semantics.** hashing the raw request body would have
been easy, but it would treat streaming and non-streaming requests as different
outputs. building the key from the fields that actually affect generation made
the cache more useful and easier to reason about.

**disconnect handling belongs in the happy path.** it is tempting to treat client
disconnects as cleanup code. for LLM workloads, it is part of normal operation.
users close tabs, networks drop, and downstream callers time out. the gateway
needs to stop work promptly when nobody is listening.

**test doubles are useful infrastructure.** the echo provider is not a fake in
the dismissive sense. it is what made the gateway behavior measurable. with it,
the test suite can assert batch sizes, streamed token routing, cache hits, cache
misses, queue fullness, and cancellation without depending on a remote provider.

## setup

the project uses [uv](https://docs.astral.sh/uv/) and requires python 3.13.

```bash
git clone https://github.com/sagnikc395/llm-gateway.git
cd llm-gateway
uv sync
uv run python main.py
```

the service runs on `http://0.0.0.0:8000`:

```bash
curl -s http://127.0.0.1:8000/health

curl -s http://127.0.0.1:8000/v1/chat/completions \
  -H 'content-type: application/json' \
  -d '{"messages":[{"role":"user","content":"hello gateway"}]}'

curl -s http://127.0.0.1:8000/v1/chat/completions \
  -H 'content-type: application/json' \
  -d '{"messages":[{"role":"user","content":"stream this"}],"stream":true}'
```

configuration is environment-variable based:

```bash
BATCH_MAX_SIZE=16 \
BATCH_MAX_WAIT_MS=50 \
CACHE_TTL_SECONDS=300 \
uv run python main.py
```

disable Redis caching when running without Redis locally:

```bash
CACHE_ENABLED=false uv run python main.py
```

run the tests:

```bash
uv run pytest
```

## what's next

- **real provider adapters**: OpenAI, Anthropic, Gemini, and local OpenAI-compatible
  servers should plug in behind the existing provider protocol.
- **unified admission control**: wire the request queue into the active route so
  overload behavior is explicit instead of being implied by process capacity.
- **metrics**: expose latency histograms, cache hit rate, cancellation count,
  provider errors, and batch fill ratio.
- **routing policy**: once multiple providers exist, the gateway needs weighted
  routing, failover, model aliases, and eventually cost-aware selection.

## references

- [FastAPI](https://fastapi.tiangolo.com/)
- [Server-Sent Events](https://html.spec.whatwg.org/multipage/server-sent-events.html)
- [Redis](https://redis.io/)
- [Apache Kafka](https://kafka.apache.org/)

ref: 
- [llm-gateway](https://github.com/sagnikc395/llm-gateway)
- [litellm](https://github.com/BerriAI/litellm)