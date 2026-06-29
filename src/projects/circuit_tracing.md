---
title: Circuit Tracing from Scratch
date: 2026-06-29
lead: a hands-on mechanistic interpretability project for tracing GPT-2 Small behaviors with TransformerLens activation patching, residual stream probes, and logit-lens analysis.
topics: [mechanistic-interpretability, circuit-tracing, gpt-2, transformerlens, activation-patching]
image:
subimages:
---

## motivation

i wanted a concrete way to move from reading mechanistic interpretability papers to actually running the experiments. a lot of the ideas are easy to describe at a high level - induction heads, indirect object identification, residual stream patching, logit lens - but they only really become clear when you can poke at the activations yourself.

so i built a small circuit tracing workbench around GPT-2 Small and [TransformerLens](https://github.com/TransformerLensOrg/TransformerLens). the goal is not to make a polished library. the goal is to make the core techniques runnable, inspectable, and easy to modify.

the project asks a simple question: when GPT-2 gets a behavior right, which internal components are causally responsible?

instead of looking only at final logits, the code caches intermediate activations, swaps activations between clean and corrupted prompts, ablates individual attention heads, and plots where the behavior changes. that turns "the model knows the answer" into something more local: this layer, this head, this token position, this residual stream state.

## what the project covers

the repo currently implements five experiments.

### induction heads

the induction head experiment creates random token sequences, repeats them, and measures which attention heads attend from the second copy back to the corresponding position in the first copy.

that pattern matters because it is one of the cleanest examples of a transformer circuit: a head can learn "when i see a token again, attend to what came after it last time." this is a small but important mechanism behind in-context learning.

in code, the experiment reads `blocks.{layer}.attn.hook_pattern`, scores the repeated-token diagonal for every head, and renders a Plotly heatmap of layer/head induction strength.

### indirect object identification

the IOI experiment uses the classic prompt pair:

```text
When John and Mary went to the store, John gave a bag to
When Mary and John went to the store, Mary gave a bag to
```

the clean prompt should prefer `Mary`; the corrupted prompt should prefer `John`. the project defines a logit difference between the indirect object token and the subject token, then patches individual attention head outputs from the corrupted run into the clean run.

for each `(layer, head)` pair, it replaces `blocks.{layer}.attn.hook_z` and measures how much the logit difference collapses. heads that cause a large drop are likely carrying information used by the IOI behavior.

this is the main activation patching loop in the project: run clean, run corrupted, patch one component, rerun, score the causal effect.

### residual stream patching

head patching tells you which attention heads matter. residual stream patching gives a position-level view of where the relevant information appears.

this experiment patches `blocks.{layer}.hook_resid_pre` at each token position, again using the clean/corrupted IOI pair. the output is a heatmap over layers and string tokens, so you can see where the model first becomes sensitive to name order and where that information is later used.

that view is useful because transformer circuits are not only head-level. the residual stream is the shared workspace that all heads and MLPs read from and write to. patching it makes the information flow easier to see.

### logit lens

the logit lens experiment projects the residual stream after each layer through the final layer norm and unembedding matrix. instead of waiting for the final layer, it asks: if the model had to predict now, how much would it like `Mary` versus `John`?

the implementation reads `blocks.{layer}.hook_resid_post`, applies `ln_final`, unembeds into vocabulary space, and tracks the target-token logits across layers.

this is not a causal intervention by itself, but it is a good diagnostic. it shows when the answer becomes linearly visible in the residual stream and whether the model commits gradually or abruptly.

### greater-than circuit

the greater-than experiment looks at a different behavior: numeric comparison in prompts like:

```text
The war lasted from 1743 to 17
```

the score compares average logits for two-digit years greater than the start year against average logits for smaller years. then the experiment mean-ablates each attention head and measures which ablations reduce the greater-than score.

this is a nice complement to IOI because it is not about name movement or syntactic role tracking. it asks whether a similar intervention workflow can find heads involved in a more semantic numerical behavior.

## implementation notes

the project is packaged as a Click CLI. each experiment is one command:

```bash
circuit-tracing info
circuit-tracing explore
circuit-tracing induction
circuit-tracing patch-heads
circuit-tracing patch-resid
circuit-tracing logit-lens
circuit-tracing greater-than
circuit-tracing all
```

the model loader uses `HookedTransformer.from_pretrained("gpt2")` with a few TransformerLens settings that make the activations easier to interpret:

- `center_unembed=True`
- `center_writing_weights=True`
- `fold_ln=True`
- `refactor_factored_attn_matrices=True`

the experiments all follow the same shape:

1. tokenize a prompt or prompt batch
2. run the model with `run_with_cache`
3. read one of the TransformerLens hook points
4. intervene with `run_with_hooks`
5. score the behavioral change
6. render a Plotly heatmap or line chart

that structure is the main thing i wanted to preserve. once you understand one experiment, it is straightforward to add another task and reuse the same patching pattern.

## what i learned

**activation patching makes interpretability feel less mystical.** before building this, it was easy to read circuit papers as if they were mostly clever visualizations. implementing the patching loop makes the causal structure more concrete. if replacing one head's output changes the answer while replacing another does nothing, the claim is grounded in an intervention.

**the metric matters as much as the patch.** IOI uses a clean logit difference between the indirect object and subject token. the greater-than task uses a grouped score over many two-digit token logits. the intervention is only useful if the metric actually captures the behavior you care about.

**TransformerLens hook names become the map of the model.** most of the project is really about knowing where to intervene: `hook_pattern` for attention probabilities, `hook_z` for per-head attention outputs, `hook_resid_pre` and `hook_resid_post` for the residual stream. keeping a small hook reference in `docs/key_hooks.md` turned out to be more useful than expected.

**small experiments expose the limits quickly.** these experiments are deliberately minimal. they identify important heads and positions, but they do not yet prove a complete circuit. doing that properly would require testing sufficiency, not just necessity, and checking whether a proposed subgraph reproduces the behavior under stronger distribution shifts.

## setup

the project uses [uv](https://docs.astral.sh/uv/) and requires python >= 3.13.

```bash
git clone https://github.com/sagnikc395/circuit-tracing.git
cd circuit-tracing
uv pip install -e .
circuit-tracing info
circuit-tracing all
```

each command prints ranked components to stdout and opens an interactive Plotly visualization.

## what's next

- extend IOI toward the full head taxonomy from Wang et al. rather than only ranking important heads
- add attribution patching as a faster approximation to exhaustive activation patching
- implement an automated circuit discovery loop such as ACDC
- inspect MLP neurons for the greater-than behavior instead of only attention heads
- compare the same experiments across another model, such as `gpt2-medium`, to see which circuits transfer

## references

- [A Mathematical Framework for Transformer Circuits](https://transformer-circuits.pub/2021/framework/index.html)
- [In-Context Learning and Induction Heads](https://transformer-circuits.pub/2022/in-context-learning-and-induction-heads/index.html)
- [Interpretability in the Wild: a Circuit for Indirect Object Identification in GPT-2 Small](https://arxiv.org/abs/2211.00593)
- [How to Use and Interpret Activation Patching](https://arxiv.org/abs/2404.15255)
- [Towards Automated Circuit Discovery](https://arxiv.org/abs/2304.14997)

ref: [circuit-tracing](https://github.com/sagnikc395/circuit-tracing)
