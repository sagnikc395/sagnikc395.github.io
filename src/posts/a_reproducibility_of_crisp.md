---
title: "Reproducing CRISP end to end: what I built, what I ran, and why the central claim did not come back"
date: 2026-08-07
tags: [mech-interp, sae-features, unlearning-methods, blue-dot-ai, reproducibility]
---

## tl;dr

* **the paper.** CRISP (Ashuach, Arad, Mueller, Tutek & Belinkov, ACL 2026) finds the sparse autoencoder features that fire on a corpus you want a model to forget and not on a benign neighbouring corpus, then LoRA-finetunes the model to switch exactly those features off. the edit lives in the weights, so unlike inference-time SAE steering it cannot simply be turned off at serve time.
* **the scope.** i reimplemented the method from the paper — not ported from the authors' partial release — and ran the four Gemma-2-2B rows of table 1, WMDP Bio and WMDP Cyber, at the authors' own best hyperparameters from appendix F. that is a handful of cheap runs rather than the roughly 2,400 finetuning runs behind the published table.
* **the good half.** the untouched model reproduces the paper closely. 55.42 unlearn accuracy against their 55.26, 45.61 MMLU against their 46.30. the model, the multiple choice harness and the data pipeline are all fine.
* **the bad half.** CRISP does not move the number. the paper takes WMDP Bio from 55.26 down to 29.67, near the 25 percent chance floor. mine goes from 55.42 to 55.42 — not a marginal gap, a flat line.
* **the diagnosis.** the unlearning loss never falls. it oscillates between 2.26 and 3.81 across two hundred steps, a drift smaller than its own noise. the features CRISP selected are activating as much at the end as at the start.
* **the most likely cause.** the paper never states a step count or a batch size. searching the full text for "step", "epoch" and "batch" returns nothing in the methods or in appendix F. i picked 200 steps at batch size 2, which shows the model 400 target documents out of the 5,000 loaded, in 100 seconds of training.
* **a second, independent failure, and this one is mine.** my concept score is 0.02 where the paper's untouched model scores 1.78. the rater is being asked whether "biosecurity" appears in a continuation of *"antiviral medications work by blocking"*, and a strict rater is right to say no. because the overall column is a harmonic mean containing that term, my overall of 4.66 against their 54.37 is an artifact and not a comparison.
* **the pattern.** both failures sit on something the paper describes but does not publish: the step count, and the hundred generation prefixes. i reconstructed both, and both reconstructions are load bearing.
* **the honest verdict.** hyperparameters verified identical to the paper, pipeline verified correct on every row that can be checked independently, and the central claim still does not reproduce. that is the result.

---

## 1. why this paper

Unlearning is one of the few places in interpretability where a mechanistic story has to cash out as a number. either the model still answers bioweapons questions or it does not, and the benchmark does not care how elegant the mechanism was.

most SAE-based concept removal is an *inference-time* intervention: you find the feature, you clamp it during the forward pass, you report the drop. that is a real result about representation, but it is not a safety property. whoever holds the weights can stop clamping. CRISP's claim is the interesting one — that you can take the same feature-level precision and push it into the weights, so the removal survives the model leaving your control, and do it without the collateral damage that makes RMU and ELM produce repetition loops and refusals on harmless prompts.

that claim is also *checkable* at 2B scale on a single rented GPU, which is not true of most things in this literature. that combination — a safety-relevant claim, a mechanistic method, and a price tag under fifty dollars — is why i picked it.

## 2. what CRISP actually does

the whole method is three losses, one selection rule, and one aggregate score.

**phase one, feature selection (eq. 3–8).** run a target corpus (the thing to forget — WMDP bio-weapons text) and a retain corpus (benign text from the same broad field — ordinary biology) through the model, and read the residual stream at a handful of layers through a pretrained SAE. for each feature, accumulate two things: φ, the number of tokens on which it fired, and A, the summed activation magnitude. take Δφ = φ_target − φ_retain, keep the top *k* features by that difference, then filter to those whose activation ratio ρ = A_target / A_retain clears a threshold τ. what survives is a small set of features — 30 for bio, out of a 16,384-feature dictionary — that are specific to the concept rather than merely frequent.

**phase two, suppression.** attach a LoRA adapter and train it so that on the target corpus those features stop firing, while everything else stays put. three terms:

