---
title: "A reproducibility of CRISP"
date: 2026-08-03
tage: [mech-interp, sae-features, unlearning-methods,blue-dot-ai]
---

## tl;dr

* **the paper.** CRISP, from the Technion NLP group, ACL 2026. an unlearning method that removes a concept from a language model without wrecking it on everything else.
* **the trick.** use a sparse autoencoder to find the few internal features that fire on the concept and not on benign neighbouring text, then train a small LoRA adapter to switch exactly those off.
* **why it matters.** the edit lives in the weights, not in an inference time intervention, so nobody can simply turn it off later.
* **the claim.** better aggregate score than RMU and ELM on biosecurity and cybersecurity unlearning, mostly by damaging the model far less on the way.
* **my scope.** the published version sits behind roughly two thousand four hundred finetuning runs. i am narrowing to the Gemma 2 2B rows at the authors' own best hyperparameters, which is a handful of cheap runs and still tests the central claim.
* **what exists.** the method reimplemented from the paper rather than ported, every equation mapped to a module and checked numerically by hand, plus an mlx backend for fast local evaluation on Apple silicon.
* **known hazards.** the paper's LLM judge is pinned to a model version that can no longer be called, the question splits are bespoke, and the aggregate is a harmonic mean, so one bad axis sinks a method and part of the reported gap may be metric design.
* **status.** experiments still running. no numbers here yet.

## background 

i few weeks back fresh out of the AI safety fundamentals course i was looking for a piece of work small enough to actually finish and serious enough to teach me something, and i landed on CRISP, a paper from the Technion NLP group that appeared at ACL 2026 under the title *Persistent Concept Unlearning via Sparse Autoencoders*. what follows is a synopsis of the paper, what a reproduction of it actually involves once you stop reading and start running things, and where my own attempt currently stands. results are deliberately left out for now, since the experiments are still running.

## what the paper is about

the problem CRISP goes after is concept unlearning. you have a language model that knows something you would rather it did not know, say the contents of the WMDP biosecurity corpus, and you want to remove that knowledge without turning the model into a wreck on everything else. the field has answers already. RMU perturbs the representations of forget data at a chosen layer, ELM trains the model to behave as though it never saw the concept, and both work in the sense that benchmark accuracy on the forget set drops. both also have a habit of collateral damage that shows up the moment you ask the edited model to write a paragraph.

CRISP's angle is to be surgical about which internal directions get touched, and its instrument is the sparse autoencoder. an SAE is trained to reconstruct a model's residual stream as a sparse combination of many more features than the residual stream has dimensions, and the hope, borne out reasonably well in practice, is that those features line up with humanly nameable concepts. Gemma Scope and Llama Scope are large public collections of exactly these, one SAE per layer, which means you can borrow the interpretability work rather than redo it.

the method itself is two phases and is honestly quite simple once you see it. first, feature selection. run a target corpus (the thing to forget) and a retain corpus (benign text from the same broad field, so you are not accidentally measuring topic drift) through the model, read the residual stream at a few layers through the SAE, and count how often each feature fires on each corpus. take the difference in activation counts, keep the top k features, and then filter those by a ratio test so that a feature survives only if its cumulative activation on the target corpus is at least tau times its activation on the retain corpus. what is left is a small set of features that are specific to the concept rather than merely common.

second, the edit. attach a LoRA adapter to a band of early blocks and train it with three terms. the unlearning loss pushes the selected features' activations toward zero on the target corpus. the retention loss pins hidden states to those of the frozen original model on retain text. a coherence loss does the same on a small set of twenty short benign sentences per domain, which is there to stop the model from degenerating into repetition. the weights are lopsided in a way that is worth noticing, with beta at 0.99 on retention and gamma at 0.01 on coherence, so most of the optimisation pressure is spent on not breaking anything.

the crucial word in the title is persistent. inference time SAE steering can suppress the same features, but anyone with the weights can simply stop steering. CRISP bakes the change into the weights, and that is the property the paper is really selling.

evaluation runs on six numbers. unlearn accuracy on WMDP, which should go down, retain accuracy on a neighbouring benign multiple choice set and MMLU, which should not, and fluency and concept scores from zero to two awarded by an LLM judge over a hundred generation prefixes per domain. those five get folded into an overall score by harmonic mean, which is a choice with teeth, because a harmonic mean is dominated by its smallest term. the paper reports CRISP winning on overall in all four of its main settings, with the largest gaps on WMDP Bio, and reports the baselines failing in visible ways, RMU falling into repetition loops on in domain text and ELM emitting markup and refusing harmless prompts.

## what reproducing it actually costs

