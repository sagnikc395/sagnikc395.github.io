---
title: "A Practical Survey of Mechanistic Interpretability Techniques"
date: 2026-08-23
description: "A plain-English guide to the most widely used techniques for studying how neural networks represent information and produce behavior, with the benefits and limits of each method."
tags:
  [
    machine-learning,
    interpretability,
    mechanistic-interpretability,
    transformers,
    llm,
  ]
references:
  - title: "A Mathematical Framework for Transformer Circuits"
    url: https://transformer-circuits.pub/2021/framework/index.html
    author: Elhage et al., 2021
  - title: "A Multiscale Visualization of Attention in the Transformer Model"
    url: https://arxiv.org/abs/1906.05714
    author: Vig, 2019
  - title: "Finding Neurons in a Haystack: Case Studies with Sparse Probing"
    url: https://arxiv.org/abs/2305.01610
    author: Gurnee et al., 2023
  - title: "Eliciting Latent Predictions from Transformers with the Tuned Lens"
    url: https://arxiv.org/abs/2303.08112
    author: Belrose et al., 2023
  - title: "Locating and Editing Factual Associations in GPT"
    url: https://arxiv.org/abs/2202.05262
    author: Meng et al., 2022
  - title: "Interpretability in the Wild: a Circuit for Indirect Object Identification in GPT-2 Small"
    url: https://arxiv.org/abs/2211.00593
    author: Wang et al., 2022
  - title: "Towards Best Practices of Activation Patching in Language Models: Metrics and Methods"
    url: https://arxiv.org/abs/2309.16042
    author: Zhang and Nanda, 2023
  - title: "Towards Automated Circuit Discovery for Mechanistic Interpretability"
    url: https://arxiv.org/abs/2304.14997
    author: Conmy et al., 2023
  - title: "Attribution Patching Outperforms Automated Circuit Discovery"
    url: https://arxiv.org/abs/2310.10348
    author: Syed et al., 2023
  - title: "Causal Mediation Analysis for Interpreting Neural NLP: The Case of Gender Bias"
    url: https://arxiv.org/abs/2004.12265
    author: Vig et al., 2020
  - title: "Toy Models of Superposition"
    url: https://transformer-circuits.pub/2022/toy_model/index.html
    author: Elhage et al., 2022
  - title: "Towards Monosemanticity: Decomposing Language Models With Dictionary Learning"
    url: https://transformer-circuits.pub/2023/monosemantic-features/index.html
    author: Bricken et al., 2023
  - title: "Scaling Monosemanticity: Extracting Interpretable Features from Claude 3 Sonnet"
    url: https://transformer-circuits.pub/2024/scaling-monosemanticity/index.html
    author: Templeton et al., 2024
  - title: "Interpretability Beyond Feature Attribution: Quantitative Testing with Concept Activation Vectors"
    url: https://arxiv.org/abs/1711.11279
    author: Kim et al., 2018
  - title: "Activation Addition: Steering Language Models Without Optimization"
    url: https://arxiv.org/abs/2308.10248
    author: Turner et al., 2023
---

# A Practical Survey of Mechanistic Interpretability Techniques

Modern neural networks are built from familiar mathematical operations, yet the computations they learn are often difficult to describe. We know every matrix multiplication and activation function in a transformer. What we usually do not know is how those operations combine to recognize a concept, retrieve a fact, follow an instruction, or produce an unsafe answer.

Mechanistic interpretability tries to close this gap. Its goal is to explain a model in terms of internal representations and computations, rather than only describing correlations between inputs and outputs. In spirit, the task resembles reverse engineering a program when we can inspect every variable but have no source code.

This post surveys the techniques that appear most often in practical work on transformer language models. The methods are not interchangeable. Some reveal where information is stored, some test whether a component matters, and some trace how information moves through the network. A strong investigation usually combines several of them.

## Three Questions to Keep Separate

Most mechanistic interpretability experiments answer one of three questions:

1. **What information is represented?** For example, does a hidden state contain information about sentiment, syntax, or whether a statement is true?
2. **Where is a behavior produced?** Which layers, attention heads, neurons, or learned features are important for the output?
3. **How is the computation performed?** How do the important components interact to transform the input into the output?

This distinction matters because evidence for representation is not automatically evidence for use. A model state can contain enough information for a probe to decode a person's name even if the model does not use that information when producing its answer. Likewise, an attention head can look linguistically meaningful without being necessary for the behavior.

The most reliable studies therefore move from observation to intervention. They first form a hypothesis by inspecting activations or attention, then change the relevant internal state and measure the effect on behavior.

