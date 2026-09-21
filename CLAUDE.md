# CLAUDE.md — Production Engineering Standards

> Purpose: this file exists so that when I (Claude) am "vibe-coded" into building
> a real, company-grade system, I don't just write code that works on my laptop —
> I write code that survives real traffic, real failures, and real scale.
> Read this before writing or reviewing ANY backend/infra code in this repo.
> If a request conflicts with this file, apply this file's defaults and tell the
> user what you added and why (one line, not a lecture).

---

## 0. The One Rule

**Every feature has two versions: the happy-path version and the "it's 2am and
this is on fire" version. Ship the second one by default.** That means: assume
the network fails, assume the DB is slow, assume traffic 100x's overnight,
assume another dev deploys while you're mid-request, assume the user double
clicks submit. Design for that, don't bolt it on later.

---

## 1. Every API endpoint gets this by default (no need to ask)

When writing *any* HTTP endpoint or service call, always include, without
being asked:

- **Timeouts** on every outbound call (DB, HTTP, queue). No call waits forever.
  Pick sane defaults (e.g. 3–5s for internal, longer for known-slow ops) and
  make them configurable, not hardcoded magic numbers scattered everywhere.
- **Retries with exponential backoff + jitter** for transient failures
  (network blips, 502/503/429). Cap retry count. Never retry blindly on
  writes unless the operation is **idempotent** (see §4).
- **Rate limiting** on anything public-facing (per-IP, per-user, per-API-key).
  Use a token bucket / sliding window; return `429` with `Retry-After`.
- **Input validation at the boundary** — never trust client input. This is
  also your first line of defense against SQL Injection, XSS, and SSRF
  (see §8).
- **Structured logging + a request/trace ID** on every request so a single
  failure can be followed end-to-end (see §7 Observability).
- **Health check endpoints** (`/healthz` liveness, `/readyz` readiness) from
  day one — not added right before the first deploy.

Don't gold-plate a throwaway internal script with all of this — match the
weight of the guardrail to the blast radius of the thing you're building.

---

## 2. Reliability & Resilience Patterns

| Concept | When Claude should apply it |
|---|---|
| **Timeouts** | Every network/DB call, always. |
| **Retries** | Only on idempotent ops or reads; cap attempts (3–5). |
| **Exponential Backoff + Jitter** | Always pair with retries — never fixed-interval retry, it causes thundering herds. |
| **Circuit Breakers** | Any call to a downstream service that can degrade or cascade-fail (payment processor, third-party API, a flaky internal service). Trip open after N failures, half-open probe to recover. |
| **Idempotency** | Any write endpoint that might be retried (payments, order creation, webhook handlers). Use an idempotency key from the client, store it, dedupe on it. |
| **Backpressure** | Anywhere a fast producer can overwhelm a slow consumer (queues, streaming ingestion). Don't just buffer infinitely — apply limits and shed load deliberately. |
| **Dead Letter Queues** | Any queue consumer — messages that fail repeatedly must go somewhere inspectable, not vanish or infinite-retry-loop. |
| **Distributed Transactions / Saga Pattern** | Multi-service writes that must stay consistent (e.g. "charge card + create order + reserve inventory"). Prefer Saga (choreography or orchestration) with compensating actions over 2PC. |
| **Race Conditions / Deadlocks** | Anywhere shared mutable state is touched concurrently. Use proper locking (see §3) and think through interleavings, don't assume "it'll probably be fine."|
| **Chaos Engineering** | Mention as a practice for mature systems — deliberately kill instances / inject latency in staging to verify the above actually works. |

---

## 3. Data Layer

- **Database Indexing** — every query that filters/sorts/joins on a column
  needs to be checked against existing indexes. Don't add indexes blindly
  either (write cost trade-off) — explain the query plan when it matters.
- **Query Optimization / N+1 Queries** — never loop-and-query. Batch, join,
  or use dataloader-style patterns. This is the #1 silent scale-killer in
  vibe-coded apps.
- **Connection Pooling** — always use a pool (e.g. pgbouncer, built-in ORM
  pool), never open a raw connection per request.
- **Read Replicas** — route read-heavy traffic away from the primary once
  a single DB instance becomes the bottleneck; keep replication lag in mind
  (reads can be stale — don't read-your-own-write from a replica right after
  a write without accounting for this).
- **Sharding / Partitioning** — only introduce when a single node genuinely
  can't hold/serve the data or load. Don't shard on day one of an MVP;
  do design the schema so a shard key exists later without a rewrite.
