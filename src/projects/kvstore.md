---
title: Building a Distributed Key-Value Store in Go
date: 2026-04-24
lead: a small distributed key-value store in go that builds raft, log replication, WAL, snapshots, and cluster membership from scratch to make distributed systems concrete.
topics: [go, distributed-systems, raft, consensus, key-value-store]
image: 
subimages:
---

## motivation

distributed systems are easiest to understand when you make them concrete. i had read the raft paper, worked through textbook diagrams of log replication, and understood the concepts well enough to talk about them. what i had not done was build the moving parts directly enough to feel how they interact.

so i built a small distributed key-value store in go. the goal was not to produce something production-ready. the goal was to touch the ideas that show up in real storage systems: leader election, log replication, quorum reads, write-ahead logging, snapshots, TTL expiration, membership changes, and client-side routing. all of them, in one place, at a scale i could actually read.

the result is a cluster of go nodes with a simple HTTP JSON API:

```bash
curl -X POST http://127.0.0.1:8000/kv/set \
  -H 'Content-Type: application/json' \
  -d '{"key":"foo","value":"bar"}'

curl 'http://127.0.0.1:8000/kv/get?key=foo'
```

behind those calls, the request flows through a proxy, reaches a raft-backed node, gets replicated through the cluster, is committed by quorum, is written to a local WAL, and is finally applied to an in-memory map.

## how it works

the system has two executables and four main packages.

### the executables

`kv-node` is the storage node. it owns the key-value API, the raft RPC handlers, WAL recovery, snapshot compaction, TTL cleanup, and the cluster membership endpoints.

`kv-proxy` is a lightweight HTTP proxy that sits in front of the cluster. it accepts client requests, selects a node through a consistent hash ring, periodically refreshes cluster membership by querying the nodes, and retries leader-only operations against the current leader when a follower rejects them.

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

### raft

the hardest part of a distributed key-value store is not the map. it is agreeing on the order of mutations.

if two clients write the same key through two different nodes, every replica needs to apply those writes in the same order. if a node crashes and comes back, it needs to catch up without inventing a different history. if the leader fails, the cluster needs to elect a new one without losing committed writes.

that is the job of raft in this project. each node tracks the standard pieces of raft state: current term, voted-for, replicated log entries, commit index, last applied index, snapshot boundary, and cluster membership. the leader accepts client mutations and appends them to its log. followers accept `AppendEntries` requests over HTTP JSON RPC. once a log entry is replicated to a quorum, the leader advances the commit index. each node then emits committed entries on a channel so the storage layer can apply them in order.

that separation matters. raft decides what is committed. the key-value store only applies committed commands.

### the write path

a write starts at `/kv/set` or `/kv/delete`. the node handler decodes the request into a command, submits it to raft, and waits for the corresponding log index to be applied locally before returning success.

that last wait is important. without it, the API could acknowledge a write the moment the leader accepted it into memory. this version waits for the write to pass through raft's commit path and reach the local state machine.

there is one TTL detail worth calling out. a client can send a TTL in seconds, but a replicated command should not depend on when each replica happens to apply it. the node converts relative TTLs into absolute expiration timestamps before replication. that means a key with a five-second TTL expires at the same logical wall-clock point across all replicas and after restart, instead of getting a fresh countdown every time the WAL is replayed.

### the read path

reads are deceptively tricky. a follower may have stale state, and even a leader needs to confirm it is still the leader before serving a linearizable read.

this project uses a read-index path. before serving `/kv/get` or `/kv/keys`, the node asks raft for a read index. the leader confirms it still has quorum contact, then returns an index representing a safe point in the log. the handler waits until the local state machine has applied through that index before reading from the map.

it is more expensive than just reading the map directly. but it keeps the API honest: clients get a read tied to the replicated log rather than a random local snapshot.

### durability

the project has two forms of persistence.

raft metadata lives in `raft_state.json`. this includes the current term, vote, membership, retained log, and snapshot metadata. a node must not forget which term it was in or who it voted for across restarts. raft correctness depends on it.

