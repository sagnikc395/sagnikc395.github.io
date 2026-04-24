---
  title: A Distributed Key-Value Store with Raft
  date: 2026-04-24
  lead: Building a distributed in-memory key-value store from scratch to understand
   how consensus algorithms actually work under the hood.
  topics: [python, distributed-systems, raft, consensus]
  image:
  subimages:
---

  # motivation

  I had been reading about distributed systems for a while. CAP theorem, eventual
  consistency, linearizability -- the theory made sense on paper. But I kept
  running into the same wall: I could describe how Raft worked at a high level, but
   I had no real sense of what made it hard to implement, or where the subtle bugs
  lived.

  The honest version is that I wanted to build something that could survive a node
  going down and keep serving requests correctly. Not a toy that faked it, but
  something where the correctness guarantees were real.

  ## what i built

  The project is a 3-node replicated key-value store written entirely in Python,
  using only the standard library. No external dependencies at runtime. The system
  has three layers: a Raft consensus module that handles agreement between nodes,
  an in-memory store with optional per-key TTL, and a proxy that sits in front of
  the cluster and routes requests using consistent hashing.

  ref: [kv-store](https://github.com/sagnikc395/kv-store)

  ## the raft layer

  Raft is supposed to be the "understandable" consensus algorithm. After
  implementing it, I think that reputation is earned -- but understandable does not
   mean simple.

  The core loop is this: nodes start as followers. If a follower does not hear from
   a leader within a randomized timeout (I used 300 to 500 milliseconds), it
  promotes itself to candidate, increments its term, votes for itself, and fires
  `RequestVote` RPCs to every peer. If it collects a strict majority of votes, it
  becomes leader. The randomized timeout is the key detail -- without it, two nodes
   could time out simultaneously every single time and the cluster would never
  elect a leader.

  Once a leader is elected, it sends `AppendEntries` RPCs to replicate log entries.
   A write is committed only after a majority of nodes have acknowledged it. The
  leader then advances its commit index and applies the entry to the state machine.

  The part that took me the longest to get right was the log consistency check.
  Before a follower accepts new entries, it verifies that the `prev_log_index` and
  `prev_log_term` in the request match what it has locally. If they do not match,
  it rejects the request and the leader decrements `next_index` for that peer and
  retries. This is how a node that fell behind and rejoined the cluster catches up
  -- the leader walks back until it finds the point where the logs agree, then
  replays everything forward.

  ## the part not in the paper

  One thing the Raft paper does not specify is what happens when a leader becomes
  partitioned from the rest of the cluster. Vanilla Raft says: followers will
  eventually time out and elect a new leader. The old leader will eventually step
  down when it gets a response with a higher term. But in the meantime, the
  partitioned leader sits there accepting writes that it cannot commit, blocking
  the client.

  To reduce that window, I added a leader isolation detector. Every heartbeat
  round, the leader tracks whether a majority of `AppendEntries` responses came
  back successful. If the leader has not seen quorum acknowledgment within a
  bounded timeout (the minimum of the election timeout and 125 milliseconds), it
  steps itself down to follower immediately. This is a liveness improvement that is
   not in the original paper but shows up in production Raft implementations.

  Another small correctness fix: when a node reverts to follower state, `voted_for`
   should only be cleared when the incoming term is strictly greater than the
  current term. Clearing it unconditionally means a node could grant two votes in
  the same term to different candidates, which can cause a split-brain.

  ## the write-ahead log

  The WAL is simpler than the consensus layer but just as important. Every
  committed command (a set, delete, or get that went through Raft and got applied
  to the store) is written to a JSON-lines file with an explicit `fsync` call after
   each write. On restart, the node replays the WAL line by line and rebuilds its
  in-memory state before starting the Raft server.

  The WAL stores applied commands, not Raft log entries. This means a restarted
  node comes back as a follower at term zero and re-syncs its Raft log from the
  cluster, but its key-value state is already restored from disk. The trade-off is
  that Raft metadata (current term and voted_for) is not persisted, which
  technically violates the durability requirement in the Raft paper. In practice,
  for a three-node cluster where at most one node is ever down, this does not cause
   correctness issues -- but it is the kind of thing that would need to be fixed
  before calling this production-ready.

  ## the proxy and routing

  The proxy sits in front of the cluster and handles all client requests. It uses a
   consistent hash ring to route each key to a node. Each physical node gets 100
  virtual nodes on the ring (hashed as `node#0` through `node#99` using MD5), and
  key lookup is a binary search over the sorted list of virtual node hashes. This
  gives O(log n) routing and distributes keys evenly without a central directory.

  The proxy does not do leader-aware routing. It hashes a key to a node and sends
  the request there. If that node is not the leader, the Raft layer rejects the
  write. In the current implementation this means clients can see failures during
  elections. Fixing this properly would require the proxy to either redirect to the
   known leader or the node to forward the request to the leader on behalf of the
  client.

  ## deployment

  The full cluster runs with Docker Compose: three nodes with named volumes for WAL
   persistence and a proxy container wired to all three. The cluster tolerates a
  single node failure -- with two nodes still up, the remaining nodes can still
  form a quorum and elect a leader.

  ## what i actually learnt

  The first thing is that correctness in distributed systems is defined relative to
   failure scenarios you have to think about explicitly. Writing code that works
  when nothing goes wrong is easy. The hard part is deciding what happens when a
  message is delayed, a node restarts mid-write, or a leader is partitioned from
  exactly half the cluster.

  The second thing is that Raft's strength is that it serializes all decisions
  through a single leader. This makes reasoning about correctness much easier
  compared to algorithms that allow concurrent writes from multiple nodes. The cost
   is that writes are blocked during elections and the leader is a bottleneck. That
   trade-off is often worth it.

  The third thing is that the gap between "I understand this algorithm" and "I can
  implement this algorithm correctly" is significant. I had read the Raft paper
  twice before starting this project and still got the log consistency check wrong
  on the first pass. There is no substitute for building it.
  