- **Optimistic vs Pessimistic Locking** — optimistic (version column /
  compare-and-swap) for low-contention updates; pessimistic (`SELECT ...
  FOR UPDATE`) for high-contention critical sections. Pick deliberately,
  document which one and why.
- **Distributed Locks** (e.g. Redis/Zookeeper-based) — only when a
  single-process lock genuinely isn't enough (multiple app instances need
  mutual exclusion on the same resource). Always set a lock TTL — a lock
  that can never expire on crash is a future outage.
- **Database Migrations / Schema Versioning** — every schema change is a
  migration file, never a manual `ALTER TABLE` against prod. Migrations
  should be backward-compatible during rollout (old code + new schema must
  coexist for zero-downtime deploys).
- **CAP Theorem / Eventual Consistency** — when introducing any distributed
  store or cache, explicitly state which side of CAP you're choosing and
  where the app might show stale data, and whether that's acceptable.

---

## 4. Architecture & Communication

- **Load Balancing** — any service with >1 instance needs a load balancer
  (L4 or L7) in front; pick algorithm (round robin, least-connections) based
  on workload shape.
- **Reverse Proxies** — use one (nginx/Envoy/Caddy) in front of app servers
  for TLS termination, static assets, and as a natural place for rate
  limiting/headers, rather than reinventing it in app code.
- **API Gateways** — once you have more than a couple of services, put a
  gateway in front for auth, rate limiting, routing, and versioning in one
  place instead of duplicating that logic per service.
- **Service Discovery** — anything beyond a handful of static services needs
  a discovery mechanism (DNS-based, Consul, k8s Service) rather than
  hardcoded IPs/hostnames.
- **Message Queues / Pub-Sub / Event-Driven Architecture** — use these to
  decouple slow or unreliable work (emails, image processing, notifications)
  from the request/response path. Don't do slow work synchronously in an
  HTTP handler.
- **Webhooks** — must be signed/verified, must be idempotent-safe on the
  receiving end (senders retry), and should ack fast then process async.
- **WebSockets / Long Polling / Server-Sent Events** — pick based on need:
  SSE for server→client streams, WebSockets for bidirectional real-time,
  long polling only as a fallback. Always plan for reconnect/backoff on the
  client.
- **gRPC vs REST vs HTTP/2 & HTTP/3** — mention the tradeoff (gRPC for
  internal service-to-service perf, REST/JSON for public APIs and
  debuggability) rather than defaulting to one out of habit.
- **API Versioning / Semantic Versioning** — public APIs get a version in
  the path or header from day one; breaking changes bump major version,
  never silently change existing behavior.

---

## 5. Scaling

- **Horizontal vs Vertical Scaling** — default recommendation is horizontal
  (more instances) for statelessness and resilience; vertical only as a
  stopgap. This means the app **must be stateless** (no in-memory session/
  cache that only one instance knows about) unless explicitly designed
  otherwise.
- **Autoscaling** — define based on a real signal (CPU, queue depth,
  request latency), not guesswork; always set min/max bounds.
- **CDN / Edge Caching** — static assets and cacheable public GET responses
  go through a CDN. Think about **cache invalidation** explicitly (cache
  keys, TTLs, purge-on-deploy) — this is famously one of the two hard
  problems in computer science for a reason.
- **Caching (app-level)** — cache expensive/read-heavy computations, but
  always define: TTL, invalidation trigger, and what happens on a cache
  stampede (use locking or request coalescing for hot keys).
- **Cold Starts / Serverless Limits** — if using serverless/Lambda-style
  compute, account for cold start latency and concurrency limits; don't
  assume infinite scale for free.
- **Cost Optimization** — call out when a design choice has real cost
  implications (chatty inter-service calls, over-provisioned DB, no
  autoscale-down) so it's a visible decision, not an accidental bill.

---

## 6. Deployment & Infra

- **CI/CD** — every change goes through automated build/test/deploy, not
  manual `scp`. Include a test stage before deploy.
- **Docker** — containerize services with minimal, pinned base images;
  multi-stage builds to keep images small; never bake secrets into images.
- **Kubernetes / Helm Charts** — when orchestration is warranted, use
  liveness/readiness probes (see below), resource requests/limits, and
  Helm/IaC for repeatable deploys instead of manual `kubectl apply`.
- **Infrastructure as Code (Terraform, etc.)** — infra is defined in code
  and reviewed like code, not clicked together in a console.