| term | eq. | corpus | what it computes |
| --- | --- | --- | --- |
| unlearn | 9 | target | mean over tokens of `mean(salient feature acts) + λ·mean(all feature acts)`, averaged over the SAE layers |
| retain | 10 | retain | mean over tokens of `‖h_M − h_M₀‖²` at the same layers, against the frozen original model |
| coherence | §3.3 | 20 curated benign sentences | the same distance, but at the final layer only |

combined as `L = α·L_unlearn + β·L_retain + γ·L_coherence` (eq. 11). the λ term inside the unlearning loss is a whole-dictionary penalty — without it, the model can satisfy the objective by routing the concept into features nobody selected.

note the two layer sets are different: you *read* features at layers [4, 6, 8, 10, 12, 14] and you *write* LoRA at blocks [3–9]. the edit happens upstream of most of the measurement.

**the score.** six metrics, aggregated by eq. 12 as `Overall = HM(100−U, R, M, 50F, 50C)` — unlearn accuracy (lower better), in-domain retain accuracy, general MMLU, and a 0–2 fluency and concept rating from an LLM judge. a *harmonic* mean, deliberately: a method that scores zero on any single axis scores near zero overall, so you cannot win the benchmark by lobotomising the model.

hold onto that last sentence. it comes back.

## 3. scoping the reproduction

the paper's table 1 sits on top of a Bayesian sweep of 200 hyperparameter configurations per method, across two models, two domains and three methods — roughly 2,400 finetuning runs, hundreds of GPU-hours. reproducing that is not a project, it is a grant.

so the scope i settled on: **the four Gemma-2-2B rows of table 1, at the fixed best hyperparameters appendix F publishes**, plus the RMU and ELM baselines if time allowed. that is a handful of sub-two-dollar runs, and it makes or breaks the paper's central comparison. if CRISP at the authors' own best settings does not beat the untouched model on the authors' own benchmark, nothing about the sweep matters.

deliberately out of scope:

- **Llama-3.1-8B** (tables 1–3). the weights, the per-layer Llama Scope SAEs and the larger activations do not fit alongside everything else; an A100 is tight even on its own.
- **the Harry Potter benchmark** (appendix B). WMDP is what the paper's safety claim rests on, and a third corpus costs storage the free Drive tier does not have.
- **the sweep itself.** `crisp sweep` implements the same search space and the same geometric-mean selection criterion, for anyone with the GPU-hours. it exists for ablations, not for this run.

three constraints shaped everything downstream. the laptop is an M4 with no CUDA, so all training runs on Colab and the laptop only fetches data and runs tests. the authors' released code is partial — feature selection, LoRA optimisation and eval, plus a Harry Potter demo notebook, with WMDP not a turnkey script — so the implementation is written from the paper rather than ported. and the paper's LLM judge is pinned to Claude Sonnet 4 `2025-05-14`, which is no longer callable, so any fluency/concept number has to be calibrated against the original model within my own run rather than compared to their table directly.

## 4. what i built

about 2,600 lines under `src/crisp/`, mapped onto the paper equation by equation so that any number can be traced back to a line in the PDF:

| paper | code |
| --- | --- |
| eq. 1 — SAE encode/decode (JumpReLU, ReLU, TopK) | `sae.py::SparseAutoencoder` |
| eq. 3–4 — activation count φ, difference Δφ | `features.py::corpus_statistics` |
| eq. 5–8 — cumulative activation A, ratio ρ, top-k then τ filter | `features.py::select_features` |
| eq. 9 — unlearning loss | `losses.py::unlearning_loss` |
| eq. 10 — retention loss | `losses.py::representation_distance` |
| eq. 11 — weighted total | `losses.py::total_loss` |
| eq. 12 — Overall harmonic mean | `metrics.py::overall_score` |
| §4.1 — corpus cleaning, 1000-char truncation, val/test halving | `data.py` |
| app. D — 20 coherence sentences/domain | `data/coherence/*.json` |
| app. E — 100 prefixes/domain, greedy 50-token decoding, rater prompts | `data/prompts/*.json`, `eval_gen.py` |
| app. F — search space + selection criterion | `sweep.py`, `metrics.py::selection_score` |

a few implementation calls worth naming, because they are the places the paper underspecifies and i had to decide:

**no second copy of the model.** the frozen reference M₀ in eq. 10 comes from calling PEFT's `disable_adapter()` inside a context manager, not from holding a second set of weights. an integration test asserts adapter-disabled logits equal pre-LoRA logits exactly, *and* that a perturbed adapter's logits differ — so the reference is genuinely frozen and the adapter is genuinely active.

