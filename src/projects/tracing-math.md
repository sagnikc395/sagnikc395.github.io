---
title: "Decodability is not localization — tracing math errors in Qwen2.5-Math"
date: 2026-09-03
lead: Probing Qwen2.5-Math-1.5B on ProcessBench shows a linear probe decodes "this trace has gone wrong" at AUROC 0.866, yet names the first wrong step in only 28.9% of cases and fires on 39% of fully correct solutions — a study of the gap between ranking and thresholded localization.
topics: [mechanistic-interpretability, probing, llm-reasoning, processbench, qwen, error-detection]
image: https://raw.githubusercontent.com/sagnikc395/tracing-math/main/results/figures/gap.png
subimages:
  - https://raw.githubusercontent.com/sagnikc395/tracing-math/main/results/figures/predictive_results.png
  - https://raw.githubusercontent.com/sagnikc395/tracing-math/main/results/figures/transfer_and_causal.png
  - https://raw.githubusercontent.com/sagnikc395/tracing-math/main/results/figures/method_and_trajectory.png
references:
  - title: tracing-math
    url: https://github.com/sagnikc395/tracing-math
    author: Sagnik Chatterjee
  - title: "REPORT.md — comprehensive report"
    url: https://github.com/sagnikc395/tracing-math/blob/main/REPORT.md
    author: Sagnik Chatterjee
  - title: "Qwen2.5-Math Technical Report"
    url: https://arxiv.org/abs/2409.12122
    author: Yang et al.
  - title: "ProcessBench: Identifying Process Errors in Mathematical Reasoning"
    url: https://aclanthology.org/2025.acl-long.50/
    author: Zheng et al.
  - title: "GSM8K"
    url: https://arxiv.org/abs/2110.14168
    author: Cobbe et al.
  - title: "MATH"
    url: https://arxiv.org/abs/2103.03874
    author: Hendrycks et al.
  - title: "OlympiadBench"
    url: https://arxiv.org/abs/2402.14008
    author: He et al.
  - title: "Omni-MATH"
    url: https://arxiv.org/abs/2410.07985
    author: Gao et al.
---

## What this project does

Language models can write step-by-step math. The question is whether, while **reading** a fixed solution, a model internally registers the moment the reasoning stops being correct — and whether we can read that out.

