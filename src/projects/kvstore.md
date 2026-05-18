# Building a Distributed Key-Value Store in Go

Distributed systems are easiest to understand when they are made concrete. This
project is a small distributed key-value store written in Go, but it touches many
of the ideas that show up in production storage systems: leader election, log
replication, quorum reads, write-ahead logging, snapshots, TTL expiration,
membership changes, and client-side routing.

The goal was not to build another wrapper around an existing database. The goal
was to build the moving parts directly enough to understand how they interact,
while keeping the system small enough to reason about.

The result is a cluster of Go nodes that expose a simple HTTP JSON API:

```bash
curl -X POST http://127.0.0.1:8000/kv/set \
  -H 'Content-Type: application/json' \
  -d '{"key":"foo","value":"bar"}'

curl 'http://127.0.0.1:8000/kv/get?key=foo'
```

Behind those calls, the request flows through a proxy, reaches a Raft-backed
node, gets replicated through the cluster, is committed by quorum, is written to
a local WAL, and is finally applied to an in-memory map.

## The Shape of the System

At a high level, the system has two executables:

- `kv-node`: a storage node that owns the key-value API, Raft RPC handlers, WAL
  recovery, snapshot compaction, TTL cleanup, and cluster membership endpoints.
- `kv-proxy`: a lightweight HTTP proxy that accepts client requests, selects a
  node through a consistent hash ring, refreshes cluster membership from the
  nodes, and retries leader-only operations against the current leader.

The main packages are:

- `internal/store`: concurrent in-memory key-value storage, TTL handling, command
  application, snapshots, and restore.
- `internal/raft`: leader election, log replication, persistent Raft metadata,
  snapshots, membership changes, and HTTP transport.
- `internal/wal`: JSONL write-ahead log replay plus snapshot compaction.
- `internal/routing`: a consistent hash ring used by the proxy.

The runtime architecture looks like this:

```text
Client
  |
  v
HTTP proxy (:8000)
  |
  v
Consistent hash ring
  |
  +--> Go node (:7001) -- Raft HTTP --> peers
  +--> Go node (:7002) -- Raft HTTP --> peers
  +--> Go node (:7003) -- Raft HTTP --> peers

Each node:
  HTTP KV API -> Raft log -> quorum commit -> WAL append -> in-memory store
                                     |
                                     +-> snapshot compaction
```

The system is intentionally simple: one Raft group replicates the key-value
state across the cluster. The proxy's hash ring gives clients a stable first
node to try for each key, but writes still have to land on the elected Raft
leader. If the proxy hits a follower and receives a conflict, it discovers the
leader through `/status` and retries the request there.

## Why Raft Is the Center of the Design

The hardest part of a distributed key-value store is not the map. It is agreeing
on the order of mutations.

If two clients write the same key through two different nodes, every replica
needs to apply those writes in the same order. If a node crashes and comes back,
it needs to catch up without inventing a different history. If the leader fails,
the cluster needs to elect a new leader without losing committed writes.

That is the job of Raft in this project.

Each node tracks the standard pieces of Raft state:

- `currentTerm`
- `votedFor`
- replicated log entries
- commit index
- last applied index
- snapshot boundary
- cluster membership

The leader accepts client mutations and appends them to its log. Followers accept
`AppendEntries` requests over HTTP JSON RPC. Once a log entry is replicated to a
quorum, the leader advances the commit index. Each node then emits committed log
entries on a commit channel so the storage layer can apply them in order.

That separation is important. Raft decides what is committed. The key-value store
only applies committed commands.

## The Write Path

A write starts at `/kv/set` or `/kv/delete`. The node handler decodes the request
into a `store.Command`, submits it to Raft, and waits for the corresponding log
index to be applied locally before returning success.

That last wait matters. Without it, the API could acknowledge a write merely
because the leader accepted it into memory. This implementation waits for the
write to pass through the Raft commit path and reach the local state machine.

The simplified flow is:

```text
POST /kv/set
  -> decode command
  -> convert TTL to an absolute expiration timestamp
  -> append command to leader's Raft log
  -> replicate to followers
  -> commit after quorum
  -> append command to local WAL
  -> apply command to in-memory store
  -> return {"ok": true, "index": ...}
```

The code also handles an important TTL detail before replication. A client can
send a TTL in seconds, but a replicated command should not depend on when each
replica happens to apply it. The node converts relative TTLs into absolute
expiration timestamps before submitting the command. That means a key with a
five-second TTL expires at the same logical wall-clock point after restart and
across replicas, instead of getting a fresh five seconds every time the WAL is
replayed.

## The Read Path

Reads are deceptively tricky in a replicated system. A follower may have stale
state, and even a leader needs to know it is still the leader before serving a
linearizable read.

This project uses a read-index style path. Before serving `/kv/get` or
`/kv/keys`, the node asks Raft for a read index. The leader confirms it still has
quorum contact, then returns an index that represents a safe point in the log.
The HTTP handler waits until the local state machine has applied through that
index before reading from the in-memory store.

The flow is:

```text
GET /kv/get?key=foo
  -> request Raft read index
  -> confirm leader quorum
  -> wait until local applied index >= read index
  -> read from store
```