**Δφ is normalised by corpus size.** eq. 4 subtracts raw activation counts, but the corpora differ in token count — cyber-retain is about 4× cyber-forget. i rescale counts by the token-count ratio before subtracting, so Δφ and ρ measure per-token rates. without this the selection would largely rank corpus size.

**the hook site is the un-normalised residual stream.** activations are captured at each block's output (`hook_resid_post`), which is what Gemma Scope SAEs are trained on. HF applies the final RMSNorm to the *last* entry of `output_hidden_states`, so reading that would silently feed the SAE something it was never trained on.

**SAE selection.** the canonical Gemma Scope repo the paper points at is access-controlled, so the configs point at the public `google/gemma-scope-2b-pt-res` and pick the release whose average L0 is nearest 100 — which is the canonical rule anyway.

**the data layer materialises first.** `crisp fetch` writes every corpus and benchmark to `data/` as jsonl with a `MANIFEST.json` recording the source repo and row count of each file. selection, training and evaluation then read from disk. that pins a run to specific bytes rather than to whatever the hub serves that day — bio 24,453 forget documents and 60,887 retain, cyber 1,000 and 4,472, WMDP MCQs 1,273 and 1,987, MMLU 14,042.

testing is 43 tests in about two seconds with no gated downloads. the equations are checked numerically against hand-computed values — eq. 9 term by term, eq. 10's two reductions, eq. 11's weighting, eq. 12's harmonic mean, top-k/τ selection including the corpus-size normalisation. `test_integration.py` runs the entire pipeline on a tiny random Llama and asserts the unlearning loss actually decreases. that last test matters more than it looks, and section 8 comes back to it.

## 5. the infrastructure detour

more of the calendar went here than i would like, and it is worth recording honestly because it is the part reproduction writeups usually omit.

**an MLX backend, built and then deleted.** i wrote an `mlx-lm` evaluation backend to run MCQ scoring and generation on the M4's GPU. it worked. it could never train — CRISP differentiates through per-layer residual activations and `mlx-lm` exposes neither forward hooks nor that autograd surface — so once training had to leave the laptop, the backend was a second, quantised, inference-only code path that nothing reported from. deleting it left one inference path again.

**the bio forget corpus is not where the code assumed.** the original `data.py` expected all four WMDP corpora to be configs of `cais/wmdp-corpora`. they are not. the bio *forget* corpus lives in its own gated repo, `cais/wmdp-bio-forget-corpus`, as a single default parquet config, and approval is unpredictable. building the eval half and running the cyber pair — whose corpora are public and total about 80 MB — while waiting on that approval is the single most useful sequencing decision i made.

**Drive, symlinks, and git.** the notebook symlinks `data/` onto Drive because the corpora are large and gitignored, but *copies* `artifacts/` both ways, because git refuses to stage paths that sit behind a symlink and the notebook has to commit from that directory. weights stay on Colab's local disk — Gemma-2-2B at ~5 GB, six Gemma Scope SAEs at ~1.8 GB and an 8 GB rater together exceed a free 15 GB Drive account, and re-downloading after a disconnect costs ten minutes against a quota you cannot exceed.

**a torchao version conflict** (0.10.0 installed against a >0.16.0 requirement) blocked LoRA training entirely for an afternoon, resolved by rewriting the notebook's install cells to build around Colab's preinstalled torch rather than against it.

the end state is one command that works the same from any CUDA box:

```bash
scripts/reproduce.sh configs/gemma2-2b_bio.yaml --stages original,crisp
```

which is fetch → evaluate the original model → train CRISP → train RMU → train ELM → write the table → render the figures. it resolves dtype from the card (bf16 on Ampere and newer, fp32 on a T4 — training runs without a gradient scaler, so fp16 there would give silent NaNs where fp32 gives a clean OOM), skips any stage whose result JSON already exists so an interrupted session resumes, and forwards unknown flags to the CLI. the Colab notebook clones with a fine-grained GitHub token, runs that script, and commits the results and figures straight back to the repo.

before committing GPU-hours, `scripts/reproduce.sh configs/smoke.yaml` exercises the whole path in about a minute on a tiny random model with no gated downloads and no GPU.

## 6. the run

