# building a zapier clone

## motivation

i kept wiring the same glue together by hand. a webhook from one service, a quick script to reshape the payload, an email or a slack message at the other end, and a cron job somewhere holding it all together. zapier solves this, but i wanted to understand how it actually works under the hood - especially the part nobody talks about, which is how you make sure an event never gets dropped when something downstream is having a bad day.

so i built my own. the goal was to take the core idea behind zapier - one trigger, a chain of ordered actions, run reliably - and implement it as a small set of microservices i could reason about end to end. i wanted the data model to be boring, the reliability story to be explicit, and the whole thing to live in a monorepo so i wasn't fighting four package.jsons every time i changed a shared type.

a few writeups on the transactional outbox pattern were the main reference point. they all confirmed the same intuition: the moment you have a database and a message broker in the same request path, you have a dual-write problem, and the only honest way out is to make the database the single source of truth and let a separate process drain it. that became the design principle.

## how it works

the system has four services. each one is a separate concern with a clear interface to the next.

### 1. the web app

the user lands on a next.js frontend. they sign up, log in, and hit the dashboard - a list of their existing zaps with enable/disable toggles. when they want to build a new one, they go to the editor: pick a trigger from the available list, chain one or more actions in order, publish.

i deliberately kept the editor linear instead of a full graph. 90% of real-world automation is a straight line, and the simplicity pays for itself in UX and in the data model downstream.

### 2. the rest api

a separate express service backs the web app. it exposes `/api/auth` for sessions, `/api/zaps` for CRUD on zaps, and `/api/triggers` and `/api/actions` for the catalog of things a user can pick from. nothing exotic - it's the boring crud layer, and it's boring on purpose. all the interesting behavior lives elsewhere.

splitting the api out from the next.js app meant i could scale user traffic independently from background processing later, and it kept the frontend free to be a thin client.

### 3. the hooks ingress

this is where external services punch in when something happens out in the world. a webhook arrives at the hooks service, and in a single database transaction it writes two rows: a `ZapRun` recording the execution, and a `ZapRunOutbox` row marking it as needing to be dispatched.

both commit, or neither does. this is the entire reliability story in one paragraph, and it's the part i spent the most time getting right.

### 4. the processor

a separate service polls the outbox table, publishes pending runs to kafka, and marks them as dispatched. if the processor crashes mid-loop, the next run picks up where it left off. if kafka is down, rows pile up safely in postgres until it's back. no event is ever lost, and there is no point in the pipeline where two systems can disagree about whether something happened.

once a run is on kafka, downstream consumers can pick it up and execute the actions in order. the same pattern scales out to as many consumers as you want.

## design decisions

**why microservices?** because the scaling profiles are genuinely different. the hooks service has to absorb spiky webhook traffic from the outside world. the processor is steady-state polling. the rest api is bursty user traffic. the web app is mostly static. lumping them into one process means the noisiest neighbor sets the resource budget for everyone.

**why the transactional outbox?** the naive approach is "write to the db, then publish to kafka." this has a dual-write problem - either step can succeed while the other fails, and now your db and your broker disagree about reality. the outbox sidesteps this entirely by making postgres the only thing the request path has to commit to. the broker becomes a downstream concern instead of a correctness one.

**why kafka instead of just calling the next service directly?** because the moment you have more than one consumer of an event, or you need replay, or you want back-pressure that doesn't require a custom queue, you'll be glad it's there. it's overkill for a toy version of this, but the whole point of the project was to learn how the real one would be built.

**why a turborepo monorepo?** four apps and a handful of shared packages would be a nightmare across separate repos. shared db client, shared kafka config, shared zod schemas, shared ui - written once, imported everywhere. one `npm run dev` boots the whole stack. refactoring a zap schema and having the compiler walk you through every place that breaks is how this should always feel.

**why prisma?** mostly for the type generation. the prisma client is the same shape everywhere, the migrations are tracked in git, and the schema doubles as documentation for the data model.

## what i learned

**the data model is the spec.** the whole platform fits in six tables: `User`, `Zap`, `Trigger`, `Action`, `ZapRun`, `ZapRunOutbox`. once those were right, every service basically wrote itself. when i tried to add features and they felt awkward, it was almost always because i was reaching for the wrong table.

**reliability is a pattern, not a library.** the outbox isn't a piece of code i installed - it's a constraint on how the hooks service writes to the database. the moment you internalize the pattern, you stop reaching for clever retry logic and dead-letter queues to paper over a fundamentally racy write path.

**microservices earn their keep at the seams.** every time i was tempted to merge two services back together, the answer was the same: they only look similar because the project is small. the hooks service and the processor have completely different failure modes, and keeping them separate meant i could reason about each one in isolation.

**type-safe shared packages are a superpower in a monorepo.** a zod schema in `packages/types` is the same type the editor form validates, the api accepts, the hooks service receives, and the processor reads off the outbox. there is no serialization boundary i have to remember to keep in sync by hand.

**the visual editor is harder than the backend.** by a lot. building a clean ui for "pick a trigger, chain actions, configure each one" took longer than the entire reliability layer. every automation tool i've ever used now has my sympathy.

## setup

the project is a turborepo monorepo with npm workspaces.

```bash
git clone https://github.com/sagnikc395/zapier.git
cd zapier
npm install
npm run dev
```

other useful scripts:

- `npm run build` — build all apps and packages
- `npm run lint` — lint the monorepo
- `npm run check-types` — typecheck the monorepo
- `npm run format` — format with prettier

you'll need a running postgres and kafka for the full pipeline. the prisma schema lives in `packages/db` and migrations run from there.

## what's next

- **more built-in actions.** right now email is the headline action. slack, sheets, and a generic http action are the obvious next ones.
- **a real action runner.** the processor currently hands runs off to kafka; i want a dedicated consumer service that executes the action chain step by step, with per-step retry policies and dead-letter handling.
- **run history in the dashboard.** every `ZapRun` is already in the database - surfacing them in the ui with status, duration, and per-step output is mostly a frontend job.
- **observability.** structured logs across services correlated by zap run id, plus a basic metrics surface for queue depth and outbox lag.

## references

- [pattern: transactional outbox](https://microservices.io/patterns/data/transactional-outbox.html)
- ref: [zapier](https://github.com/sagnikc395/zapier)