This is more expensive than just reading the map, but it keeps the API honest:
clients get a read that is tied to the replicated log rather than a random local
view of state.

## Durability: WAL Plus Raft Metadata

The project has two forms of persistence.

First, Raft metadata is stored in `raft_state.json`. This includes the current
term, vote, membership, retained log, and snapshot metadata. Persisting this
state is required for Raft correctness across restarts. A node must not forget
which term it was in or who it voted for.

Second, committed key-value commands are appended to a JSONL write-ahead log in
`wal.log`. On startup, a node loads `snapshot.json` first and then replays the
remaining WAL commands on top of it.

That gives the node a practical recovery path:

```text
start node
  -> load snapshot.json
  -> replay wal.log
  -> restore in-memory store
  -> load raft_state.json
  -> resume Raft
```

The WAL is intentionally boring: each mutation is one JSON object per line. That
makes it easy to inspect while developing, and it keeps recovery logic small.

## Snapshot Compaction

An append-only WAL is simple, but it cannot grow forever. The project supports
compaction by writing the current key-value state into `snapshot.json` and
truncating the WAL.

Raft has its own snapshot boundary too. When the state machine snapshots, the
Raft node can compact its retained log and remember:

- last included index
- last included term
- snapshot data

This matters for lagging followers. If a follower is too far behind and the
leader no longer has the old log entries, the leader can send an
`InstallSnapshot` request. The follower installs the snapshot, updates its Raft
snapshot boundary, restores the key-value state, and continues replication from
that point.

That is a major step beyond a toy in-memory map. It means the system has a story
for long-running clusters, restarts, and followers that need to recover from a
compacted history.

## Cluster Membership

The cluster supports dynamic add and remove operations:

```bash
curl -X POST http://127.0.0.1:7001/cluster/add \
  -H 'Content-Type: application/json' \
  -d '{"id":4,"url":"http://127.0.0.1:7004"}'

curl -X POST http://127.0.0.1:7001/cluster/remove \
  -H 'Content-Type: application/json' \
  -d '{"id":4}'
```

Membership changes are represented as Raft log entries. That means a node is not
added or removed just because one process updates a local map. The change has to
go through the same replicated commit path as key-value writes.

The proxy also benefits from this. It periodically queries `/cluster/members`
and rebuilds its local hash ring from the current node URLs. That keeps client
routing aligned with the cluster without requiring the proxy to be restarted for
every membership update.

The implementation uses single-step add/remove changes, not Raft joint
consensus. That is a deliberate simplification and an important limitation. It
keeps the project approachable while still demonstrating the mechanics of
replicated configuration changes.

## Concurrency Model

Go is a good fit for this kind of project because the system naturally decomposes
into long-running concurrent loops:

- election timers
- heartbeat replication
- commit notification
- TTL cleanup
- proxy membership refresh
- HTTP request handling

The design uses goroutines for those background tasks, channels for committed
entries and installed snapshots, and mutexes around shared Raft and store state.

One useful boundary is the handoff from Raft to the state machine. Raft owns
ordering and commitment. The key-value layer owns applying commands, maintaining
TTL state, writing the WAL, and producing snapshots. That keeps the internal
contracts understandable even as the system runs concurrently.

## Running It Locally

The cluster can be run directly with Go:

```bash
go run ./cmd/kv-node --id=1 --addr=:7001 --wal-dir=./data/node1 \
  --advertise-url=http://127.0.0.1:7001 \
  --peers=2=http://127.0.0.1:7002,3=http://127.0.0.1:7003

go run ./cmd/kv-node --id=2 --addr=:7002 --wal-dir=./data/node2 \
  --advertise-url=http://127.0.0.1:7002 \
  --peers=1=http://127.0.0.1:7001,3=http://127.0.0.1:7003

go run ./cmd/kv-node --id=3 --addr=:7003 --wal-dir=./data/node3 \
  --advertise-url=http://127.0.0.1:7003 \
  --peers=1=http://127.0.0.1:7001,2=http://127.0.0.1:7002

go run ./cmd/kv-proxy --addr=:8000 \
  --nodes=http://127.0.0.1:7001,http://127.0.0.1:7002,http://127.0.0.1:7003
```

Or with Docker Compose:

```bash
docker compose up --build
```

The repository also includes tests for the store, WAL, hash ring, and Raft
behavior:

```bash
go test ./...
```

## What This Project Teaches

A key-value store sounds simple until the failure cases appear. The interesting
parts are not `map[string]string`; they are the questions around it:

- Who is allowed to accept writes?
- How do replicas agree on mutation order?
- What happens when a node crashes after acknowledging a command?
- How does a restarted node recover state?
- How do reads avoid stale data?
- How does a follower catch up after compaction?
- How does the proxy learn that membership changed?

This project answers those questions with a compact implementation built around
Raft, a durable WAL, snapshots, and HTTP JSON APIs. It is not trying to be a
production database, and it intentionally leaves out harder production concerns
like joint-consensus reconfiguration, authentication, backpressure, metrics,
multi-group sharding, and advanced storage engines.

That is also what makes it useful. The code is small enough to inspect, run, and
modify, but complete enough to show the real shape of a replicated storage
system. It turns the abstract pieces of distributed systems into something you
can start, break, restart, and observe from your terminal.