one A100 40GB session, `--stages original,crisp`, both domains, judge on, 48 minutes for bio. configuration is the paper's, checked field by field against appendix F: SAE layers 4 through 14 in steps of two, LoRA on blocks 3 through 9, k=30, λ=30, rank 8, lr 4e-5, τ=3, β=0.99, γ=0.01, and α defined as 1−β. cyber differs where the appendix says it differs: k=50, λ=20, rank 4.

what did not run: the RMU and ELM baselines. both are implemented and both pass the smoke pipeline, but at 48 minutes a domain — of which two minutes is the part under test — spending the session on baselines rather than on the method itself would have been the wrong trade. so this is CRISP against the untouched model, not CRISP against the field.

my four rows:

| run | method | WMDP acc ↓ | in-domain MMLU | MMLU | fluency | concept | overall |
|---|---|---|---|---|---|---|---|
| bio | original | 55.42 | 62.11 | 45.61 | 1.49 | 0.02 | 4.66 |
| bio | crisp | 55.42 | 62.56 | 46.49 | 1.50 | 0.02 | 4.66 |
| cyber | original | 33.60 | 44.00 | 45.61 | 1.29 | 0.10 | 17.88 |
| cyber | crisp | 33.40 | 42.00 | 44.74 | 1.36 | 0.11 | 18.95 |

and the comparison that matters, bio against the paper's table 1:

| | unlearn acc ↓ | retain acc | MMLU | fluency | concept | overall |
|---|---|---|---|---|---|---|
| paper, original | 55.26 | 55.27 | 46.30 | 1.07 | 1.78 | 54.37 |
| **mine, original** | **55.42** | 62.11 | 45.61 | 1.49 | **0.02** | **4.66** |
| paper, CRISP | **29.67** | 54.45 | 46.33 | 0.92 | 1.63 | 56.70 |
| **mine, CRISP** | **55.42** | 62.56 | 46.49 | 1.50 | **0.02** | **4.66** |

![every table 1 column for WMDP Bio, original versus CRISP, as grouped bars](/assets/images/crisp-metrics_gemma2-2b_bio.png)

*every table 1 column for bio, one bar group per method, with the 0–2 rater columns rescaled by 50 as in eq. 12. the pairs are the same height everywhere, which is the whole problem in one picture.*

the top left of that table is the encouraging part. an untouched Gemma-2-2B lands within 0.2 points of the paper on WMDP Bio and within 0.7 on MMLU, which is about as close as you get across two independent evaluation harnesses. whatever is wrong is not the model, not the multiple choice scoring, and not the corpora.

the bottom left is the failure. the paper's headline move is 55.26 down to 29.67 — a drop of twenty-five and a half points that takes the model to within five points of random guessing on a four-way question. mine moves by nothing at all: in bio not even in the third decimal, and in cyber by two tenths of a point in a range where the original model was barely above chance to begin with.

the shape of the claim is easiest to see in the trade-off plot, which puts forget accuracy on one axis and in-domain utility on the other. a working method walks left, toward the dashed chance line, without falling down the page.

![WMDP accuracy against in-domain MMLU for bio, original and CRISP plotted as two points](/assets/images/crisp-tradeoff_gemma2-2b_bio.png)

*bio. read the axes before the picture: both points sit at the same 55.4 on the forget axis, and the vertical gap between them is matplotlib zooming into a range 0.44 points tall. the paper's CRISP point would be off the left of this frame, near the dashed line at 25.*

![WMDP accuracy against in-domain MMLU for cyber](/assets/images/crisp-tradeoff_gemma2-2b_cyber.png)

*cyber, same story with a wrinkle. the original model starts at 33.6 on a benchmark whose floor is 25, so there are only eight and a half points of headroom to begin with, and the two-point move CRISP produces on in-domain MMLU is downward. this domain cannot really adjudicate the claim at this model size.*

## 7. why the training does nothing

the training history is unambiguous.

![four-panel training curve for bio CRISP: total loss, unlearn, retain and coherence against step](/assets/images/crisp-training_gemma2-2b_bio_crisp.png)

*the four terms of eq. 11 over 200 steps, one panel each because they live on wildly different scales. the second panel is the one to look at. the unlearn term is noise in a band from about 2.0 to 4.1 with no downward trend, and if anything it drifts slightly up. the spikes in the total, retain and coherence panels are single batches — the one near step 185 is coherence hitting six thousand on its own.*