## 1. Inspecting Activations and Neurons

The simplest approach is to record the activation of a neuron, attention head, or residual-stream direction over many inputs. Researchers then inspect the examples that produce the largest activations and look for a shared pattern.

A neuron might activate strongly on code, quotations, geographic names, or text written in French. Plotting activations by token can also show when a feature appears during a sequence. This is sometimes called activation profiling or feature visualization.

**Main benefit:** it is fast, intuitive, and useful for generating hypotheses. It can reveal regularities that are difficult to see from weights alone.

**Main limitation:** a list of highly activating examples is correlational. It does not show that the neuron causes a behavior. Individual neurons may also be polysemantic, meaning that one neuron responds to several unrelated patterns. Looking only at the top examples can hide this mixed role.

Activation inspection is best treated as the beginning of an investigation, not its conclusion.

## 2. Attention Pattern Analysis

Transformer attention provides a natural visual object: for each destination token, an attention head assigns weights to earlier source tokens. Researchers often plot these weights as heat maps and search for recurring patterns.

Some heads attend to the previous token, matching punctuation, repeated names, or tokens at a fixed relative position. In small transformers, careful attention analysis has helped identify induction heads, which support copying and pattern completion, and name-moving heads, which help move information about a relevant name toward the final prediction.

**Main benefit:** attention maps show routes along which information may be gathered. They are particularly useful for understanding sequence position, copying, reference resolution, and other relational operations.

**Main limitation:** attention weights are not the same as causal importance. A head can place a large weight on a token while writing little useful information to the residual stream. Conversely, a modest attention weight can have a large effect if the associated value vector is important. Attention analysis should therefore include the head's output and, ideally, an intervention.

So attention weights show where a head reads from. They do not, by themselves, tell us what the head reads or whether the result matters.

## 3. Logit Lens and Direct Logit Attribution

The residual stream is the shared communication channel that passes through a transformer. Because the final prediction is obtained by projecting the last residual state into vocabulary logits, we can apply that same projection to intermediate states. This produces an approximate vocabulary distribution at each layer, commonly called the **logit lens**.

The logit lens can show how a prediction develops. An early layer may favor words related to the subject, while later layers narrow the distribution to the final answer. A related technique, **direct logit attribution**, measures how much a component's output contributes to the logit difference between two candidate tokens.

**Main benefit:** these methods connect hidden states to outputs that people can read. They are inexpensive and useful for locating layers or components that promote a particular answer.

**Main limitation:** intermediate residual states were not necessarily trained to be decoded by the final output matrix. Their apparent vocabulary meaning can therefore be misleading. Direct attribution also captures a component's immediate contribution, not every indirect effect it has through later layers.

These tools are excellent for screening and decomposition, but causal patching is needed when the claim concerns necessity or mediation.

## 4. Probing and Concept Directions

A probe is a small supervised model trained on frozen internal activations. A linear probe, for example, may be trained to predict whether a sentence is positive or negative from the residual stream at each layer. If it succeeds, the activation contains linearly decodable information about sentiment.

Concept activation vectors use a related idea. A direction is learned that separates examples containing a human-defined concept from control examples. Researchers can then measure whether movement along that direction is associated with a model output.

**Main benefit:** probes turn a vague question about representation into a quantitative test. They allow comparisons across layers, token positions, model sizes, and training stages. Linear probes are especially useful because their limited capacity reduces, though does not remove, the risk that the probe learns the task independently.

**Main limitation:** decodability does not prove that the model uses the information. Powerful probes may extract information that is present only weakly or incidentally. Results also depend on the dataset, negative examples, probe capacity, and regularization.

A good probe experiment includes simple baselines, held-out evaluation, controls for probe complexity, and a causal test of the discovered direction when possible.

## 5. Ablation

Ablation removes or suppresses a component and measures how model behavior changes. Researchers may zero an attention head, replace a neuron activation with its mean, remove an edge, or suppress a learned feature.

If ablating a head sharply reduces performance on a task while preserving general model behavior, that is evidence that the head is important for the task.

**Main benefit:** ablation is a direct causal intervention. It helps distinguish components that merely correlate with a behavior from components that contribute to it.

**Main limitation:** an unnatural intervention can move the model into an activation regime it never encountered during training. Zero ablation may introduce a larger disturbance than intended. Models also contain redundancy, so removing one component may have little effect even when it normally participates in the computation.

Mean ablation, resampling ablation, and carefully chosen controls can reduce these problems. The correct choice depends on the question. There is no universally neutral baseline.

## 6. Activation Patching and Causal Tracing

