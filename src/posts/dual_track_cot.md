---
title: "Dual-Track CoT: Budget-Aware Stepwise Guidance for Small LMs"
date: 2025-01-15
tags: [nlp, llm, chain-of-thought, reasoning, fine-tuning, process-supervision]
---

# Dual-Track CoT: Budget-Aware Stepwise Guidance for Small LMs

*Course project for CS685 Advanced Natural Language Processing, UMass Amherst, Fall 2025. Joint work with Atharva Patil and Sricharan Ramesh. Code on [GitHub](https://github.com/atharvadpatil/DualTrack-COT).*

*Read the full [technical report](../../static/assets/Dual_Track_CoT_Technical_Report.pdf)*

## Motivation

Chain-of-thought prompting works well for large models, but smaller ones (~8B parameters) still fall apart on multi-step math reasoning. The standard remedies — self-consistency (Wang et al., 2023), Tree-of-Thoughts (Yao et al., 2023), critique-revise loops (Zheng et al., 2024) — improve accuracy but at significant token cost, and none of them offer step-level control during generation. Most existing process-supervised approaches like STEPCO (Wu et al., 2024) and Math-Shepherd (Wang et al., 2024) intervene only *after* a full chain has been generated, meaning tokens get wasted on steps that follow an undetected early mistake.

We wanted to explore whether separating step generation from step evaluation — and doing both with fine-tuned small models — could give us reasonable accuracy under hard token constraints. The practical target is on-device or cost-constrained settings where you can't sample 40 chains and majority-vote.

## Approach

The system has two components, both built on Llama 3.1 8B Instruct (4-bit quantized via bitsandbytes, fine-tuned with QLoRA through Unsloth):

**Decomposer**: generates the next reasoning step given the problem and all previously accepted steps. Trained on a custom stepwise reformulation of GSM8K where each problem is expanded into T training instances — one per step in the gold solution — with the input being the problem plus partial history and the target being the next gold step. This yielded ~34k instances from 7,473 problems. The output format is constrained to either `STEP: <computation>` or `FINAL_ANSWER: <number>`.

**Evaluator**: scores a candidate step on a 0–3 scale and returns a short feedback sentence. Trained on PRM-800K, a process reward modeling dataset with step-level quality labels. The scoring rubric is deliberately coarse: 3 = correct and helpful, 2 = mostly correct with minor issues, 1 = partially correct with important mistakes, 0 = wrong or irrelevant.

At inference, they interact in a loop: the Decomposer proposes a step, the Evaluator scores it, and if the score exceeds a threshold (>1) the step is accepted. Otherwise the Evaluator's feedback is passed back as a hint and the Decomposer retries (up to a fixed limit). A global token budget tracks consumption across both models.

### Rejection Cache

A recurring problem in early experiments was the Decomposer getting stuck regenerating minor rephrasings of the same bad step. Each failed attempt costs Evaluator tokens for zero information gain.

We added a rejection cache that normalizes steps into "math fingerprints" — stripping natural language and retaining only numbers and arithmetic operators. Before calling the Evaluator, the system checks whether the fingerprint duplicates an already-accepted step or matches a previously rejected low-scoring step. If so, it synthesizes feedback asking the Decomposer to try a different sub-calculation, without spending Evaluator tokens.

We also tried an embedding-based variant using `all-MiniLM-L6-v2`. It performed worse (60% vs 70% accuracy at the same budget) because embeddings can't distinguish `10 + 20 = 30` from `10 + 20 = 40` — they look nearly identical in the embedding space. The lexical fingerprint approach is crude but avoids this failure mode.

### What We Dropped

Two ideas that didn't survive early experiments:

- **Multi-criterion scoring** (logical validity, relevance, consistency, efficiency, token cost as separate dimensions). The Evaluator couldn't produce stable scores across multiple criteria — it would often contradict itself between dimensions. We collapsed everything into a single 0–3 score.
- **Beam search over steps**. Beams collapsed to near-identical steps due to greedy token generation, wasting budget without improving diversity. We went with single-path generation plus retries instead.

## Results

Evaluated on 50 held-out GSM8K problems. We report 95% Wilson confidence intervals since n=50 is small enough that normal approximations are unreliable.

### Unconstrained Setting

| Method | Accuracy | 95% CI |
|--------|----------|--------|
| Plain CoT (single model, direct answer) | 78.0% | [64.8%, 87.2%] |
| Dual CoT, few-shot only, no fine-tuning | 24.0% | [14.3%, 37.4%] |
| Fine-tuned Decomposer only (no Evaluator) | 68.0% | [54.2%, 79.2%] |
| Fine-tuned Dual CoT | 72.0% | [58.3%, 82.5%] |

The non-fine-tuned Dual CoT at 24% was the clearest result: naive prompted multi-step reasoning actively hurts when the models aren't trained for their roles. The models couldn't produce calibrated intermediate steps, the Evaluator gave noisy scores, and the system rarely even produced the `FINAL_ANSWER` token.

Fine-tuning recovers most of the gap. The Decomposer alone reaches 68%, and adding the Evaluator brings it to 72%. The 4-point difference between these isn't statistically significant at n=50 (the CIs overlap), but the Dual CoT variant exposes interpretable intermediate reasoning — you can inspect exactly where and why the model went wrong.

The plain CoT baseline at 78% is worth discussing. It benefits from the model seeing the entire problem in a single forward pass without the overhead of structured interaction. Our system pays a tax for the step-by-step protocol: more calls, more formatting tokens, more opportunities for the Evaluator to mis-score a good step. The question is whether this tax buys you something under constrained budgets.

### Token-Constrained Setting

We varied the global token budget from 100 to 600 tokens, running with and without the rejection cache:

- At 100 tokens: 12% accuracy (both variants). Not enough budget to complete most problems.
- At 300 tokens: ~60%. Most simple problems are solvable.
- At 600 tokens: 70% (both variants converge).
- The rejection cache gave consistent +2 point gains at intermediate budgets (200, 400, 500 tokens) — exactly where token savings matter most.

The cache never hurts and helps when resources are scarce. At high budgets the system can recover from redundant steps anyway, so the cache becomes irrelevant.

## Error Analysis

We manually inspected all 50 trajectories. The failure taxonomy:

**Evaluator mis-scoring** was the most frequent issue. Three flavors:

1. *Over-penalizing correct steps*: the Decomposer produces a valid step, the Evaluator marks it wrong and pushes the trajectory toward a worse interpretation. This is actively harmful — correct progress gets derailed.

2. *Approving conceptually wrong steps*: the Evaluator checks local arithmetic but misses global errors. E.g., the Decomposer misreads "150%" as "0.15" — the subsequent multiplication is internally consistent so the Evaluator approves it. Or the Decomposer hallucinates specific calendar years when the problem only provides ages, and the Evaluator accepts it because the arithmetic within the hallucinated timeline is valid.

3. *Missing loops*: the Decomposer repeats the same content for multiple steps, and the Evaluator keeps scoring it highly. No progress despite high token usage.

**Decomposer ignoring feedback** was a distinct pattern. The Evaluator correctly identifies an error and provides a useful hint, but the Decomposer keeps regenerating the same flawed structure. This suggests that conditioning on natural-language hints isn't sufficient to redirect the model's generation when the underlying reasoning plan (not just a single arithmetic detail) needs to change.

**Conceptual errors in decomposition** clustered around problems involving tracking quantities over time — motion, rates, inventory. The Decomposer would lose track of conserved quantities or misapply relationships between stages. These errors look locally plausible at each step but accumulate toward wrong answers. The Evaluator, trained only on step-level ratings, has no mechanism to detect this kind of global drift.

**Arithmetic errors surviving evaluation** were less frequent but showed that even explicit step-level scoring leaves gaps when math is embedded in free-form text.

Compared to the plain CoT baseline, our system fails differently. Plain CoT tends to make a single early algebraic mistake and never revisits it. The Dual CoT system gets local computations right more often but is vulnerable to evaluator-induced detours, looping, and conceptual drift. In many failed cases, the correct answer was one or two conceptual fixes away, but the interaction loop couldn't recover.

## My Contributions

I was responsible for:

- Fine-tuning and optimization of both models for structured reasoning, including working within Colab Pro memory constraints (sequence lengths, batch sizes, gradient accumulation)
- Construction and curation of the stepwise GSM8K training dataset and preparation of PRM-800K evaluation data
- Systematic benchmarking of the fine-tuned Dual CoT against the base Llama model across all configurations
- Qualitative error analysis on Problems 16–30 and 46–50

## Takeaways

**Process supervision helps but the evaluator is the bottleneck.** Step-level scoring catches errors that would propagate in standard CoT, but when the Evaluator is wrong, it's worse than having no evaluator at all. Training it only on scalar ratings without explicit correction supervision limits its usefulness. A natural next step is training the Evaluator on hint-generation or correction-focused datasets.

**Token budgets as an experimental lens.** Imposing hard budgets exposed which parts of the system waste computation (repeated evaluations of similar bad steps) and motivated the rejection cache. It also forced us to think about the interaction protocol's overhead cost — every structured turn consumes formatting tokens that a single-pass approach doesn't need.

**Symbolic matching > learned similarity for math.** The embedding-based cache conflates numerical correctness with semantic similarity. For tasks where the difference between right and wrong is a single digit, exact symbolic matching after normalization is more appropriate than dense retrieval.

**Collaboration requires calibration.** Two uncalibrated small models working together performed far worse than a single model answering directly. The models need to be specifically trained for their roles in the pipeline. This is consistent with the broader lesson that multi-agent systems need coordinated training, not just coordinated prompting.

## Future Work

Three directions that seem most promising:

1. **Hint-supervised Evaluator training** — constructing datasets where the Evaluator is trained to output both a score and a targeted explanation of what's wrong, trained explicitly on correction examples rather than just ratings.

2. **Revision-supervised Decomposer training** — building training data of the form (problem + bad step + evaluator hint) → corrected step, so the Decomposer learns to actually incorporate feedback rather than just seeing it in context.

3. **Tiny Recursive Models (TRMs)** for multi-pass refinement of intermediate reasoning states. Recursive architectures align naturally with our step-based framework and might help with the conceptual drift problem by enabling structured, iterative correction.

---

*CS685 Advanced NLP, Fall 2025, UMass Amherst. Collaborators: Atharva Patil, Sricharan Ramesh.*
