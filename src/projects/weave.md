---
title: A Concurrent Web Crawler with Mixed Concurrency Models
date: 2026-04-24
lead: Building a Python web crawler that uses asyncio for network I/O, processes
  for HTML parsing, locks for shared frontier state, and SQLite WAL for serving
  crawl results.
topics: [python, concurrency, asyncio, web-crawling, sqlite]
image:
subimages:
---

# motivation

I wanted a project that made Python concurrency tradeoffs feel concrete.

Most examples stop at "here is `asyncio`" or "here is multiprocessing," but real
systems are rarely that uniform. A crawler has several distinct stages, and they
do not fail or bottleneck in the same way. Fetching pages is mostly network wait
time. Parsing HTML is CPU work. URL deduplication is shared-state coordination.
Serving results is a read-heavy storage problem.

This repository is interesting because it does not try to solve all of that with
one primitive. It treats crawling as a pipeline and gives each stage a different
execution model.

## what i built

`weave` is a concurrent web crawler written in Python. It has a CLI, an HTTP API,
an MCP server, a SQLite-backed storage layer, and a small benchmark suite to
justify the concurrency choices.

The system breaks down into six parts:

- `weave/fetcher.py`: async HTTP fetching with `aiohttp`
- `weave/parser.py`: HTML parsing with BeautifulSoup
- `weave/crawler.py`: orchestration across fetch, parse, persist, and frontier expansion
- `weave/frontier.py`: thread-safe URL deduplication and queueing
- `weave/storage.py`: SQLite persistence with WAL enabled
- `weave/api.py` and `weave/mcp_server.py`: query surfaces over the crawled data

The part I like most is that the architecture is honest about the workload. It
does not use `asyncio` everywhere just because the project is "a crawler." It
uses `asyncio` where the program is waiting, and it switches away from it where
the work becomes CPU-bound or stateful.

