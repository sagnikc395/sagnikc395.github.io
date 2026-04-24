---
title: Building FlowForge: A Distributed Workflow Engine with Temporal
date: 2026-04-24
lead: Building a distributed workflow engine to understand what durable execution,
  retries, compensation, and operational visibility actually look like in code.
topics: [python, distributed-systems, temporal, workflows]
image:
subimages:
---

# motivation

I wanted to build something that lived in the space between a typical web API and
the kind of infrastructure problems you run into in real distributed systems.
Simple CRUD apps are fine for learning frameworks, but they do not force you to
deal with the hard parts: partial failure, retries, long-running coordination, and
what happens when one side effect succeeds and the next one does not.

That is the gap FlowForge was built to explore.

The concrete problem is order fulfillment. It sounds simple until you model it as
a real multi-step transaction:

- check inventory
- reserve stock
- charge the customer
- update the warehouse system

If the payment goes through and the warehouse update fails, you do not just have
an exception. You have a consistency problem. That is the class of problem I
wanted the project to handle directly.

## what i built

FlowForge is a distributed workflow engine prototype built in Python with FastAPI
on the front end and Temporal as the orchestration layer underneath. The API
accepts orders and starts a workflow asynchronously. A Temporal worker executes
activities on a task queue, and the workflow maintains durable state as it moves
through the fulfillment steps.

The system has four main layers:

- a FastAPI service that starts and inspects workflows
- a Temporal workflow that orchestrates the fulfillment saga
- activity functions that execute the side effects
- engine state stores that expose inventory, payment, warehouse, and workflow
  visibility

ref: [flowforge](https://github.com/sagnikc395/flowforge)

## the workflow layer

The core of the project is a `FulfillmentWorkflow` that runs a sequence of steps
with explicit compensation registered after each durable side effect.

The happy path looks like this:

1. `check_inventory`
2. `reserve_inventory`
3. `process_payment`
4. `update_warehouse`

Each activity runs with a timeout and retry policy. That part is important because
distributed workflow code becomes much simpler when retries are treated as a
normal condition instead of an edge case.

The workflow keeps a structured state object with:

- overall status
- current step
- completed steps
- whether compensation was triggered
- failure reason
- a timestamped event log

That last piece turned out to matter more than I expected. It is one thing to know
that a workflow failed. It is much more useful to know that it failed during
`process_payment`, entered compensation, then successfully ran `release_inventory`
and `refund_payment` in reverse order.

## saga compensation

The architectural idea behind FlowForge is the Saga pattern.

Instead of trying to wrap every external side effect in one giant distributed
transaction, each step gets a corresponding undo operation:

- reserving inventory can be undone by releasing inventory
- charging a payment can be undone by refunding the payment
- updating the warehouse can be undone by reverting the warehouse record

The workflow registers those compensations as it goes. If a downstream step fails,
the compensator unwinds the successful steps in reverse order.

That reverse ordering is the subtle but essential detail. If you charge the user
before you update the warehouse, then on failure you need to revert the warehouse
first and refund the user after that. The rollback sequence has to mirror the
forward sequence.

This is the first place the project stopped feeling like a normal API and started
feeling like workflow infrastructure. You are no longer just handling success and
failure. You are explicitly modeling how the system returns to a safe state.

## durable execution changes how you write code

One of the most interesting parts of working with Temporal is that it pushes you to
separate orchestration from side effects.

The workflow decides what should happen and in what order. The activities do the
actual I/O. That boundary is useful because it forces the control plane of the
system to stay deterministic, while the messy external work stays isolated inside
retryable activity functions.

In practice, that led to code that was much easier to reason about than a large
async function with inline API calls, database writes, retry loops, and exception
handling all mixed together.

It also changes how you think about API design. The `POST /orders` endpoint does
not block until the workflow finishes. It starts the workflow and returns a
`workflow_id` immediately. Clients can query status later. That is a better fit
for work that may outlive a single HTTP request.

## visibility and operations

One mistake in small workflow demos is that they show orchestration but ignore
operability. That makes the system look cleaner than it really is.

I wanted FlowForge to expose the engine state directly, so I added operational
endpoints for:

- listing known workflows
- querying workflow status
- viewing inventory state
- inspecting payment records
- viewing warehouse updates
- getting an engine-wide snapshot of current state

This is still prototype-level visibility, but it changes the feel of the project.
Without these endpoints, the workflow engine is mostly hidden behind Temporal. With
them, the state transitions become inspectable from the application boundary.

## what broke during implementation

The most immediate issue was that the repository had drifted into an in-between
state. The activities depended on `flowforge.store`, but that module was missing.
That meant the worker could not actually execute the order workflow end to end.

Rebuilding that backend ended up clarifying the architecture. I added explicit
stores for:

- inventory, with available and reserved counts
- payments, with idempotent charge semantics and refund tracking
- warehouse updates, including reversal state
- workflow registration, so the API can list runs it has started

This also forced a useful question: what kind of project is FlowForge supposed to
be right now? A polished demo, or a real distributed engine?

The honest answer is somewhere in the middle. It now behaves like a real workflow
prototype, but it still uses in-memory state stores instead of durable backing
services.

## the distributed part

FlowForge is distributed in the sense that the API service, Temporal server, and
worker can run as separate processes and coordinate through Temporal’s task queue
and event history. The important property is not that there are many nodes doing
the same thing. It is that workflow progress survives worker restarts, network
hiccups, and retried activity execution.

That is a different style of distributed systems work than building your own
consensus algorithm. Here, the hard problem is not leader election or log
replication. It is making long-running business processes reliable in the presence
of partial failure.

Temporal handles the durable event history and workflow replay model. FlowForge
adds the application semantics on top: what the steps are, what the compensations
are, and what operators can inspect from the API.

## what i actually learnt

The first thing I learnt is that "distributed systems" is too broad a category to
be useful by itself. Building a workflow engine forces a very different set of
questions than building a replicated database.

The second thing is that compensations are not a side detail. They are the core
design problem. Once a workflow crosses service boundaries, failure recovery stops
being an implementation detail and becomes part of the business logic.

The third thing is that visibility is part of correctness. A workflow engine that
can recover but cannot explain what happened is not very helpful in production.
Operators need state, event history, and an obvious way to inspect in-flight work.

The last thing is that a durable workflow system lets you write business process
logic at a much higher level than a pile of ad hoc retries and rollback code. That
is the real appeal of the model. You stop writing scattered error handling and
start writing explicit process definitions.

## what is still missing

There is still a clear line between the current project and a production-grade
workflow engine:

- the state stores are in-memory, not PostgreSQL-backed
- Temporal integration tests still need a live server
- there is no authentication or multi-tenant isolation
- there are no rate limits, dead-letter flows, or workflow archival policies
- metrics and tracing are still missing

Those are not cosmetic gaps. They are the difference between a good prototype and
something I would trust as shared infrastructure.

Still, the project now demonstrates the part I cared about most: how to model a
distributed business process so that failure is expected, rollback is explicit, and
workflow progress is visible instead of implicit.