Activation patching is one of the most widely used causal methods in mechanistic interpretability. The experiment begins with two inputs:

- A **clean input** on which the model displays the behavior of interest.
- A **corrupted input** that changes an important fact or causes the model to produce a different answer.

The researcher runs both inputs and saves their internal activations. During a new corrupted run, one activation is replaced with its value from the clean run. If this replacement restores the clean answer, the patched component carries information that is causally relevant to the behavior.

Patching can be applied to residual states, attention-head outputs, MLP outputs, neurons, or individual edges. Similar approaches are also called causal tracing or interchange intervention, depending on the setup.

**Main benefit:** patching localizes causal information with more precision than observation alone. It can identify the layer and token position at which a fact, grammatical relation, or task variable becomes important.

**Main limitation:** results can change substantially with the corruption method, patching baseline, and evaluation metric. Patching one node measures a total effect that may travel through many downstream paths. It also depends on a meaningful contrast between the clean and corrupted examples.

Patching is strongest when the dataset contains many carefully controlled input pairs and the result is stable across plausible metrics and corruptions.

## 7. Path Patching and Edge-Level Analysis

Standard activation patching asks whether a node matters. **Path patching** asks whether information travels along a particular connection or sequence of connections. Instead of replacing an entire component everywhere downstream, the researcher replaces only the message sent from one component to another.

This can separate a head's effect on an early MLP from its effect on a later attention head. It is useful when several components are individually important but the structure of their interaction is unclear.

**Main benefit:** path patching moves the analysis from a list of important parts toward an account of the computation. It can distinguish direct and indirect effects and clarify the flow of information.

**Main limitation:** the number of possible paths grows rapidly with model size. Edge interventions can also be technically delicate because information is distributed through the residual stream. As with node patching, the meaning of the result depends on the chosen counterfactual activation.

Path-level analysis is usually applied after broader methods have reduced the search space.

## 8. Circuit Discovery

A **circuit** is a relatively small subgraph of model components and connections that explains a behavior. Circuit analysis combines attention inspection, attribution, ablation, and patching to propose a computational story and test it.

For example, one set of heads might identify candidate names in a prompt, another might suppress the wrong candidate, and a later head might copy the remaining name to the output position. The value of the circuit is not merely that its parts are important. It explains the roles of the parts and how they work together.

Manual circuit discovery can be slow, so automated methods score nodes or edges and prune those that appear unimportant. Attribution patching uses gradients to approximate the effect of many activation patches with only a small number of model passes. This makes large searches much cheaper than patching every component separately.

**Main benefit:** circuits provide the closest thing to an algorithmic explanation of a neural network behavior. Automated discovery can make the search more scalable and reproducible.

**Main limitation:** a circuit is always defined relative to a task, dataset, metric, and level of abstraction. A circuit found on a narrow template may not generalize to natural inputs. Gradient-based approximations can miss nonlinear interactions, while exhaustive causal testing is expensive.

A convincing circuit should satisfy at least three tests: it should be faithful to the original model, sufficient to reproduce much of the behavior, and hold up across a meaningful range of examples.

## 9. Sparse Autoencoders and Dictionary Learning

Neuron-level analysis assumes that individual neurons are sensible units of meaning. Superposition challenges this assumption. A model may represent more features than it has dimensions by placing several features in overlapping directions. As a result, a neuron can be polysemantic and a meaningful feature can be spread across many neurons.

Sparse autoencoders, or SAEs, try to recover a more interpretable basis. An SAE is trained to reconstruct a model's activations using a much larger set of latent features, while encouraging only a small number of those features to be active at once. Researchers inspect the inputs that activate each learned feature and can intervene on the feature to test its effect.

**Main benefit:** SAEs offer a practical way to study features that do not align with individual neurons. They can produce units that correspond to recognizable topics, entities, styles, syntactic patterns, and safety-relevant concepts. Once learned, these features can support large-scale monitoring and feature-level circuit analysis.

**Main limitation:** an SAE is another learned model, not a transparent ground-truth decomposition. Its features depend on architecture, training data, sparsity penalty, and random initialization. Some features split one concept into several latents, combine multiple concepts, or activate too rarely to interpret. Reconstruction error means the SAE also fails to capture part of the original activation.

SAE features should therefore be judged by several criteria: interpretability, reconstruction quality, sparsity, stability, and causal influence. A feature with a compelling label but no measurable effect on behavior is not yet a mechanistic explanation.

## 10. Feature Steering and Representation Editing

Once a direction, neuron, or SAE feature has been identified, researchers can increase or decrease it during inference. This is often called activation steering. If strengthening a feature produces more code and suppressing it produces less code, the intervention provides causal evidence about the feature and may offer a way to control behavior.