- **Health Checks / Liveness & Readiness Probes** — liveness = "should this
  instance be restarted," readiness = "should this instance receive
  traffic." They are not the same check — a service can be alive but not
  ready (e.g. still warming cache).
- **Blue-Green / Canary / Rolling Deployments** — default to rolling deploys
  with health checks gating progression; use canary for risky changes;
  blue-green when you need instant rollback capability.
- **Rollbacks** — every deploy must be revertible in one command/click. If
  it's not, that's a gap to fix before shipping the feature, not after.
- **Feature Flags** — decouple deploy from release for risky features;
  allows instant kill-switch without a rollback.
- **Build Caching / Dependency Hell** — pin dependency versions, use lock
  files, cache build layers in CI to keep iteration fast.

---

## 7. Observability

- **Logging** — structured (JSON), includes request/trace ID, never logs
  secrets or PII in plaintext.
- **Metrics** — expose app + infra metrics (latency, error rate, throughput,
  saturation — the "four golden signals").
- **Distributed Tracing** — once more than one service is involved in a
  request, add tracing (e.g. OpenTelemetry) so a slow request can be
  attributed to the actual bottleneck service, not guessed at.
- **Monitoring / Alerting** — alerts fire on symptoms users feel (latency,
  error rate) not just resource metrics, and route to a human via on-call
  tooling, not just a Slack channel nobody watches.
- **SLOs / SLIs / Error Budgets** — define what "good enough" means
  numerically (e.g. "99.9% of requests < 300ms") so alerting and roadmap
  tradeoffs (reliability work vs new features) have a shared reference.
- **Latency: P99 / Tail Latency** — always look at p99/p999, not just
  average — average hides the users having a bad time.
- **On-call / Postmortems** — every significant incident gets a blameless
  postmortem with concrete action items, not just "we'll be more careful."

---

## 8. Security (non-negotiable, apply by default)

- **Secrets Management** — secrets in env vars via a secrets manager
  (Vault, AWS Secrets Manager, etc.), never committed to the repo, never
  hardcoded.
- **IAM** — least-privilege access for every service/role; no shared
  god-mode credentials.
- **OAuth / JWT Rotation** — use standard OAuth flows, not homegrown auth;
  rotate signing keys and set short JWT expiry with refresh tokens.
- **TLS everywhere**, both **encryption in transit** and **encryption at
  rest** for sensitive data.
- **CORS / CSRF** — configure CORS explicitly (never `*` with credentials);
  use CSRF tokens for state-changing form submissions from browsers.
- **SQL Injection / XSS / SSRF** — parameterized queries always, escape/
  sanitize output, validate and allowlist any server-side outbound URL
  fetches driven by user input.
- **WAF / DDoS Protection** — public-facing services sit behind a WAF/CDN
  with basic DDoS mitigation, not raw-dogging the origin server.

---

## 9. Disaster Recovery

- **Backups** — automated, tested (a backup you've never restored isn't a
  backup), with a defined retention policy.
- **Failover / Multi-Region** — define RTO/RPO expectations even for a
  single-region MVP, and know what the plan is before you need it.
- **Network Partitions / Clock Skew / DNS** — call these out as real
  failure modes in distributed designs (e.g. "what happens if this node
  can't reach that node" isn't a hypothetical, it will happen).

---

## 10. When Claude should push back or ask

Don't silently add every pattern above to a weekend prototype — that's
over-engineering in the other direction. Ask (briefly, one question) or
state an assumption when:
- The user says "MVP" / "prototype" / "just testing" but the request implies
  production scale (payments, auth, public launch) — flag the mismatch.
- A pattern has a real cost/complexity tradeoff (sharding, distributed
  locks, multi-region) — state the tradeoff in one line before implementing.
- Otherwise: apply the relevant defaults from this file automatically and
  briefly note what was added and why, e.g. *"Added retry+backoff and an
  idempotency key on the checkout endpoint since it's a payment write."*

---

## 11. Quick pre-ship checklist

Before considering a feature "done," Claude checks:
- [ ] Timeouts + retries on all outbound calls
- [ ] Idempotent where retries/duplicates are possible
- [ ] Rate limited if public-facing
- [ ] Indexed queries, no N+1
- [ ] Structured logs with trace ID
- [ ] Health checks wired up
- [ ] Migrations, not manual schema edits
- [ ] Secrets not hardcoded
- [ ] Rollback path exists
- [ ] Stateless (or explicitly and deliberately not)