ref: [weave](https://github.com/sagnikc395/weave)

## the core design idea

The entire project is organized around one simple argument:

> network fetching, HTML parsing, frontier coordination, and query serving do not
> have the same bottlenecks, so they should not use the same concurrency model.

That sounds obvious, but a lot of small systems ignore it. They end up either
threading everything, `async`-ing everything, or serializing parts that should be
parallel.

In `weave`, the mapping is explicit:

- fetching uses `asyncio` plus `aiohttp`
- parsing uses a `ProcessPoolExecutor`
- frontier dedup uses a `threading.Lock`
- storage uses SQLite in WAL mode
- the API uses FastAPI and background tasks

That division is the main lesson of the codebase.

## the fetch layer

The fetcher in [`weave/fetcher.py`](/Users/sagnikc/Desktop/Projects/Backend_FullStack_Projects/weave/weave/fetcher.py)
is the most straightforward part of the system, but it sets the tone for the
rest of the design.

It uses:

- an `asyncio.Semaphore` to cap global concurrency
- one `asyncio.Lock` per domain to serialize access to the same host
- an explicit per-domain sleep to enforce politeness delay
- a single shared `aiohttp.ClientSession`

That combination matters. A crawler is not just "make many requests quickly." It
also has to avoid overwhelming one site while still making progress across many
sites. The per-domain lock means requests to `example.com` are serialized through
one lane, while requests to different domains can still proceed concurrently.

The fetcher also rejects non-HTML responses early by checking `content_type`.
That is a small detail, but it keeps later stages from wasting CPU parsing things
they do not understand.

## the parser layer

Once a page is fetched, the work changes character completely.

HTML parsing is CPU-bound. In `weave`, that logic lives in
[`weave/parser.py`](/Users/sagnikc/Desktop/Projects/Backend_FullStack_Projects/weave/weave/parser.py)
and is intentionally kept as a pure function: take `url`, `html`, and `status`,
return a parsed result with title, text, links, and status.

The actual parser does a few useful cleanup steps:

- strips `script`, `style`, `nav`, `footer`, and `header`
- extracts plain text with BeautifulSoup
- truncates text to 8000 characters before storage
- resolves relative links with `urljoin`
- removes fragments and deduplicates links while preserving order

The important part is not the parsing itself. The important part is that
`crawler.py` runs this function in a `ProcessPoolExecutor` rather than a thread
pool.

That is the right tradeoff for CPython. Parsing HTML is CPU work, and the GIL
means threads do not buy much parallelism there. Processes do.

There is also a pragmatic fallback: if `ProcessPoolExecutor` is unavailable in the
runtime environment, the crawler falls back to `ThreadPoolExecutor`. That keeps
the system portable, even if it reduces throughput.

## the crawler orchestration

The real center of the project is
[`weave/crawler.py`](/Users/sagnikc/Desktop/Projects/Backend_FullStack_Projects/weave/weave/crawler.py).
This is where the pipeline comes together.

The crawler:

1. seeds a frontier with the initial URLs
2. starts an async fetcher
3. creates a long-lived parser executor
4. launches `config.concurrency` async workers
5. loops through fetch, parse, persist, and link expansion

Each worker pulls a `(url, depth)` pair from the frontier, checks domain policy,
fetches the page, sends HTML into the executor, stores the parsed result, stores
the outbound links, and pushes newly discovered links back into the frontier if
the depth limit allows it.

This worker structure is simple, but it captures the whole point of the project:
the code is asynchronous at the edges and parallel in the middle.

One small implementation detail I liked is the use of Rich `Live` tables to show
runtime stats such as pages crawled, errors, queue depth, visited count, and
pages-per-second. That makes the crawler feel more like an operational system and
less like a script.

## the frontier and shared state

The frontier in [`weave/frontier.py`](/Users/sagnikc/Desktop/Projects/Backend_FullStack_Projects/weave/weave/frontier.py)
is deliberately minimal:

- an `asyncio.Queue` for pending URLs
- a `set` for visited URLs
- a `threading.Lock` around the visited set

The reason for the lock is subtle. Even though the crawler is written in
`asyncio`, multiple coroutines can still interleave while trying to enqueue newly
discovered links. Without a guarded check-and-add on the visited set, duplicate
URLs would get pushed into the queue.

This is exactly the kind of bug that concurrency toy examples tend to skip. The
frontier is where "mostly works" turns into "actually correct under load."

The queue discipline is FIFO and the dedup key is the exact URL string, which
makes the current behavior easy to reason about. It also points to obvious future
improvements like URL canonicalization, priority queues, or host-aware scheduling.

## the storage layer

Persistence lives in
[`weave/storage.py`](/Users/sagnikc/Desktop/Projects/Backend_FullStack_Projects/weave/weave/storage.py),
and it is intentionally conservative.

The store uses SQLite directly through the standard library `sqlite3` module. On
every connection it enables `PRAGMA journal_mode=WAL`, then keeps the schema very
small:

- `pages(url, title, text, status, depth, crawled_at)`
- `links(source_url, target_url)`

This is a good fit for the project.

SQLite gives the crawler durable local storage, simple querying, and a clean way
to expose crawl results over both HTTP and MCP. WAL mode matters because the
system wants concurrent reads and writes without turning storage into a global
bottleneck. A crawl can be writing pages while an API client is reading stats or
running a search.

The queries are intentionally basic:

- `search()` uses `LIKE` over title and text
- `get_page()` returns the stored content for one URL
- `list_pages()` paginates recent pages
- `get_links()` returns outbound edges for a page
- `stats()` aggregates page count, link count, depth, and status distribution

This is not a search engine, and it does not pretend to be one. It is a crawler
with a useful local query surface.

## the api and mcp surfaces

One of the more practical parts of the codebase is that it does not stop at
"crawl pages and write rows."

[`weave/api.py`](/Users/sagnikc/Desktop/Projects/Backend_FullStack_Projects/weave/weave/api.py)
wraps the crawler in a FastAPI service. It exposes endpoints for:

- health checks
- crawl statistics
- page listing and lookup
- keyword search
- stored outbound links
- background crawl job submission and status inspection

The crawl job manager is in-memory, which keeps things simple. Starting a crawl
through `POST /crawl` creates a job record and launches `Crawler(config).run()`
inside `asyncio.create_task()`. That means the API can return immediately with a
job id while the crawl continues in the background.

There is also an MCP server in
[`weave/mcp_server.py`](/Users/sagnikc/Desktop/Projects/Backend_FullStack_Projects/weave/weave/mcp_server.py).
It exposes four tools:

- `crawl_url`
- `search_crawled`
- `get_page_summary`
- `extract_links`

That is a nice extension of the project. The crawler is not just a command-line
utility; it can act as a local knowledge source for agent workflows.

## the part i found most instructive

The most instructive thing in this codebase is not a single algorithm. It is the
boundary between execution models.

The crawler starts in an async world, moves into process-based CPU work, returns
to async control flow, writes into a database that is protected by SQLite WAL, and
coordinates exact-once frontier insertion through a lock.

That sounds like a lot, but it is actually a cleaner mental model than forcing one
tool onto every problem.

The benchmark suite in [`benchmark/benchmark.py`](/Users/sagnikc/Desktop/Projects/Backend_FullStack_Projects/weave/benchmark/benchmark.py)
reinforces that point explicitly. It compares:

- async fetching against threaded and synchronous fetching
- process-based parsing against thread-based and single-threaded parsing
- frontier push throughput under contention

I like that the repo does not just claim the architecture is better. It tries to
measure the reasons.

## current limitations

The code is clean, but it is still intentionally narrow in scope.

Some of the current limitations are:

- no `robots.txt` support
- FIFO-only frontier strategy
- exact-string URL dedup rather than canonicalized URLs
- keyword search only, no ranking or semantic retrieval
- SQLite as the only storage backend
- in-memory crawl job tracking in the API
- no distributed crawling or fault tolerance

There are also a few smaller design choices worth noticing.

The store opens a new SQLite connection per operation and protects writes with a
Python lock. That is a perfectly reasonable way to keep the implementation simple,
but it would likely be the first place to revisit if crawl throughput grew.

Similarly, the MCP server uses a module-level `Store()` with the default DB path,
while the HTTP API lets you inject `db_path`. That is fine for a local tool, but
it is the kind of interface mismatch that shows up once a project grows.

## what i actually learnt

The main lesson from `weave` is that concurrency is not one decision. It is a set
of localized decisions about where the time goes and what kind of contention each
stage creates.

If the program is waiting on the network, `asyncio` is a good fit.

If the program is chewing through HTML, processes are a better fit than threads.

If multiple tasks need to coordinate exact access to shared state, a small lock in
the right place is often simpler and more correct than a more ambitious design.

And if you want a small crawler to feel like a usable system rather than a demo,
you need persistence and query surfaces, not just a loop that prints discovered
URLs.

That is what makes this repository worth studying. It is not trying to be the
biggest crawler or the most feature-complete one. It is a compact example of how
to match Python concurrency tools to the shape of the work.