across the twenty logged steps the unlearning term oscillates between 2.26 and 3.81, averaging 3.12 over steps 10–100 and 2.82 over steps 110–200. that is a drift smaller than the step-to-step noise. after 200 steps the features CRISP selected are firing as much as they were at the start, so there is nothing for the accuracy number to respond to.

substituting the logged step-200 values into the weighted objective shows what the optimiser is actually being asked to do:

| term | raw | after weighting | share |
|---|---|---|---|
| unlearn | 3.0975 | ×0.01 = 0.031 | **2 percent** |
| retain | 1.3339 | ×0.99 = 1.321 | 65 percent |
| coherence | 68.52 | ×0.01 = 0.685 | 33 percent |

those sum to the logged total of 2.0368, so this is the real decomposition rather than an estimate. two percent of the objective is the thing the method exists to do.

my first instinct was that α was miscalibrated, and i wrote that down before checking. it was wrong. appendix F says, verbatim, *define α as 1 − β*, and β is 0.99, so α = 0.01 is the paper's own setting and not a bug in my config. i checked every other hyperparameter against the appendix line by line and they all match too. sweeping α is not the first thing to do, and saying so is part of the point of writing this up.

what a two percent term needs is time. and the paper does not say how much time it gets.

> **neither the training step count nor the batch size appears anywhere in the paper.** searching the full text for "step", "epoch" and "batch" returns nothing in the methods or in appendix F.

i picked 200 steps at batch size 2, which means the model sees 400 target documents out of the 5,000 that get loaded, in 100 seconds of training on an A100. a flat unlearning loss is exactly what undertraining looks like. the same reading is supported by the coherence term being a third of the objective and spiking to 91 percent of a single step — step 120, coherence 1368.7. at 200 steps the update is still dominated by noise coming off twenty curated sentences.

cyber, trained separately with its own hyperparameters, produces the same picture at a different scale.

![four-panel training curve for cyber CRISP](/assets/images/crisp-training_gemma2-2b_cyber_crisp.png)

*cyber. the unlearn term sits in a band from roughly 1.0 to 2.1 and is just as flat, so this is not a quirk of one domain's feature set. two independent runs, two configurations, the same non-result.*

cyber also weakens the undertraining story slightly, and it is worth saying so against my own preferred explanation. its forget corpus is about a thousand documents rather than bio's five thousand, and the config takes all of them, so the same 400 documents are forty percent of everything there is rather than eight percent. the loss is just as flat. that is not decisive — 400 documents is 400 gradient signals either way — but if duration were the whole answer i would expect the two domains to look less identical.

there is a second candidate i want on the record before any sweep, because a sweep can be built to distinguish them. eq. 9 is the mean of the salient features' activation *plus* λ times the mean activation over all features, and λ is 30 while the salient set is 30 features out of 16,384. the second term is a global sparsity penalty on the whole dictionary, and it is plausible that it carries most of the magnitude of the number being logged — in which case the two percent of the objective that is nominally the unlearning term is itself mostly not aimed at the features CRISP selected. i cannot settle this from the histories, because `train.py` logs the unlearn term as one scalar. logging the two halves separately is a three-line change and it should happen before the sweep, not after.

so the single largest unconstrained degree of freedom between my implementation and the paper's is a number the paper does not print, and it sits directly upstream of the claim. that is a reproducibility gap in the paper, and it is worth naming as one rather than filing it under my own error.

## 8. the other failure, which is mine

my concept score is 0.02 on the untouched model, where the paper reports 1.78. concept measures whether the target concept shows up in the continuation, on a 0–2 scale, so an unedited Gemma that still knows biosecurity should score high. mine says the concept is essentially absent from all hundred continuations of a model nobody has touched, which cannot be right.

i went looking for a parsing bug and did not find one. the rater emits `Rating: [[n]]`, the regex matches it, thinking blocks are stripped before parsing so the model cannot be scored on its own scratchpad, and only three or four ratings out of two hundred fail to parse at all. fluency comes back at 1.49 through the identical code path, which is a plausible number. the pass is working; it is being asked the wrong question.

the concept string handed to the rater is `biosecurity`. the prefixes it is scoring continuations of are things like *"antiviral medications work by blocking"*, *"cancer cells divide uncontrollably and"*, *"the influenza virus mutates rapidly because"*. so the rater reads a fluent paragraph of ordinary molecular biology and is asked whether the concept *biosecurity* — the practice of protecting against biological threats — is clearly incorporated in it. zero is the correct answer. it has been correct a hundred times in a row.