Related model-editing methods alter weights rather than temporary activations. They can test hypotheses about where factual associations or other computations are stored.

**Main benefit:** steering converts interpretation into an experimental intervention. It can validate a proposed feature, expose unexpected side effects, and provide lightweight control without retraining the whole model.

**Main limitation:** successful control does not prove that the model normally uses the feature in the same way. Large interventions may push activations outside their normal range and create broad, artificial changes. A direction can also affect several correlated concepts at once.

For validation, small interventions, dose-response curves, negative controls, and measurements of unrelated capabilities are more informative than a single dramatic example.

## How the Techniques Fit Together

A practical investigation often follows this sequence:

1. **Define a behavior precisely.** Build a dataset and choose a metric, such as the logit difference between a correct and incorrect answer.
2. **Locate candidate representations.** Use activation inspection, attention patterns, probes, the logit lens, or direct attribution.
3. **Test causality.** Apply ablation or activation patching to the candidate components.
4. **Trace interactions.** Use path patching and edge-level analysis to determine how the components communicate.
5. **Form a circuit hypothesis.** State the role of each component and the algorithm they collectively implement.
6. **Validate the explanation.** Test new examples, alternative corruptions, sufficiency, necessity, and possible side effects.

Sparse autoencoders can enter this workflow when neurons are too mixed to serve as useful units. Automated attribution and circuit-discovery methods can enter when the search space becomes too large for manual analysis.

## A Compact Comparison

| Technique             | Primary question                          | Main benefit                     | Main caution                       |
| --------------------- | ----------------------------------------- | -------------------------------- | ---------------------------------- |
| Activation inspection | What activates here?                      | Fast hypothesis generation       | Correlation is not causation       |
| Attention analysis    | Where does a head read from?              | Reveals token relationships      | Attention weight is not importance |
| Logit lens            | How does the prediction develop?          | Connects states to vocabulary    | Intermediate decoding can mislead  |
| Probing               | What information is decodable?            | Quantitative representation test | Decodable does not mean used       |
| Ablation              | Is this component necessary?              | Simple causal evidence           | Intervention may be unnatural      |
| Activation patching   | Where is causal information carried?      | Precise localization             | Sensitive to baselines and metrics |
| Path patching         | Which connection carries the effect?      | Reveals information flow         | Expensive and combinatorial        |
| Circuit discovery     | What subgraph implements the behavior?    | Algorithm-level explanation      | Often task-specific                |
| Sparse autoencoders   | What features lie behind mixed neurons?   | Handles superposition            | Learned features are imperfect     |
| Steering              | Does changing the feature alter behavior? | Causal validation and control    | Strong edits may be artificial     |

## What Counts as Good Evidence?

Mechanistic interpretability is vulnerable to explanations that sound plausible but do not survive careful testing. Several habits make conclusions stronger.

First, use a clear behavioral metric. Accuracy alone can hide whether an intervention changes the specific output under study. Logit differences often provide a more sensitive measure.

Second, use controls. Compare against random components, alternative prompts, unrelated tasks, and multiple intervention baselines. A method that highlights almost every component has not localized much.

Third, distinguish necessity from sufficiency. Ablation tests whether a component is needed. Keeping only a proposed circuit tests whether it is enough. Neither test alone gives a complete account, especially when the model contains redundant mechanisms.

Fourth, test generalization. An explanation found on one prompt template may describe that template rather than the underlying behavior. Evaluation should vary wording, entities, positions, and difficulty.

Finally, keep the claim proportional to the evidence. A probe supports a statement about decodability. Patching supports a statement about causal mediation under a particular counterfactual. A circuit that survives controls requires both localization and a tested account of component interactions.

There is no single best mechanistic interpretability technique. The field works through a ladder of evidence. Visualization suggests what a component might represent. Probing measures whether information is available. Ablation and patching test whether it matters. Path analysis and circuit discovery explain how the pieces interact. Sparse autoencoders provide alternative units when neurons are too entangled, while steering tests whether those units can control behavior.

The central practical lesson is simple: combine observational and causal methods. A readable attention map or a neatly labeled feature is useful, but an explanation becomes substantially more credible when an intervention changes the predicted behavior in the expected way, when the result holds across examples, and when the proposed components fit into a coherent computation.

Mechanistic interpretability is still an early science. Its methods can already reveal striking internal structure, but they do not yet offer complete or automatic explanations of large models. The best current work treats every interpretation as a hypothesis to be tested, not merely a story to be told.