the published experiments are not something a person reproduces on a laptop. the paper runs a two hundred configuration search per method, per model, per domain, which is roughly two thousand four hundred finetuning runs behind the numbers in table 1. so the first real decision was to not reproduce the paper as published. instead the plan is to take the best hyperparameters the authors already report in their appendix and run the Gemma 2 2B rows of table 1 and table 3 directly. that turns hundreds of GPU hours into a handful of runs of under a dollar each, and it still tests the paper's central claim, which is that CRISP beats RMU and ELM on the aggregate score.

the phasing is: get the environment and the Harry Potter demo working first, since that is the one place where the authors' released code, a public dataset and a small model all line up against a published number. then Gemma 2 2B on both WMDP domains with all three methods. then Llama 3.1 8B only if the first two hold, because that is where the money starts going.

## what has been built so far

the authors' release covers feature selection, the LoRA optimisation and evaluation, plus a demo notebook, but WMDP is not a turnkey script there and the corpora need separate access. so the reimplementation was written from the paper rather than ported. it is about two and a half thousand lines with the equations mapped one to one onto modules, so that every symbol in the paper has an address in the code: activation counts and the difference statistic in one file, the top k and tau filter beside them, the three losses in another, the harmonic mean and the appendix selection criterion in a third. a suite of twenty eight tests checks the equations numerically against values computed by hand, and an integration test runs the whole pipeline on a tiny random model and asserts that the unlearning loss actually goes down.

a few judgement calls were forced along the way and they are worth recording, because they are the kind of thing that silently changes numbers. the frozen reference model in the retention loss is obtained by disabling the LoRA adapters rather than keeping a second copy of the weights in memory, with a test asserting that the adapter disabled logits match the original exactly. activations are read at each block's output, which is what the public SAEs were trained on, and the hook deliberately reads the unnormalised stream. the activation count difference is normalised by token count before subtracting, because the cyber retain corpus is roughly four times the size of the forget corpus and without rescaling the statistic would mostly rank corpus size. and the bio forget corpus turns out not to live where the rest of the WMDP corpora live, so the data layer had to learn about a separate gated repository.

the loss curves from the first Gemma 2 2B runs look the way the paper's weighting implies they should: the unlearning term drifts around while the retention and coherence terms dominate the total and pull it down, with the occasional spike where a batch of retain text lands badly.

![training loss curves for gemma2-2b on the bio domain](/assets/images/crisp-training_gemma2-2b_bio_crisp.png)

![training loss curves for gemma2-2b on the cyber domain](/assets/images/crisp-training_gemma2-2b_cyber_crisp.png)

there is also a second evaluation backend that runs the model through mlx on Apple silicon, which is several times faster locally and keeps a quantised Gemma 2 2B at around 1.5 GB. it is inference only, since CRISP differentiates through per layer residual activations and mlx exposes neither forward hooks nor that autograd surface. quantised weights also perturb the residual stream, so it is for fast iteration and sanity checks, not for reported numbers.

## where the pipeline currently sits

the harness runs end to end and produces the six numbers, so what follows is a picture of the plumbing working rather than a result. at the moment the edited model tracks the original almost exactly on every axis, which is the signature of an edit that has not bitten yet, not evidence about the method.

![six evaluation metrics, original versus crisp, gemma2-2b bio](/assets/images/crisp-metrics_gemma2-2b_bio.png)

![six evaluation metrics, original versus crisp, gemma2-2b cyber](/assets/images/crisp-metrics_gemma2-2b_cyber.png)

the same thing said as a trade off: the point that should be moving left, toward chance accuracy on WMDP, while holding its height on in domain MMLU, is currently sitting on top of the unedited model.

![forget/retain trade-off, gemma2-2b bio](/assets/images/crisp-tradeoff_gemma2-2b_bio.png)

![forget/retain trade-off, gemma2-2b cyber](/assets/images/crisp-tradeoff_gemma2-2b_cyber.png)

## the hazards i already know about

a few things will make my numbers drift from the paper's and it is better to say so up front than to discover it afterwards. the LLM judge in the paper is pinned to a model version that is no longer callable, so a substitute has to be calibrated against the unedited model's published fluency and concept scores before any comparison is meaningful. the validation and test split of the WMDP questions is the authors' own, so one or two points of movement on accuracy is expected and is not a failure. and the overall score being a harmonic mean means the headline gaps may be partly a metric design artifact, since ELM's fluency of 0.25 becomes 12.5 after scaling and drags its aggregate down on its own. isolating how much of the reported advantage is method and how much is metric is one of the things i want to come out of this.

beyond straight reproduction there are a few extensions i have sketched, mostly in the direction of white box analysis: comparing circuits and representations before and after unlearning to see whether connections are broken or merely suppressed, and asking what a dense direction learned for the same concept looks like next to the sparse features, which would say something about whether the SAE is earning its place.

experiments are in flight. numbers to follow.
