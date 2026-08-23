---
title: Refusal Steering with Sparse Autoencoders
date: 2026-08-11
lead: testing when sparse-autoencoder features are worth their cost over simple linear directions for detecting and steering refusal in language models.
topics:
  [
    mechanistic-interpretability,
    sparse-autoencoders,
    refusal-steering,
    llm-safety,
    gemma,
  ]
image: https://raw.githubusercontent.com/sagnikc395/refusal-steering-using-saes/main/artifacts/figures/effect_versus_cost.png
subimages:
  - https://raw.githubusercontent.com/sagnikc395/refusal-steering-using-saes/main/artifacts/sweep/figures/dose_response.png
  - https://raw.githubusercontent.com/sagnikc395/refusal-steering-using-saes/main/artifacts/cross_category/figures/refusal_matrix.png
  - https://raw.githubusercontent.com/sagnikc395/refusal-steering-using-saes/main/artifacts/adversarial/figures/auroc_by_split.png
references:
  - title: refusal-steering-using-saes
    url: https://github.com/sagnikc395/refusal-steering-using-saes
    author: GitHub
  - title: Refusal in Language Models Is Mediated by a Single Direction
    url: https://arxiv.org/abs/2406.11717
    author: Arditi et al.
  - title: AxBench — Steering LLMs? Even Simple Baselines Outperform Sparse Autoencoders
    url: https://arxiv.org/abs/2501.17148
    author: Wu et al.
  - title: Gemma Scope 2
    url: https://huggingface.co/google/gemma-scope-2-4b-it
    author: Google DeepMind
---

## the question

Sparse autoencoders are an appealing tool for controlling language models. They decompose a model's dense activations into sparse features, giving us something closer to individual, interpretable knobs. If a feature activates on refusal, perhaps changing that feature can change refusal more precisely than editing the full residual stream.

The practical objection is that a much simpler method often works: take the difference between the mean activations on harmful and harmless prompts, then steer along that single direction. Recent benchmarks suggest that this linear baseline can match or outperform SAE steering while being much cheaper.

I built this project to ask a more useful version of the question: **when, if ever, is the SAE tax worth paying?** Aggregate refusal rate is not enough to answer that. A method may suppress refusal by making the model incoherent, discard important information outside the selected features, or provide a kind of fine-grained control that one global direction cannot express.

## what the project compares

The experiments use `google/gemma-3-4b-it` and a Gemma Scope 2 residual-stream SAE at layer 17, with 16,384 learned features. A refusal direction and the relevant SAE features are fitted on 64 harmful and 64 benign prompts, then evaluated on a disjoint set of 32 prompts from each class. Harmful prompts come from JailbreakBench; benign prompts come from XSTest after removing its genuinely unsafe contrast examples.

I compare five interventions under a shared coefficient sweep:

- **difference in means**, which subtracts a fixed refusal direction;
- **affine concept editing (ACE)**, which removes the prompt's measured component along that direction and recenters it around the benign mean;
- **top-1 and top-5 SAE clamps**, which edit the highest-ranked refusal features before decoding the activation; and
- **residual-preserving SAE steering**, which adds the SAE reconstruction error back after the feature edit.

That last arm is an important control. A normal SAE clamp does two things at once: it edits selected features and throws away everything the SAE failed to reconstruct. Without restoring the error, an apparent steering effect cannot be attributed cleanly to the feature edit.

## measuring success without rewarding a broken model

The headline metric is jailbreak rate, but with a stricter definition than `1 - refusal rate`. A completion counts as jailbroken only if it is neither a refusal nor degenerate. Loops, repeated fragments, and extremely short non-answers are tracked as failures rather than successful steering.

Each coefficient is also evaluated against a collateral-damage budget based on benign refusal and degeneracy. This matters because the strongest SAE interventions can drive refusal to zero by pushing the model into repetitive nonsense. Looking only at refusal would rank those broken settings as perfect.

The complete suite contains eight experiments. It studies dose-response and Pareto tradeoffs, SAE reconstruction leakage, category-selective steering, intervention position, robustness to Base64, ROT13, and roleplay transformations, inference cost, MMLU and perplexity preservation, and stability across refitted random seeds. The experiments feed ten signals into an explicit decision rule, so the final recommendation is derived from saved results rather than chosen after looking at plots.

## what the first run found

The artifacts currently in the repository come from the first run, which completed six of the eight experiments. They predate the capability and multi-seed checks and used an older coefficient grid for several ablations, so I treat the results as evidence from that run rather than a final benchmark verdict.

The plain difference-in-means intervention did not reduce refusal on this model. ACE, despite using the same single direction, raised the jailbreak rate from a baseline of 0.375 to 0.781. This was the most practically useful result: a large part of the apparent gap between linear and SAE steering can come from how the linear intervention is parameterized, not from the representational basis itself.

The best SAE arm still reached 0.906 jailbreak rate, 12.5 points above ACE, while keeping benign refusal low. But the evaluation contained only 32 harmful prompts, the confidence intervals overlapped, and the same top-five clamp became completely degenerate at the next coefficient. The SAE advantage existed in a very narrow operating window.

The reconstruction-error control produced the sharpest mechanistic finding. The SAE reconstructed the activation to within roughly 3.5%, yet that small leftover component separated harmful from benign prompts at an AUROC of 0.967, close to 0.985 for the full activation on the fitting data. Refusal-relevant information was not confined to the sparse features. This makes it risky to interpret ordinary clamp results as evidence that one selected feature caused the behavioral change.

## where SAEs may still earn their keep

SAEs offered one capability that a single global direction cannot provide by construction: category-level control. The project fits separate features for categories such as expert advice, privacy, malware, and fraud, then measures each intervention across every category. In the initial run, the strongest row reduced refusal on its own category 35 points more than on the others.

That is the reason the automated decision rule returned `pay_for_selectivity`. The mechanism is genuinely more expressive than a single direction. The evidence is still preliminary, though: category cells contained only a handful of prompts, several high-strength interventions were likely degenerate, and two categories selected the same feature. I see this as a promising capability to test at larger scale, not a settled win.

The SAE also did not show a robustness advantage as a detector under transformed prompts. Its aggregate AUROC was 0.767 compared with 0.782 for the linear probe. Measured generation latency was roughly unchanged, especially when steering only the first token, so the real tax was not runtime. It was the additional SAE parameters, another model artifact to keep synchronized, and sensitivity to the steering coefficient.

## the takeaway

My conclusion is not that SAEs are universally better or that linear steering always suffices. For broad refusal suppression, a carefully parameterized linear method is a strong default and avoids the ambiguity introduced by reconstruction error. Paying for an SAE makes sense when the task requires control that a single direction cannot express, especially category-selective interventions, and only after checking that the effect survives residual preservation, capability evaluation, and multiple refitted seeds.

The broader lesson is methodological: steering methods should be compared across their useful operating ranges, on held-out prompts, with model breakage counted as failure and mechanistic controls included. A single refusal number hides exactly the behavior needed to decide whether the more complicated method is doing anything worth paying for.

## running it

The repository includes a Python package, CLI, tests, a Colab notebook, saved artifacts, and plotting and decision code. A full run requires Python 3.11 or newer, access to the gated Gemma model, and a GPU with about 16 GB of memory.

```bash
git clone https://github.com/sagnikc395/refusal-steering-using-saes
cd refusal-steering-using-saes
pip install -e .
hf auth login
refusal-steer all --output-dir artifacts
```

Individual experiments can also be rerun independently, while the plots and decision rule can be regenerated from saved JSON without a GPU.

ref: [refusal-steering-using-saes](https://github.com/sagnikc395/refusal-steering-using-saes)