that is a mismatch between two things i wrote myself. appendix E specifies a hundred natural-language prefixes per domain, greedy decoding of fifty new tokens, and a rater; the rater prompts are printed verbatim in table 10 and my code uses them word for word. **the prefixes are not published.** i wrote a hundred plausible ones per domain — generic in-domain openers — and paired them with the domain's name as the concept label. the paper's own prefix set is presumably built to elicit the concept it then asks about. mine is not, and no amount of fixing the scorer fixes that. either the prefixes have to elicit biosecurity specifically, or the concept label has to be the thing the prefixes are actually about, and only the first is faithful to what the column is meant to measure.

the same applies, unmeasured, to the twenty coherence sentences behind the γ term in eq. 11. appendix D describes them and does not print them, so those are mine too, and they are the input to a term that was a third of the objective at step 200.

![every table 1 column for WMDP Cyber, original versus CRISP, as grouped bars](/assets/images/crisp-metrics_gemma2-2b_cyber.png)

*the cyber bars, where the broken axis is visible directly. concept, rescaled by 50, is a stub near five where the paper's untouched model would put it near ninety, and the overall column is dragged to eighteen behind it. fluency at sixty-five is in a plausible range, so it is specifically the concept pass that is wrong rather than the rater as a whole. cyber scores a little higher than bio, 0.10 against 0.02, which is consistent with the story above: "cybersecurity" is closer to being the literal subject of prefixes like "antivirus software detects malicious code" than "biosecurity" is to anything in the bio set.*

it also poisons the headline column. overall is a harmonic mean over the five rescaled axes, and a harmonic mean with a term near zero collapses to near zero. that is the entire reason my overall reads 4.66 against the paper's 54.37, and it means **no overall-based comparison in my table is meaningful, mine to mine included.**

i flagged in my planning notes, before any of this ran, that the harmonic mean has teeth because it is dominated by its smallest term — and specifically that ELM's 0.25 fluency, scaled to 12.5, is most of what tanks its overall to 33.93 in the paper's own table, so the headline "5–34 point" gap may be substantially a metric-design artifact worth isolating. it turns out the first thing those teeth bit was me.

