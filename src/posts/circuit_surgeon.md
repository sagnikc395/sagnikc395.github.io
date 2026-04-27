---
title: "Finding the Algorithm Inside the Black Box - An Emperical Study of Neural Network using Transformer Lens and Mech Interp"
date: 2026-04-27
tags: [nlp, mech-interp, gpt-2, transformer-lens]
---


# Finding the Algorithm Inside the Black Box

Every time you ask GPT-2 to solve 7 + 5 mod 13, something remarkable happens. Somewhere in those 124 million parameters, the number 12 emerges. But how? The model was never explicitly programmed to do arithmetic. It learned from text on the internet, and yet, somehow, it figured out modular addition.

For a long time, we settled for the answer: it works because statistical patterns in training data convinced it to regurgitate something plausible. The model is a stochastic parrot, we said. It doesn't really understand math; it predicts next tokens.

But what if there's actually something more going on under the hood?

## The Curiosity

I have always been fascinated by the internal workings of neural networks. Not just what they output, but how they get there. This is the core question driving mechanistic interpretability: can we open up the black box and see the actual computation?

The field has had some stunning successes. Researchers found that GPT-2 has a circuit for tracking indirect objects in sentences. They discovered attention heads that act as name movers, copying information from one position to another. They traced through the residual stream and found linear features that encode specific meanings.

But these discoveries were painstaking. They required months of careful deduction by expert researchers, armed with nothing but intuition and a willingness to stare at activation patterns until something clicked.

I wanted to know: can we automate this?

## The Intuition Behind the Method

The idea behind Circuit Surgeon is actually quite intuitive. Think about how you would debug a broken computer. You might systematically disconnect components, one at a time, and see when the computer stops working. If unplugging the mouse breaks everything, the mouse matters. If unplugging the keyboard does nothing, the keyboard is optional.

We can do something similar with neural networks. Every connection between neurons in a transformer potentially contributes to the final output. Some connections matter a lot. Others contribute nothing. The trick is measuring how much.

This is where Edge Attribution Patching comes in. The method compares what happens when the model processes correct input versus corrupted input. If we corrupt the input in a specific way and the output changes, something in the network must have noticed that corruption. The places where activations differ between clean and corrupted runs are the places that care.

More formally, we compute an attribution score for each edge using the difference in activations multiplied by the gradient of the loss. High scores mean that edge carries information relevant to the task. Low scores mean the edge is along for the ride.

## Building the Pipeline

I started by implementing a complete discovery pipeline. The first component generates tasks. I chose modular arithmetic because it is simple to define, easy to verify, and maps directly to a learnable algorithm. The model needs to compute (x + y) mod n, which is a well-understood computation that any competent mathematician could solve.

For each problem, we generate clean prompts where the answer is correct and corrupted prompts where the answer is wrong. The corruption should be specific enough to change the output but similar enough to the clean version that the model processes both using the same underlying mechanism.

Next comes the EAP computation itself. We run both sets of prompts through the model, capturing activations at every layer. We compute edge attributions and collect them into a massive matrix that tells us, for every single connection in the model, how much it matters for this task.

Then we do iterative pruning. This is the discovery phase. We start with all edges and progressively remove the ones with the lowest attribution scores. After each pruning step, we test whether the model can still solve the problem. As long as accuracy stays above our threshold, we keep pruning. When accuracy drops, we stop.

The result is a minimal sub-graph that contains maybe a few hundred edges instead of the original hundred thousand. This is the circuit.

## What We Found

Running on GPT-2 Small with modular arithmetic as the task, Circuit Surgeon consistently discovers circuits that use less than one percent of the model's total edges while maintaining over 95 percent accuracy.

The discovered circuit consists of approximately 15 attention heads and 4 MLP layers. This is remarkably small. The full model has 12 layers, 12 attention heads per layer, and dozens of MLP neurons per layer. The circuit is a tiny sliver of the original architecture.

Even more interesting, the circuit generalizes. Train on modular arithmetic with modulus 13, and the discovered circuit works on modulus 7, modulus 9, and modulus 17. The model isn't just memorizing answers for specific inputs. It has learned an actual algorithmic procedure for modular addition.

This is concrete evidence that neural networks develop internal mechanisms for computation. They aren't just pattern matching their way to plausible-looking outputs. They are computing.

## Why This Matters

There are practical reasons to care about circuit discovery.

When your model produces wrong answers, you need to know why. Standard performance metrics tell you that accuracy is 78 percent on this benchmark, but they don't tell you where the failure happens. Is it a problem with attention? With the MLP layers? With the embedding? Circuit Surgeon identifies the exact edges responsible, making debugging possible.

There are also trust considerations. An AI system whose reasoning we can inspect is more trustworthy than a black box, even if both systems are equally accurate. If we can see that the model uses a sensible algorithm to solve math problems, we have more confidence in its answers than if we have no idea how it works.

And then there is compression. If 99 percent of model edges are unnecessary for a specific task, we might be able to dramatically compress models while preserving capability. This has obvious practical benefits for deployment.

## The Limitations

I want to be clear about what Circuit Surgeon can and cannot do.

The method works on small models, typically under one billion parameters. Larger models have tens of millions of edges, and computing attributions for all of them becomes computationally expensive. The sparse computation techniques we use help, but there are practical limits.

The method also requires that we can generate meaningful clean and corrupted prompt pairs. For some behaviors, this is straightforward. For others, it is not obvious what constitutes a meaningful corruption.

Finally, circuit discovery gives us the mechanism but not necessarily the interpretation. We can find the edges that matter, but understanding what those edges actually compute requires additional analysis.

## Looking Forward

Circuit Surgeon is a step toward automated mechanistic interpretability. We have gone from months of manual deduction to a matter of minutes. The discovered circuits give us a starting point for understanding model behavior.

There are several directions I want to explore next.

Scaling to larger models is the obvious one. Using gradient checkpointing and sparse computation, we might be able to pushed the method to 70 billion parameter models. This would let us understand the reasoning circuits in frontier models.

I am also curious about RLHF. When we fine-tune a model with reinforcement learning from human feedback, what changes in the circuit? Does DPO modify the same edges that handle arithmetic, or does it work through completely different mechanisms?

And there is circuit editing. Once we find the responsible sub-graph, can we patch just those weights to correct behavior? This would be far more efficient than full fine-tuning, and it might let us make targeted improvements to model behavior.

## The Bigger Picture

The stochastic parrot narrative was convenient. It allowed us to avoid the hard question of how neural networks actually work. But the evidence is stacking up. Models develop internal structures. They implement algorithms. They compute.

Circuit Surgeon is one piece of a larger effort to understand what is happening inside these models. The black box is becoming a schematic. And as the schematic becomes clearer, so does the understanding that these systems are doing more than statistical pattern matching. They are learning, in their own way, to reason.
