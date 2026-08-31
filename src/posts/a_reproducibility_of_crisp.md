---
title: "Reproducing CRISP: a flat line where the paper has a 25-point drop"
date: 2026-08-07
tags:
  [mech-interp, sae-features, unlearning-methods, blue-dot-ai, reproducibility]
---

## tl;dr

- CRISP (Ashuach, Arad, Mueller, Tutek & Belinkov, ACL 2026) finds the sparse-autoencoder features that fire on a corpus you want a model to forget, then LoRA-finetunes the model to switch exactly those features off. On WMDP Bio it takes Gemma-2-2B from 55.26 percent to 29.67 percent, close to the 25 percent chance floor.
- I reimplemented the method from the paper and ran the four Gemma-2-2B rows of table 1 at the authors' own best hyperparameters. The untouched model reproduces closely: 55.42 against their 55.26 on WMDP Bio, 45.61 against 46.30 on MMLU. So the model, the multiple-choice harness and the corpora are fine.
- CRISP does not move the number. 55.42 to 55.42. That is not a marginal gap, it is a flat line. The unlearning loss never falls either; it oscillates in a band narrower than its own noise across 200 steps.
- **Two candidate causes, and I cannot yet separate them.** First, undertraining: the paper prints no step count, and I trained on 400 target documents where the authors' own released demo notebook uses 2,500. Second, the shape of the loss: eq. 9 adds a whole-dictionary sparsity penalty at λ=30 on top of the 30 selected features, and my training code logs the two halves as one scalar, so the term I was watching may never have been mostly about the features CRISP selected.
- A separate failure, and this one is mine: my concept score is 0.02 where the paper's untouched model scores 1.78, because the generation prefixes are not published and the ones I wrote do not elicit the concept the rater is asked about. The overall column is a harmonic mean containing that term, so **no overall-based number in this post is comparable to anything, mine included.**
- Both failures sit on inputs the paper describes but does not publish: the step count, the hundred prefixes, the twenty coherence sentences. I reconstructed all three, and all three turned out to be load-bearing.

---

## 1. What CRISP claims, and why it is worth checking

