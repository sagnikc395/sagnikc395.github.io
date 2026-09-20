---
title: "DAgger: imitation learning as no-regret online learning"
date: 2026-09-10
paper: https://proceedings.mlr.press/v15/ross11a/ross11a.pdf
authors: Ross, Gordon and Bagnell, AISTATS 2011
venue: CS690S
tags: [imitation-learning, dagger, distribution-shift, online-learning]
references:
  - title: "Efficient Reductions for Imitation Learning (SMILe)"
    url: https://proceedings.mlr.press/v9/ross10a/ross10a.pdf
    author: Ross and Bagnell, 2010
  - title: "ALVINN: An Autonomous Land Vehicle in a Neural Network"
    url: https://proceedings.neurips.cc/paper/1988/hash/812b4ba287f5ee0bc9d43bbf5bbe87fb-Abstract.html
    author: Pomerleau, 1988
---

## The problem it is solving

Behaviour cloning trains a policy with supervised learning on states the _expert_
visited. The trouble is that once the learner acts, it visits states the expert
never did, and its mistakes there compound: an error early in the episode moves
the learner further off-distribution, which makes the next error more likely.
The paper makes this precise — with per-state error `ε` under the expert's
distribution, the cost of the cloned policy can degrade as `O(T² ε)` in the
horizon `T`, not `O(T ε)`.

This is the part I want to keep straight: the quadratic term is not a loose bound
for pathological cases, it is the honest prediction for any learner whose
training distribution is fixed by someone else's behaviour.

## The algorithm

DAgger is almost embarrassingly simple:

1. Start with a dataset `D` of expert demonstrations and train `π̂₁`.
2. At iteration `i`, roll out `π_i = β_i π* + (1 − β_i) π̂_i` — the expert
   mixed in with probability `β_i`.
3. Record the **states visited** by that rollout, and ask the expert what it
   would have done at each one.
4. Aggregate those labelled states into `D` and retrain on all of `D`.

The mixing schedule only has to satisfy `β̄_N → 0`; `β_i = pⁱ⁻¹` works, and
`β₁ = 1` makes the first iteration plain behaviour cloning.

## Why the reduction matters

The framing I found genuinely useful is the online-learning one. Each iteration
defines a loss `ℓ_i(π) = E_{s ~ d_{π_i}}[ ℓ(s, π) ]` — the learner's loss under
the distribution _it_ induced — and the sequence of these losses is an online
convex optimisation problem. Retraining on the aggregate dataset is
Follow-the-Leader, which is no-regret on strongly convex losses. Plugging a
no-regret guarantee in gives a policy whose cost is `J(π*) + O(T ε_N)`: linear
in the horizon.

So the algorithmic content is "collect data from your own state distribution,
and never throw any of it away", and the theoretical content is "that procedure
is a no-regret algorithm, therefore the quadratic blow-up goes away".

## What it costs

The expert has to be queryable _interactively_, on states the learner chose, not
just able to produce demonstrations offline. That is a much stronger requirement
than it sounds — a human labelling actions for states they never would have
reached is slow, and often the labels are poor because the human has no context
for how the agent got there. The paper's own experiments (Super Tux Kart, Super
Mario Bros, handwriting recognition) all have cheap programmatic or replayable
experts, which is exactly where the assumption is easy.

## Open questions for me

- The bound is on the _surrogate_ classification loss. How tight is the link to
  task cost when the action space is continuous and errors are not symmetric?
- Aggregating forever means the early, near-expert-distribution data keeps its
  weight. Is there a principled reason not to down-weight it as the learner
  improves, other than that it breaks the FTL argument?
- The obvious modern connection is to on-policy data collection in RLHF-style
  pipelines: same "train on your own distribution" instinct, different label
  source.