This project probes `Qwen/Qwen2.5-Math-1.5B-Instruct` on [ProcessBench](https://aclanthology.org/2025.acl-long.50/) traces (GSM8K, MATH, OlympiadBench, Omni-MATH). The model never generates the traces; it reads each one in a single causal forward pass, and a linear probe on the residual stream is asked to predict `invalid_so_far` — 1 if the prefix has already passed the first annotated error, 0 otherwise.

The headline: **decodability is not localization.** Ranking and thresholding tell different stories, and only the second can be deployed.

- **AUROC 0.866 [0.849, 0.884]** on 4,985 held-out boundaries (669 traces) at layer 23 — clearly decodable.
- **Exact first-error accuracy 28.9%**, **correct-trace rejection 61.2%**, **38.8% false alarms** on fully correct solutions, detection **~0.59 steps late** on average.
- **Within-trace AUROC 0.968** — any monotone score with the persistent label looks perfect inside a trace.
- **Transfer:** ranking survives across sources (all 12 off-diagonal AUROCs > 0.739), threshold doesn't (GSM8K → OlympiadBench Process F1 collapses 0.253 → 0.055, 97% false alarms on correct Olympiad traces).
- **Causal test gated inconclusive:** the model's own `P(Yes) - P(No)` verdict on "does this prefix contain an error?" was **below chance (AUROC 0.342)** on held-out boundaries, so the steering assay has no valid behavioral readout to perturb.

All numbers are from frozen artifacts on a single 60/20/20 problem-grouped split (seed 42). No activation patching result is reported — corrections are not yet human-verified.

> Full numbers, intervals, and artifact map: [`REPORT.md`](https://github.com/sagnikc395/tracing-math/blob/main/REPORT.md) (this page is the portfolio summary; the report is the record).

## The gap in one figure

![Decoding versus localization, the late crossing, and transfer](https://raw.githubusercontent.com/sagnikc395/tracing-math/main/results/figures/gap.png)

Mean probe score is 0.341 one step before the error, 0.559 at onset, 0.680 one step after, 0.731 two steps after — the selected threshold is **0.645**. The score ramps, not steps, so a fixed threshold always crosses late. Correct traces drift upward with the same ramp and no error to explain it. The fourth panel shows ranking transfer holding while thresholded F1 collapses when moving from short GSM8K traces to long Olympiad traces.

Local copies (served from this site): `/assets/images/tracing-math/gap.png` · `/assets/images/tracing-math/intervention.png`

## How it works

**Model and data.** `Qwen2.5-Math-1.5B-Instruct` (1,536-dim residual stream, 29 hidden-state indices including embeddings). 3,360 retained ProcessBench traces (40 dropped for >2,048 tokens), 24,909 step boundaries. Each prompt wraps steps as:

```text
[Step 0]
<step text>
<<END_STEP_0>>
...
[Question] Is the reasoning valid through the last step? Answer exactly CORRECT or INCORRECT.
```

States are recorded at the final token of each `<<END_STEP_*>>` marker (causal, so later tokens don't affect earlier boundaries). A natural-token boundary control shows the same signal at the last natural step token.

![Method, score trajectory around the error, and nuisance controls](https://raw.githubusercontent.com/sagnikc395/tracing-math/main/results/figures/method_and_trajectory.png)

**Problem-grouped split.** Problems normalized (whitespace + case fold), SHA-1 grouped by first 16 hex chars, stratified by source × has-error, then SHA-256 ordered into 60/20/20 (test: 669 traces, 432 erroneous, 237 correct; 2,181 positive / 2,804 negative boundaries).

**Probe.** Standardized, class-balanced L2 logistic per layer: `P(y=1|h) = σ(wᵀh + b)`, `C ∈ {0.01, 0.1, 1, 10}` selected by validation AUROC, threshold grid `0.05…0.95 step 0.005` selected by validation **Process F1**, layer selected by validation Process F1 (→ **layer 23, C=0.01, threshold 0.645**), refit on train+val, evaluated once on test with whole-trace bootstrap. Predicted first error = first threshold crossing or -1. Every control gets the same selection budget.

**Experiments.**

| Run | What | Output |
|---|---|---|
| Exp 1 | Extraction + probes + controls + transfer + gated verdict intervention (GPU) | `artifacts/qwen2.5-math-1.5b/` |
| Exp 2 | CPU follow-up on frozen predictions | `artifacts/experiment2_cpu/` |
| 3A | Matched onset transition probe `h[e]-h[e-1]` | `artifacts/experiment3_extended/transition_probe/` |
| 3B | Natural-token vs marker boundary control | `artifacts/experiment3_extended/boundary_control/` |
| 3C | Conditional `N` vs `N+H` nuisance comparison | `artifacts/experiment3_extended/conditional_hidden_state/` |
| 3D | Visible-prefix MiniLM baseline | consolidated in report |
| 3E | Counterfactual patching | pending (135 drafted, 25 withheld, verification gate) |

## What the probe actually does

![Predictive results across layers and error types](https://raw.githubusercontent.com/sagnikc395/tracing-math/main/results/figures/predictive_results.png)

Layer 23 on test: AUROC 0.866, AP 0.843, balanced accuracy 0.780, step F1 0.743, Process F1 0.393, exact trace outcome 0.404, detection somewhere 0.887, within-1-step 0.593, within-2-steps 0.727. The best test AUROC (0.868 at layer 22) was not selected — layer choice was locked on validation.

**Controls (same traces, same budget):** TF-IDF on current step 0.733, position 0.730, shuffled-label 0.518; with equal-budget tuning, joint text+metadata reaches 0.810 and metadata+final-answer (oracle, not deployable) reaches 0.874. Against a matched visible-text baseline (mean-pooled `all-MiniLM-L6-v2`, AUROC 0.753) the hidden probe is ahead, but that is one unpaired post-hoc run — it does not rule out stronger text encoders. Adding hidden state to text+metadata improves AUROC by **+0.059 [0.041, 0.075]**.

**Transfer (layer 23, per-source train → all tests):**

- AUROC holds (mean off-diagonal 0.805 vs diagonal 0.845).
- Process F1 doesn't (mean off-diagonal 0.261 vs 0.336; worst GSM8K→OlympiadBench 0.055 at AUROC 0.753).

These are four sources inside one benchmark construction, not four independent datasets, and say nothing about another model family.

![Transfer matrices and the gated causal assay](https://raw.githubusercontent.com/sagnikc395/tracing-math/main/results/figures/transfer_and_causal.png)

**Temporal checks (post-hoc, not independent):** circularly shifting scores within traces destroys exact localization (null 0.164 vs observed 0.289, p=0.0002) and within-one-step (null 0.436 vs 0.593, p=0.0002). Mean onset jump 0.257 vs matched correct-trace placebo 0.113, difference 0.144 [0.096, 0.193]. Subtracting first-step per trace leaves AUROC 0.881. Transition probe on `h[e]-h[e-1]` gives AUROC 0.769 [0.713, 0.820] (but with placebo reuse up to 46× and residual matching imbalance).

**Failure mode:** false alarms scale with length. Shortest trace quartile: complete-trace accuracy 0.491, correct rejection 0.719; longest: 0.264 / 0.350. By token count, correct rejection falls 0.792 → 0.231. GSM8K 0.512 vs OlympiadBench 0.298.

## Why the causal test is inconclusive

The direction `v = w/‖w‖` scaled by `σᵥ` was steered at `h' = h + α·σᵥ·v` for `α ∈ {-4,-2,-1,0,1,2,4}` on 256 held-out boundaries, read out as `m = P(Yes) - P(No)` under `step-error-yes-no-v1` teacher forcing.

Baseline without steering: **AUROC 0.342, specificity 0.203** (earlier CORRECT/INCORRECT readout was 0.283 / 0). The pipeline gates causal analysis on AUROC > 0.5 with nonzero specificity, so this is recorded as an assay diagnostic, not evidence about the model. Paired changes at every dose include zero, slope -0.00012, no advantage over 20 random orthogonal directions.

![Paired change in verdict score — every interval covers zero](https://raw.githubusercontent.com/sagnikc395/tracing-math/main/results/figures/intervention.png)

Decodability does not imply use ([Hewitt & Liang 2019](https://aclanthology.org/D19-1275/); [Belinkov 2022](https://doi.org/10.1162/coli_a_00422)); steering without a valid readout is unreadable.

## Takeaways

1. **Report the decision rule, not the ranking.** Within-trace AUROC 0.968 and exact localization 28.9% come from the same predictions — AUROC never touches the threshold.
2. **Give the nuisance model the same tuning budget.** An undertuned baseline doubles the apparent gap.
3. **Watch for benchmark bookkeeping.** Final-answer correctness lifts a nuisance model past the probe (0.874 vs 0.866) while being unavailable to any online detector.
4. **Gate causal claims on assay validity.** Without a readout that separates valid/invalid prefixes, a flat dose-response says nothing.

The probe is not a grader: at the selected threshold it flags 38.8% of correct solutions, with correct-rejection varying 0.463 (OlympiadBench) to 0.786 (GSM8K) — a research diagnostic, not a student-facing tool.

## Limitations

One 1.5B model, one frozen split, one seed; `invalid_so_far` rewards accumulated evidence; prompt/step/generator/length shortcuts; 40 traces excluded for context length; transition analysis reuses placebos; single-boundary, single-layer, single-token readout; all post-hoc intervals describe resampling inside a frozen pipeline, not a fresh split.

## Reproducing it

Extraction needs one A100-class GPU; all analyses run on CPU from frozen artifacts.

```bash
uv sync --extra dev
uv run math-error --config configs/project.yaml validate-config
uv run math-error --config configs/project.yaml run-all
uv run math-error --config configs/project.yaml analyze
uv run math-error --config configs/project.yaml fit-conditional
uv run math-error --config configs/project.yaml fit-contextual-baseline
```

Primary GPU workflow and extended analyses are documented in `REPORT.md` §8. Frozen primary config: `artifacts/qwen2.5-math-1.5b/experiment_config.yaml` (dataset fingerprint `447f0a…9784a`, dtype `bfloat16`, batch sizes 16/8 — not the checked-in `configs/project.yaml`).

## Artifact map

All claims trace to `artifacts/qwen2.5-math-1.5b/` (`experiment_config.yaml`, `extraction_identity.json`, `probes/layer_metrics.csv`, `probes/test_predictions.csv`, `probes/controls.csv`, `probes/domain_transfer.csv`, `interventions/behavioral_verdict.json`, `interventions/summary.csv`), `artifacts/experiment2_cpu/`, `artifacts/experiment3_extended/`, and `results/figures/` (`gap.png`, `intervention.png`, `method_and_trajectory.png`, `predictive_results.png`, `transfer_and_causal.png`). See `REPORT.md` §9 for the full map.

ref: [tracing-math](https://github.com/sagnikc395/tracing-math)