committed key-value commands are appended to a JSONL write-ahead log in `wal.log`. on startup, a node loads `snapshot.json` first and then replays the remaining WAL commands on top of it.

```text
start node
  -> load snapshot.json
  -> replay wal.log
  -> restore in-memory store
  -> load raft_state.json
  -> resume raft
```

the WAL is intentionally boring: one JSON object per line per mutation. easy to inspect while developing, easy to replay, and small enough to understand without a reference manual.

### snapshot compaction

an append-only WAL cannot grow forever. the project supports compaction by writing the current key-value state into `snapshot.json` and truncating the WAL. the raft node also maintains its own snapshot boundary so it can compact the retained log.

this matters for lagging followers. if a follower is too far behind and the leader no longer has the old log entries, the leader sends an `InstallSnapshot` request. the follower installs the snapshot, updates its raft boundary, restores the key-value state, and continues replication from that point.

### cluster membership

the cluster supports dynamic add and remove:

```bash
curl -X POST http://127.0.0.1:7001/cluster/add \
  -H 'Content-Type: application/json' \
  -d '{"id":4,"url":"http://127.0.0.1:7004"}'

curl -X POST http://127.0.0.1:7001/cluster/remove \
  -H 'Content-Type: application/json' \
  -d '{"id":4}'
```

membership changes are raft log entries. a node is not added by updating a local map. the change goes through the same replicated commit path as any key-value write.

the proxy benefits from this too. it periodically queries `/cluster/members` and rebuilds its hash ring from the current node URLs. client routing stays aligned with the cluster without restarting the proxy for every membership update.

the implementation uses single-step add/remove changes, not raft joint consensus. that is a deliberate simplification. it keeps the project approachable while still showing the mechanics of replicated configuration changes.

## design decisions

**why build raft from scratch?** there are good raft libraries available for go. using one would have produced a more realistic system but hidden the thing i actually wanted to understand. the whole point was to write the election timers, the heartbeat loop, the log replication, and the snapshot transfer by hand.

**why HTTP JSON for raft RPC?** a real system would use a binary protocol like gRPC for inner-cluster communication. HTTP JSON is slower, but it makes the traffic readable during development. you can `curl` a node's raft endpoints and see exactly what is flowing. that transparency was worth the performance cost for a learning project.

**why go?** the system naturally decomposes into long-running concurrent loops: election timers, heartbeat replication, commit notification, TTL cleanup, proxy membership refresh, and HTTP request handling. go's goroutines and channels fit that shape well. the design uses goroutines for background tasks, channels for committed entries and installed snapshots, and mutexes around shared state. that concurrency model was easy to reason about.

## what i learned

**the hard part is not the map.** `map[string]string` is three lines. everything around it is where the real work is: who accepts writes, how replicas agree on order, what happens when a node crashes after acknowledging a command, how reads avoid stale data, how a follower catches up after compaction.

**TTL across replicas is a subtle problem.** i initially stored TTL as a relative duration and only caught it when i tested restart behavior. a replayed WAL should not give every key a fresh countdown. converting to absolute timestamps before replication fixed it, and it was one of those bugs that only surfaces once you actually run the recovery path.

**waiting for applied state is necessary.** the first version returned success after the leader committed the entry in raft. it felt right but was wrong: the response reached the client before the local state machine had applied the write. reads immediately after a write could miss it. waiting for the applied index to catch up fixed the consistency.

**joint consensus is the right answer for membership changes.** this project uses single-step add/remove, which means there is a window where the cluster can have two majorities and elect two leaders. raft's joint consensus protocol handles this properly. i understood the problem from reading about it. building single-step first made the tradeoff feel real in a way that reading alone did not.

## setup

run the cluster directly with go:

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

or with docker compose:

```bash
docker compose up --build
```

run the tests:

```bash
go test ./...
```

## references

- [In Search of an Understandable Consensus Algorithm](https://raft.github.io/raft.pdf)
- [Designing Data-Intensive Applications](https://dataintensive.net)