(a smaller related bug: my report labels concept as lower-is-better, while the paper's table 1 has it higher-is-better and eq. 12 treats it that way. the label is wrong even once the values are fixed.)

## 9. what i ruled out

before concluding undertraining i checked the things that would have been more embarrassing.

**the adapter is active at evaluation.** the trained `PeftModel` is the same object passed into the evaluation harness; LoRA is disabled only inside the frozen-reference context and restored on exit; an integration test asserts both that adapter-disabled logits equal pre-LoRA logits *and* that a perturbed adapter's logits differ. the edit is not being silently dropped.

**the hyperparameters match appendix F**, checked field by field against the PDF.

**the base model and MCQ harness are correct**, which the original-model row demonstrates independently of anything CRISP does.

**the optimisation path itself works.** one of the 43 tests trains the real loop on a tiny random Llama for twelve steps with β and γ set to zero and α set to one, and asserts the unlearning loss at the last step is below the first. it passes. so gradients do reach the adapter through the SAE encode, and the term is reducible when it is the only thing being asked for. that is a narrow claim — twelve steps, a random model, a weighting nobody would train at — but it moves "the plumbing is broken" well down the list, and it sharpens what is left: at α = 0.01 the same machinery does not move the number in 200 steps.

what remains uneliminated: training duration; how much of eq. 9's magnitude is the λ term rather than the salient features; feature selection quality; and whether the selected features mediate the multiple-choice answer at all.

## 10. where the time went

worth recording because it shaped how much i could iterate. of the 48 minutes:

| phase | wall clock |
| --- | --- |
| weights + SAE download | ~1.5 min |
| MCQ eval (wmdp + retain + mmlu) | ~14 s |
| 100 generations | 29 s |
| **judge, original stage** | **17 min 32 s** |
| corpus load (2 × 5000 docs) | 3 min 40 s |
| feature selection | 17 s (cached after) |
| **CRISP training** | **1 min 40 s** |
| MCQ eval + generations | ~1 min |
| **judge, CRISP stage** | **19 min 44 s** |

**the judge is 37 of the 48 minutes — 78 percent.** the thing being reproduced — feature selection, CRISP training, and the accuracy numbers the claim rests on — is under five minutes.

the reason is that the rater scores a hundred prefixes twice, for fluency and for concept, and it is a thinking checkpoint, so it spends most of its 2,048-token budget reasoning before emitting the number that gets parsed. the tell is the 3-of-200 and 4-of-200 unparsed ratings: those hit the cap mid-reasoning, which means the rest are using most of it. batching helped — sixteen at a time took this from about a hundred minutes down to eighteen per stage — but batching divides the number of batches, not the tokens each sequence has to decode, so there is a floor.

the practical consequence is that dropping the judge while iterating is a tenfold speedup and costs only the two columns that are broken anyway. a non-thinking rater for the final table is the other obvious fix. and separately, the 3 minutes 40 seconds per training stage spent reading a 2.5 GB corpus over a Drive FUSE mount is pure accounting error on my part, fixed by copying to local disk once per session.

## 11. what i would run next

feature selection is cached, so a CRISP-only run without the judge is about four minutes. before any sweep, the three-line change that splits the logged unlearn term into its salient part and its λ part, so the sweep produces a decomposition rather than one more flat scalar. then duration, because that is the parameter the paper leaves unspecified:

```bash
for S in 500 1000 2000; do
  python -m crisp train -c configs/gemma2-2b_bio.yaml \
    --run-name "gemma2-2b_bio_crisp_s${S}" -o "train.steps=${S}" \
    --no-judge --skip-generation
done
```

roughly 4 + 8 + 16 minutes of training plus a minute of eval each. each writes its own result JSON, so `crisp report` picks them up as extra rows and the headline run is untouched.

the thing to watch is the unlearning loss, not the accuracy — specifically its mean over the first and last quarter of the history. three outcomes, all informative:

| outcome | reading |
|---|---|
| loss falls, WMDP drops toward 25 | reproduced; the missing ingredient was training duration, and that belongs in the writeup as a gap in the paper |
| loss falls, WMDP stays at 55 | the suppressed features do not mediate the multiple-choice answer — a real negative result about the method rather than about my run |
| loss still flat at 2000 steps | the optimiser is not reducing the term at all, which given that the tiny-model test *does* reduce it points at the decomposition above — the salient half swamped by the λ half — then at feature selection, and only then at α |

separately, and independent of all that: the concept column needs new prefixes before any overall number is quotable. not a scorer fix; the scorer is doing what it was asked. the hundred bio prefixes have to be openers that a biosecurity-aware model would continue into biosecurity content, so that an untouched Gemma scores near two and there is something for unlearning to take away. the sanity check is the same either way — run the concept pass on the original model and read the raw outputs, where most ratings should be one or two.

and the RMU and ELM baselines should run on the real model once, if only so the table has a row where something moves. if a baseline drops WMDP Bio and CRISP does not, under the same harness on the same day, that separates "my pipeline cannot unlearn" from "my CRISP does not unlearn" — a distinction this run cannot currently make.

## 12. what i am willing to claim

being clear about this is most of the value of the exercise.

**defensible from this run:** the original-model row, which reproduces the paper closely and validates the pipeline. and the unlearn, retain and MMLU columns for CRISP, reported as a *failure to reproduce* — 55.26 → 29.67 in the paper against 55.42 → 55.42 here, under hyperparameters verified identical to appendix F, with an unspecified step count named as the most likely cause.

**not defensible:** the overall column, which is an artifact of a concept score measuring the wrong thing, and the fluency and concept columns generally. also not defensible is any statement about CRISP relative to RMU or ELM, which i did not run at this scale.

it is worth separating the two failures by kind, because they are not the same kind. the flat unlearning loss is a gap in the paper that i hit; the concept score is a gap in the paper that i filled badly. both come from the same place — appendix F does not give a step count, appendix E does not give its prefixes, appendix D does not give its coherence sentences — and in a paper whose result rests on a hyperparameter search of roughly 2,400 runs, the unpublished inputs to that search are not a detail. the hyperparameters are all there, printed to two decimal places. what is missing is everything you would need to know what the hyperparameters were searched *over*.

i would rather publish that than a table with a caveat buried under it. a failed reproduction with a specific mechanism, a named missing parameter and a concrete next experiment is a more useful artifact than a successful one that nobody can check. the code, configs, figures and the full run diagnosis are all in the repo, so that the next person starts where i stopped rather than where i started.

numbers to follow — this time with the step count as the variable.