The paper is [CRISP: Persistent Concept Unlearning via Sparse Autoencoders](https://arxiv.org/abs/2508.13650) (ACL 2026). Its headline row: Gemma-2-2B on WMDP Bio, 55.26 percent down to 29.67 percent, with MMLU essentially untouched at 46.33.

Most SAE-based concept removal is an _inference-time_ intervention: find the feature, clamp it during the forward pass, report the drop. That is a real result about representation, but it is not a safety property, because whoever holds the weights can stop clamping. CRISP's claim is the interesting one. Take the same feature-level precision and push it into the weights, so the removal survives the model leaving your control, and do it without the collateral damage that makes RMU and ELM produce repetition loops and refusals on harmless prompts.

Two honest qualifications on that framing, both of which apply to the paper and to me equally.

The persistence claim rests on _merging_ the adapter. An unmerged LoRA is exactly as removable as inference-time steering. You call `disable_adapter()`, which is literally what my own implementation does to get the frozen reference model in eq. 10. Nothing in this post evaluates a merged model.

And unlearning benchmarks are not a clean oracle. A multiple-choice accuracy near chance says the model does not surface the answer under that prompt format, not that the information is gone. There is a growing literature showing that "unlearned" knowledge can be recovered by brief relearning on a small sample. The test that would actually support a persistence claim is adversarial: merge, then try to relearn. Neither the paper nor this reproduction runs it. So when I say below that CRISP did not move the number, read that as the weaker claim it is. The benchmark the paper chose did not move.

What made the paper checkable at all is scale. Gemma-2-2B, public SAEs, a single rented GPU, under fifty dollars. That is not true of most things in this literature.

## 2. What the method does

One selection rule, three losses, and one aggregate score.

**Feature selection.** Run a target corpus (the thing to forget, WMDP bio-weapons text) and a retain corpus (benign text from the same broad field, ordinary biology) through the model, and read the residual stream at a handful of layers through a pretrained SAE. For each feature accumulate two quantities: φ, the number of tokens it fired on, and A, its summed activation magnitude. Take the difference in firing counts between the two corpora, keep the top _k_ features by that difference, then filter to those whose activation ratio A_target / A_retain clears a threshold τ. What survives is a small set, 30 features for bio out of a 16,384-feature dictionary, specific to the concept rather than merely frequent.

**Suppression.** Attach a LoRA adapter and train it so that on the target corpus those features stop firing while everything else stays put. Three terms, combined as `L = α·L_unlearn + β·L_retain + γ·L_coherence`:

| term      | corpus                      | what it computes                                                                                                          |
| --------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| unlearn   | target                      | mean over tokens of `mean(selected feature acts) + λ·mean(all feature acts)`, averaged over the SAE layers                |
| retain    | retain                      | mean over tokens of the squared distance between the edited and frozen original model's hidden states, at the same layers |
| coherence | 20 curated benign sentences | the same distance, but at the final layer only                                                                            |

The λ term inside the unlearning loss is a whole-dictionary penalty. Its stated purpose is to stop the model satisfying the objective by routing the concept into features nobody selected. Note its size relative to what it sits next to: λ is 30, and it multiplies a mean over all 16,384 features, while the first term is a mean over just 30. Section 5 comes back to this.

Note also that the two layer sets differ. Features are _read_ at layers 4, 6, 8, 10, 12 and 14; LoRA is _written_ at blocks 3 through 9. So most of the measurement happens downstream of most of the edit, and the deepest read layers sit five to eleven blocks past the last block that can be changed. That is a plausible reason for an edit to fail to register at the read sites, and one I have not ruled out.

**The score.** Six metrics, aggregated as the harmonic mean of five rescaled axes: `Overall = HM(100−U, R, M, 50F, 50C)`, covering unlearn accuracy (lower better), in-domain retain accuracy, general MMLU, and a 0–2 fluency and concept rating from an LLM judge. A harmonic mean deliberately, so that a method scoring zero on any single axis scores near zero overall and you cannot win the benchmark by lobotomising the model.

That design has teeth, and the teeth cut both ways. An aggregate that collapses when any one term approaches zero is dominated by its weakest measurement, which makes it fragile to a bad measurement as much as to a bad method. In the paper's own table, ELM's fluency of 0.25, rescaled to 12.5, is most of what drags its overall down to 33.93, so the headline "5 to 34 point" gap over baselines may be substantially a metric-design artifact worth isolating. I flagged that in my planning notes before running anything. Section 6 is the story of those teeth closing on me.

## 3. What I ran

Scope: **the four Gemma-2-2B rows of table 1, at the fixed best hyperparameters the paper's appendix F publishes.** The paper's table sits on a Bayesian sweep of 200 configurations per method across two models, two domains and three methods, roughly 2,400 finetuning runs. Reproducing that is not a project, it is a grant. But the fixed-hyperparameter runs are a handful of sub-two-dollar jobs, and they make or break the central comparison. If CRISP at the authors' own best settings does not beat the untouched model on the authors' own benchmark, nothing about the sweep matters.

Out of scope: Llama-3.1-8B, the Harry Potter benchmark, and the sweep itself. Also not run: the RMU and ELM baselines. Both are implemented and both pass the smoke pipeline, but at 48 minutes a domain, of which two minutes is the part under test, the session went to the method rather than the field. So this is CRISP against the untouched model, not CRISP against the literature, and I cannot say anything about the comparison the paper's headline actually makes.

The implementation is written from the paper rather than ported. The authors' release covers feature selection, LoRA optimisation and evaluation plus a Harry Potter demo notebook, with WMDP not a turnkey script. About 2,600 lines, mapped equation by equation, 43 tests that run in two seconds with no gated downloads. The details are in the appendix.

One run: a single A100 40GB session, both domains, judge on, 48 minutes for bio. Configuration checked field by field against appendix F, with SAE layers 4 through 14 in steps of two, LoRA on blocks 3 through 9, k=30, λ=30, rank 8, lr 4e-5, τ=3, β=0.99, γ=0.01, α defined as 1−β. Cyber differs where the appendix says it differs: k=50, λ=20, rank 4.

## 4. What came back

| run   | method   | WMDP acc ↓ | in-domain MMLU | MMLU  | fluency | concept | overall |
| ----- | -------- | ---------- | -------------- | ----- | ------- | ------- | ------- |
| bio   | original | 55.42      | 62.11          | 45.61 | 1.49    | 0.02    | 4.66    |
| bio   | crisp    | 55.42      | 62.56          | 46.49 | 1.50    | 0.02    | 4.66    |
| cyber | original | 33.60      | 44.00          | 45.61 | 1.29    | 0.10    | 17.88   |
| cyber | crisp    | 33.40      | 42.00          | 44.74 | 1.36    | 0.11    | 18.95   |

And the comparison that matters, bio against the paper's table 1:

|                    | unlearn acc ↓ | retain acc | MMLU  | fluency | concept  | overall  |
| ------------------ | ------------- | ---------- | ----- | ------- | -------- | -------- |
| paper, original    | 55.26         | 55.27      | 46.30 | 1.07    | 1.78     | 54.37    |
| **mine, original** | **55.42**     | 62.11      | 45.61 | 1.49    | **0.02** | **4.66** |
| paper, CRISP       | **29.67**     | 54.45      | 46.33 | 0.92    | 1.63     | 56.70    |
| **mine, CRISP**    | **55.42**     | 62.56      | 46.49 | 1.50    | **0.02** | **4.66** |

![every table 1 column for WMDP Bio, original versus CRISP, as grouped bars](/assets/images/crisp-metrics_gemma2-2b_bio.png)

_Every table 1 column for bio, one bar group per method, with the 0–2 rater columns rescaled by 50. For reference, the paper's CRISP bar on the first column would sit at 29.67 against the 55.42 shown here. The pairs being the same height everywhere is the whole problem in one picture._

The top-left corner is the encouraging part. An untouched Gemma-2-2B lands within 0.2 points of the paper on WMDP Bio and within 0.7 on MMLU, which is about as close as you get across two independent evaluation harnesses. Whatever is wrong is not the model, not the multiple-choice scoring, and not the corpora.

The bottom-left is the failure. The paper's headline move is a drop of twenty-five and a half points, taking the model within five points of random guessing on a four-way question. Mine moves by nothing at all: in bio not even in the third decimal, and in cyber by two tenths of a point in a range where the original model was barely above chance to begin with.

That identical-to-four-figures result deserves more suspicion than a small effect would. On 1,273 questions, 55.42 to 55.42 means the argmax did not flip on a **single question**, which is what you would see if the adapter were barely perturbing the logits at all. Section 8 covers what I checked. The direct check, measuring the actual logit delta and the norm of the trained LoRA B matrices, is the first thing on the list in section 7 and it is not yet done.

![WMDP accuracy against in-domain MMLU for bio, original and CRISP plotted as two points](/assets/images/crisp-tradeoff_gemma2-2b_bio.png)

_Bio, forget accuracy against in-domain utility. A working method walks left toward the dashed chance line without falling down the page. Read the axes before the picture: both points sit at the same 55.4 on the forget axis, and the vertical gap is matplotlib zooming into a range 0.44 points tall. The paper's CRISP point would be off the left of this frame, near the dashed line at 25._

![WMDP accuracy against in-domain MMLU for cyber](/assets/images/crisp-tradeoff_gemma2-2b_cyber.png)

_Cyber, same story with a wrinkle. The original model starts at 33.6 on a benchmark whose floor is 25, so there are only eight and a half points of headroom to begin with, and the two-point move CRISP produces on in-domain utility is downward. This domain cannot really adjudicate the claim at this model size._

## 5. Why the training does nothing

The training history is unambiguous.

![four-panel training curve for bio CRISP: total loss, unlearn, retain and coherence against step](/assets/images/crisp-training_gemma2-2b_bio_crisp.png)

_The four terms over 200 steps, one panel each because they live on wildly different scales. The second panel is the one to look at: the unlearn term is noise in a band from about 2.0 to 4.1 with no downward trend, and if anything it drifts slightly up. The spikes in the other panels are single batches, and the one near step 185 is coherence hitting six thousand on its own._

Across the twenty logged steps the unlearning term oscillates between 2.26 and 3.81, averaging 3.12 over steps 10–100 and 2.82 over steps 110–200. That drift is smaller than the step-to-step noise. After 200 steps the features CRISP selected are firing as much as they were at the start, so there is nothing for the accuracy number to respond to.

Substituting the logged step-200 values into the weighted objective shows what the optimiser is actually being asked to do:

| term      | raw    | after weighting | share         |
| --------- | ------ | --------------- | ------------- |
| unlearn   | 3.0975 | ×0.01 = 0.031   | **2 percent** |
| retain    | 1.3339 | ×0.99 = 1.321   | 65 percent    |
| coherence | 68.52  | ×0.01 = 0.685   | 33 percent    |

Those sum to the logged total of 2.0368, so this is the real decomposition rather than an estimate. Two percent of the objective is the thing the method exists to do.

My first instinct was that α was miscalibrated, and I wrote that down before checking. It was wrong. Appendix F says, verbatim, _define α as 1 − β_, and β is 0.99, so α = 0.01 is the paper's own setting and not a bug in my config. Every other hyperparameter matches the appendix line by line too. Sweeping α is not the first thing to do, and saying so is part of the point of writing this up.

Two candidates remain, and the reason I cannot separate them is a three-line logging omission of my own.

**Candidate one: it never got enough time.** A two-percent term needs duration, and the paper does not say how much it gets.

> Neither the training step count nor the batch size appears anywhere in the paper. Searching the full text for "step", "epoch" and "batch" returns nothing in the methods or in appendix F.

I picked 200 steps at batch size 2, which shows the model 400 target documents out of the 5,000 that get loaded, in 100 seconds of training on an A100. A flat unlearning loss is exactly what undertraining looks like. And there _is_ a number in the authors' released code, in the Harry Potter demo notebook: 625 batches at batch size 4, or 2,500 documents. **That is more than six times the training I gave it.** It is the only step count the authors publish anywhere, it is for a different corpus, and I did not find it until after the run. But on the single quantity the paper leaves free, I was off by a factor of six against the authors' own example, in the direction that produces exactly the symptom I saw.

One observation cuts against this story, and it is worth stating against my own preferred explanation. Cyber's forget corpus is about a thousand documents rather than bio's five thousand, and the config takes all of them, so the same 400 documents are forty percent of everything there is rather than eight percent. The loss is just as flat:

![four-panel training curve for cyber CRISP](/assets/images/crisp-training_gemma2-2b_cyber_crisp.png)

_Cyber. The unlearn term sits in a band from roughly 1.0 to 2.1 and is just as flat, so this is not a quirk of one domain's feature set. Two independent runs, two configurations, the same non-result._

That is not decisive. 400 documents is 400 gradient signals either way, and corpus coverage is not step count. But if duration were the whole answer I would expect the two domains to look less identical.

**Candidate two: the term I was watching was mostly not the term I cared about.** The unlearning loss is the mean activation of the selected features _plus_ λ times the mean activation over all features, with λ = 30 and the selected set being 30 features out of 16,384. The second term is a global sparsity penalty over the whole dictionary, and it is entirely plausible that it carries most of the magnitude of the scalar I plotted. In that case the two percent of the objective nominally aimed at unlearning is itself mostly not aimed at the features CRISP selected, and a flat curve tells me nothing about whether those 30 features moved.

I cannot settle this from the histories, because my training code logs the unlearn term as a single scalar. Splitting it is a three-line change and it should have happened before the run, not after. That is my error, and it is the one that most limits what this post can conclude.

## 6. The other failure, which is entirely mine

My concept score is 0.02 on the untouched model, where the paper reports 1.78. Concept measures whether the target concept shows up in the model's continuation, rated 0–2 by an LLM judge, so an unedited Gemma that still knows biosecurity should score high. Mine says the concept is essentially absent from all hundred continuations of a model nobody has touched, which cannot be right.

The judge is working. The paper's rater prompts are printed verbatim in its appendix and my code uses them word for word; the judge emits `Rating: [[n]]`, my parser reads it, thinking blocks are stripped first so the model cannot be scored on its own scratchpad, and only three or four ratings out of two hundred fail to parse. Fluency comes back at 1.49 through the identical path, which is a plausible number. The pass is not broken. It is being asked the wrong question.

The concept string handed to the rater is `biosecurity`. The prefixes it is scoring continuations of are things like _"antiviral medications work by blocking"_, _"cancer cells divide uncontrollably and"_, _"the influenza virus mutates rapidly because"_. So the rater reads a fluent paragraph of ordinary molecular biology and is asked whether _biosecurity_, the practice of protecting against biological threats, is clearly incorporated in it. Zero is the correct answer. It has been correct a hundred times in a row.

That is a mismatch between two things I wrote myself. The paper specifies a hundred natural-language prefixes per domain, greedy decoding of fifty new tokens, and a rater. **The prefixes are not published.** I wrote a hundred plausible in-domain openers per domain and paired them with the domain's name as the concept label. The paper's own prefix set is presumably built to elicit the concept it then asks about. Mine is not, and no amount of fixing the scorer fixes that.

The same applies, unmeasured, to the twenty coherence sentences behind the third loss term. The paper describes them and does not print them, so those are mine too, and they are the input to a term that was a third of the objective at step 200.

![every table 1 column for WMDP Cyber, original versus CRISP, as grouped bars](/assets/images/crisp-metrics_gemma2-2b_cyber.png)

_The cyber bars, where the broken axis is visible directly. Concept, rescaled by 50, is a stub near five where the paper's untouched model would put it near ninety, and the overall column is dragged to eighteen behind it. Fluency at sixty-five is in a plausible range, so it is specifically the concept pass that is wrong rather than the rater as a whole. Cyber scores a little higher than bio, 0.10 against 0.02, which fits the story: "cybersecurity" is closer to being the literal subject of prefixes like "antivirus software detects malicious code" than "biosecurity" is to anything in the bio set._

This poisons the headline column. Overall is a harmonic mean over five rescaled axes, and a harmonic mean with a term near zero collapses to near zero. That is the entire reason my overall reads 4.66 against the paper's 54.37, and it means **no overall-based comparison in my table is meaningful, mine to mine included.** The fragility I flagged in section 2 as a critique of the metric turned out to bite me before it bit anyone else.

(A smaller related bug: my report labels concept as lower-is-better, while the paper treats it as higher-is-better. The label is wrong even once the values are fixed.)

## 7. What I would run next, and what I am asking the authors

Feature selection is cached, so a CRISP-only run without the judge is about four minutes. In order:

**The two-minute check first.** Measure the logit delta between adapter-enabled and adapter-disabled on the real trained model, and the norm of the trained LoRA B matrices. If B is near zero, the whole undertraining discussion is downstream of something much simpler, and an identical-to-four-figures accuracy is exactly the symptom.

**Then split the logged loss** into its selected-feature half and its λ half, so that everything after this produces a decomposition rather than one more flat scalar.

**Then duration**, because that is the parameter the paper leaves unspecified and the one where the authors' own demo suggests I was six times short:

```bash
for S in 500 1000 2000 3000; do
  python -m crisp train -c configs/gemma2-2b_bio.yaml \
    --run-name "gemma2-2b_bio_crisp_s${S}" -o "train.steps=${S}" \
    --no-judge --skip-generation
done
```

Roughly 4 + 8 + 16 + 24 minutes of training plus a minute of eval each. The thing to watch is the unlearning loss, specifically its selected-feature half, and specifically the mean over the first and last quarter of the history, not the accuracy. Three outcomes, all informative:

| outcome                          | reading                                                                                                                                                                              |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| loss falls, WMDP drops toward 25 | reproduced; the missing ingredient was training duration, and that belongs in the record as a gap in the paper                                                                       |
| loss falls, WMDP stays at 55     | the suppressed features do not mediate the multiple-choice answer, a real negative result about the method rather than about my run                                                  |
| loss still flat at 3000 steps    | the optimiser is not reducing the term at all, which points at the decomposition above, then at feature selection quality, then at the read/write layer mismatch, and only then at α |

**An unlearning-only ablation**, α=1 with β and γ zeroed, on the real model rather than the tiny test model, to establish whether the term is reducible at all here before arguing about why it is not being reduced at a two-percent weight.

**The RMU and ELM baselines**, once each on the real model, if only so the table has a row where something moves. If a baseline drops WMDP Bio and CRISP does not, under the same harness on the same day, that separates "my pipeline cannot unlearn" from "my CRISP does not unlearn", a distinction this run cannot make.

**New prefixes**, before any overall number is quotable. Not a scorer fix; the scorer is doing what it was asked. The hundred bio prefixes have to be openers a biosecurity-aware model would continue into biosecurity content, so that an untouched Gemma scores near two and there is something for unlearning to take away. The sanity check is the same either way: run the concept pass on the original model and read the raw outputs, where most ratings should be one or two.

And the open questions I cannot answer from the paper alone. Every one of them is a thing the authors could settle in a five-line reply, and asking them is the obvious next step:

1. What step count and batch size produced the table 1 WMDP rows? Is the demo notebook's 625×4 representative?
2. Can the hundred generation prefixes per domain be released?
3. Can the twenty coherence sentences per domain be released?
4. Does the concept pass rate all hundred generations, or filter them by a scorer first?
5. Is the LoRA merged before evaluation, or evaluated as an attached adapter?

If I get answers to any of these, they will go into this post.

## 8. What I ruled out

Before concluding anything about training duration I checked the things that would have been more embarrassing.

**The adapter is active at evaluation.** The trained `PeftModel` is the same object passed into the evaluation harness; LoRA is disabled only inside the frozen-reference context and restored on exit; an integration test asserts both that adapter-disabled logits equal pre-LoRA logits _and_ that a perturbed adapter's logits differ. The edit is not being silently dropped. Note what this does _not_ establish: that the trained adapter is far enough from zero to change an argmax. That is the check in section 7.

**The hyperparameters match appendix F**, field by field against the PDF.

**The base model and MCQ harness are correct**, which the original-model row demonstrates independently of anything CRISP does.

**The optimisation path is differentiable.** One test trains the real loop on a tiny random Llama for twelve steps with β and γ set to zero and α set to one, and asserts the unlearning loss at the last step is below the first. It passes, so gradients do reach the adapter through the SAE encode. But be clear about how narrow that is: twelve steps, a random model, and a weighting nobody would train at. It is a plumbing test, not an experiment about CRISP. It moves "the plumbing is broken" down the list and nothing more.

Which brings me to the limitation that most constrains this post: **I analysed a single run and ran zero ablations on the real model.** Everything in section 5 is inference from one training history. The experiments in section 7 are cheap, most of them are minutes, and they should have run before publishing.

Uneliminated, then: training duration; how much of the unlearning loss is the λ term rather than the selected features; whether the trained adapter is meaningfully non-zero; feature selection quality; the gap between the layers where LoRA writes and the layers where features are read; and whether the selected features mediate the multiple-choice answer at all.

## 9. What I am willing to claim

**Defensible from this run:** the original-model row, which reproduces the paper closely and validates the pipeline. And the unlearn, retain and MMLU columns for CRISP, reported as a _failure to reproduce_: 55.26 → 29.67 in the paper against 55.42 → 55.42 here, under hyperparameters verified identical to appendix F, with an unspecified step count and an unsplit loss term as the two leading candidate causes.

**Not defensible:** the overall column, which is an artifact of a concept score measuring the wrong thing; the fluency and concept columns generally; any statement about CRISP relative to RMU or ELM, which I did not run; and any claim about persistence, since I never merged the adapter or attempted relearning.

The two failures differ in kind. The flat unlearning loss is a gap in the paper that I hit and then failed to instrument properly. The concept score is a gap in the paper that I filled badly. Both come from the same place: no step count, no prefixes, no coherence sentences. In a paper whose result rests on a hyperparameter search of roughly 2,400 runs, the unpublished inputs to that search are not a detail. The hyperparameters are all there, printed to two decimal places. What is missing is most of what you would need to know what they were searched _over_.

I would rather publish that than a table with a caveat buried under it. A failed reproduction with a specific mechanism, a named missing parameter and a concrete next experiment is a more useful artifact than a successful one nobody can check. The code, configs, figures and full run diagnosis are in the repo, so the next person starts where I stopped rather than where I started.

Numbers to follow, this time with the step count as the variable.

---

## Appendix A: implementation details

About 2,600 lines under `src/crisp/`, mapped onto the paper equation by equation so any number traces back to a line in the PDF:

| paper                                                                | code                                      |
| -------------------------------------------------------------------- | ----------------------------------------- |
| eq. 1: SAE encode/decode (JumpReLU, ReLU, TopK)                      | `sae.py::SparseAutoencoder`               |
| eq. 3–4: activation count φ, difference Δφ                           | `features.py::corpus_statistics`          |
| eq. 5–8: cumulative activation A, ratio ρ, top-k then τ filter       | `features.py::select_features`            |
| eq. 9: unlearning loss                                               | `losses.py::unlearning_loss`              |
| eq. 10: retention loss                                               | `losses.py::representation_distance`      |
| eq. 11: weighted total                                               | `losses.py::total_loss`                   |
| eq. 12: Overall harmonic mean                                        | `metrics.py::overall_score`               |
| §4.1: corpus cleaning, 1000-char truncation, val/test halving        | `data.py`                                 |
| app. D: 20 coherence sentences/domain                                | `data/coherence/*.json`                   |
| app. E: 100 prefixes/domain, greedy 50-token decoding, rater prompts | `data/prompts/*.json`, `eval_gen.py`      |
| app. F: search space + selection criterion                           | `sweep.py`, `metrics.py::selection_score` |

Places the paper underspecifies and I had to decide. Marked **(paper silent)** where the paper does not address the choice at all, as opposed to describing it without giving the values.

**No second copy of the model.** _(paper silent.)_ The frozen reference in the retention loss comes from calling PEFT's `disable_adapter()` inside a context manager, not from holding a second set of weights. An integration test asserts adapter-disabled logits equal pre-LoRA logits exactly, _and_ that a perturbed adapter's logits differ.

**Feature counts are normalised by corpus size.** _(paper silent; its equation subtracts raw counts.)_ The corpora differ in token count, with cyber-retain about 4× cyber-forget, so I rescale counts by the token-count ratio before subtracting, making the difference and the ratio per-token rates. Without this the selection would largely rank corpus size.

**The hook site is the un-normalised residual stream.** _(paper silent.)_ Activations are captured at each block's output (`hook_resid_post`), which is what Gemma Scope SAEs are trained on. HuggingFace applies the final RMSNorm to the _last_ entry of `output_hidden_states`, so reading that would silently feed the SAE something it was never trained on.

**SAE choice.** _(paper names the repo; that repo is access-controlled.)_ The configs point at the public `google/gemma-scope-2b-pt-res` and pick the release whose average L0 is nearest 100, which is the canonical rule anyway.

**The data layer materialises first.** _(paper silent.)_ `crisp fetch` writes every corpus and benchmark to `data/` as jsonl with a `MANIFEST.json` recording source repo and row count. Selection, training and evaluation read from disk, which pins a run to specific bytes rather than whatever the hub serves that day: bio 24,453 forget documents and 60,887 retain, cyber 1,000 and 4,472, WMDP MCQs 1,273 and 1,987, MMLU 14,042.

**The judge is not the paper's judge.** _(paper pins Claude Sonnet 4 `2025-05-14`, which is no longer callable.)_ So any fluency or concept number has to be calibrated against the original model within my own run rather than compared to the paper's table directly.

Testing is 43 tests in about two seconds with no gated downloads. The equations are checked numerically against hand-computed values: the unlearning loss term by term, the retention loss's two reductions, the weighting, the harmonic mean, and top-k/τ selection including the corpus-size normalisation.

## Appendix B: the infrastructure detour

More of the calendar went here than I would like, and it is worth recording because it is the part reproduction writeups usually omit.

**An MLX backend, built and then deleted.** I wrote an `mlx-lm` evaluation backend to run MCQ scoring and generation on the M4's GPU. It worked. It could never train, because CRISP differentiates through per-layer residual activations and `mlx-lm` exposes neither forward hooks nor that autograd surface, so once training had to leave the laptop the backend was a second, quantised, inference-only code path that nothing reported from. Deleting it left one inference path again.

**The bio forget corpus is not where the code assumed.** The original `data.py` expected all four WMDP corpora to be configs of `cais/wmdp-corpora`. They are not. The bio _forget_ corpus lives in its own gated repo, `cais/wmdp-bio-forget-corpus`, as a single default parquet config, and approval is unpredictable. Building the eval half and running the cyber pair, whose corpora are public and total about 80 MB, while waiting on that approval was the single most useful sequencing decision I made.

**Drive, symlinks, and git.** The notebook symlinks `data/` onto Drive because the corpora are large and gitignored, but _copies_ `artifacts/` both ways, because git refuses to stage paths behind a symlink and the notebook has to commit from that directory. Weights stay on Colab's local disk. Gemma-2-2B at ~5 GB, six Gemma Scope SAEs at ~1.8 GB and an 8 GB rater together exceed a free 15 GB Drive account, and re-downloading after a disconnect costs ten minutes against a quota you cannot exceed.

**A torchao version conflict** (0.10.0 installed against a >0.16.0 requirement) blocked LoRA training entirely for an afternoon, resolved by rewriting the notebook's install cells to build around Colab's preinstalled torch rather than against it.

The end state is one command that works the same from any CUDA box:

```bash
scripts/reproduce.sh configs/gemma2-2b_bio.yaml --stages original,crisp
```

which is fetch, then evaluate the original model, train CRISP, train RMU, train ELM, write the table and render the figures. It resolves dtype from the card (bf16 on Ampere and newer, fp32 on a T4, since training runs without a gradient scaler and fp16 there would give silent NaNs where fp32 gives a clean OOM), skips any stage whose result JSON already exists so an interrupted session resumes, and forwards unknown flags to the CLI. Before committing GPU-hours, `scripts/reproduce.sh configs/smoke.yaml` exercises the whole path in about a minute on a tiny random model with no gated downloads and no GPU.

## Appendix C: where the 48 minutes went

| phase                           | wall clock          |
| ------------------------------- | ------------------- |
| weights + SAE download          | ~1.5 min            |
| MCQ eval (wmdp + retain + mmlu) | ~14 s               |
| 100 generations                 | 29 s                |
| **judge, original stage**       | **17 min 32 s**     |
| corpus load (2 × 5000 docs)     | 3 min 40 s          |
| feature selection               | 17 s (cached after) |
| **CRISP training**              | **1 min 40 s**      |
| MCQ eval + generations          | ~1 min              |
| **judge, CRISP stage**          | **19 min 44 s**     |

**The judge is 37 of the 48 minutes, 78 percent.** The thing being reproduced, feature selection and training and the accuracy numbers the claim rests on, is under five minutes.

The reason is that the rater scores a hundred prefixes twice, for fluency and for concept, and it is a thinking checkpoint, so it spends most of its 2,048-token budget reasoning before emitting the number that gets parsed. The tell is the 3-of-200 and 4-of-200 unparsed ratings: those hit the cap mid-reasoning, which means the rest are using most of it. Batching helped, and sixteen at a time took this from about a hundred minutes down to eighteen per stage, but batching divides the number of batches, not the tokens each sequence has to decode, so there is a floor.

The practical consequence is that dropping the judge while iterating is a tenfold speedup and costs only the two columns that are broken anyway. A non-thinking rater for the final table is the other obvious fix. And separately, the 3 minutes 40 seconds per training stage spent reading a 2.5 GB corpus over a Drive FUSE mount is pure accounting error on my part, fixed by copying to local disk once per session.

## References

**The paper under reproduction**

- Ashuach, Arad, Mueller, Tutek & Belinkov. [CRISP: Persistent Concept Unlearning via Sparse Autoencoders](https://arxiv.org/abs/2508.13650). ACL 2026.

**The benchmark and the baselines it ships with**

- Li et al. [The WMDP Benchmark: Measuring and Reducing Malicious Use With Unlearning](https://arxiv.org/abs/2403.03218). ICML 2024. Source of both the multiple-choice benchmark and the RMU baseline.
- Gandikota et al. [Erasing Conceptual Knowledge from Language Models](https://arxiv.org/abs/2410.02760). The ELM baseline.
- Eldan & Russinovich. [Who's Harry Potter? Approximate Unlearning in LLMs](https://arxiv.org/abs/2310.02238). The other benchmark CRISP reports, and the one the authors' demo notebook uses.
- Hendrycks et al. [Measuring Massive Multitask Language Understanding](https://arxiv.org/abs/2009.03300). ICLR 2021. The MMLU utility column.

**Model and SAEs**

- Gemma Team. [Gemma 2: Improving Open Language Models at a Practical Size](https://arxiv.org/abs/2408.00118).
- Lieberum et al. [Gemma Scope: Open Sparse Autoencoders Everywhere All At Once on Gemma 2](https://arxiv.org/abs/2408.05147). The pretrained SAEs this reproduction loads.
- Rajamanoharan et al. [Jumping Ahead: Improving Reconstruction Fidelity with JumpReLU Sparse Autoencoders](https://arxiv.org/abs/2407.14435). The activation function in eq. 1.
- Bricken et al. [Towards Monosemanticity: Decomposing Language Models With Dictionary Learning](https://transformer-circuits.pub/2023/monosemantic-features). Background on why features rather than neurons.
- Hu et al. [LoRA: Low-Rank Adaptation of Large Language Models](https://arxiv.org/abs/2106.09685).

**Why a benchmark drop is weaker evidence than it looks**

- Lynch et al. [Eight Methods to Evaluate Robust Unlearning in LLMs](https://arxiv.org/abs/2402.16835).
- Deeb & Roger. [Do Unlearning Methods Remove Information from Language Model Weights?](https://arxiv.org/abs/2410.08827). Relearning on a small sample recovers much of what was supposedly removed.
- Łucki et al. [An Adversarial Perspective on Machine Unlearning for AI Safety](https://arxiv.org/abs/2409.18025). Directly targets RMU and WMDP.
- Maini et al. [TOFU: A Task of Fictitious Unlearning for LLMs](https://arxiv.org/abs/2401.06121). On the difficulty of evaluating unlearning at all.

**SAE steering as the inference-time alternative**

- Templeton et al. [Scaling Monosemanticity: Extracting Interpretable Features from Claude 3 Sonnet](https://transformer-circuits.pub/2024/scaling-monosemanticity).
- Farrell, Lau & Conmy. [Applying Sparse Autoencoders to Unlearn Knowledge in Language Models](https://arxiv.org/abs/2410.19278). The closest prior work: SAE feature clamping on WMDP Bio, at inference time.
