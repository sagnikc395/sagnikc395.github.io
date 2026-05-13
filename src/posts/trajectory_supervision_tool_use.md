---
title: "Does Showing Your Work Help LLMs Learn Tools? A Continual Learning Experiment"
date: 2026-05-10
tags: [nlp, llm, continual-learning, tool-use, qlora, fine-tuning,agents]
---

# Does Showing Your Work Help LLMs Learn Tools?

Here's a question that bothered me through most of this semester: when we train a language model to use APIs, does it matter whether we show it the full back-and-forth history of a tool interaction, or just the final call?

It sounds academic. But it connects to something genuinely important about how LLMs learn. Most training data shows finished products: polished answers, complete code, final outputs. The messy intermediate process that produced the answer is usually thrown away. This is a bit like trying to learn chess by only ever seeing the final board state, never the moves that got there.

For this project (done with Vishnu Vardhan Reddy B and Soumik Bhatta for CS 590NN at UMass Amherst), we tried to get a concrete handle on this question using tool-use data, where the intermediate process is actually available and structured.

Link to the paper: [Paper](https://arxiv.org/abs/2605.09734)

## The Setup

Tool-use examples from API-Bank have a natural trajectory structure: a user request, an API call, the API response, and the next action. This action-observation sequence is exactly the kind of intermediate process that normal training data strips out.

We compared two training conditions on Llama 3.1 8B Instruct fine-tuned with QLoRA:

- **Condition A (stripped context):** Remove the previous API request/response lines from the prompt. Train only on next-API-call prediction given the user request and current context.
- **Condition B (trajectory context):** Keep everything — including prior API calls and their responses — in the prompt. Same task, more context.

To make things harder and more interesting, we used **continual learning** as the evaluation framework. Instead of training on one API domain, we split API-Bank into four sequential domain blocks (D1 through D4) and trained on them one after another. After each block, we evaluated on all blocks seen so far. This is a stress test: catastrophic forgetting is common in sequential fine-tuning, and we wanted to see if the supervision format itself changed how the model adapted and retained knowledge.

Everything else was held constant — same base model, same QLoRA hyperparameters (rank 32, alpha 64, 4-bit NF4 quantization), same seed, same evaluation code.

## What We Found

The clearest result came from the full held-out generation evaluation after training through all four blocks:

| Condition | Exact Full-Call Accuracy | API-Name Accuracy |
|-----------|--------------------------|-------------------|
| A: Stripped context | 39.2% | 66.6% |
| B: Trajectory context | **56.9%** | **74.3%** |

That's a 17.7 percentage point gap on exact full-call accuracy. Condition B also scored higher on every individual domain block, not just on average.

The error breakdown tells the more interesting story. At the final stage, Condition A made **102 wrong-API errors** — cases where the model picked the entirely wrong tool. Condition B made only **12**. Keeping the trajectory context dramatically improved tool selection.

There's a catch though. Condition B also produced more malformed or unparseable calls (101 vs. 45 for A). Having access to the full action-observation history helped the model identify *what* to call, but longer prompts made it harder to produce a perfectly formatted call. Our parser is strict — a call with the right API name and nearly-correct parameters still counts as failure if the string doesn't exactly match.

On the continual learning side, the sampled evaluation during training showed that B had higher forward transfer (33.3 vs. 22.9) and higher final average accuracy (53.9 vs. 38.3), but also more negative backward transfer (-13.5 vs. -10.4). Neither condition escaped forgetting — this is a known problem with sequential fine-tuning without replay — but B generally ended up in a better place.

## Why Does Trajectory Context Help?

The intuition is that an action-observation sequence gives the model more signal about *what the task actually requires*. When you see "the previous call returned X, and now I need to do Y," you have a richer picture of the workflow than if you only see the final request for Y. This is especially useful for picking the right tool, because the prior context constrains which APIs are plausible next steps.

This connects to process supervision work in reasoning (Lightman et al., "Let's Verify Step by Step"), which showed that step-level supervision can outperform final-answer supervision for math problems. Our setup is different — API traces are external interaction records, not human reasoning traces — but the underlying hypothesis is similar: intermediate steps carry information that final outputs lose.

## What We Can't Conclude

Condition B uses 25.1% more training tokens (2.32M vs. 1.86M) because trajectory prompts are longer. More data can help even if the extra content doesn't causally matter. We only ran one seed, so there are no confidence intervals. And API-Bank traces are structured and partly synthetic, which makes them a cleaner testbed than real-world tool-use data but also limits how much we can generalize.

So the honest summary is: trajectory context is associated with better performance in this setup, but we can't fully isolate whether it's the *content* of the trajectory or simply the *additional tokens* that explain the gap.

## What's Next

The most important follow-up is token-matched training — pad or truncate Condition A's inputs so both conditions see the same number of tokens. If B still wins after that, trajectory content is doing real work. Multiple seeds would let us report confidence intervals and see whether this is a stable effect.

Beyond that: longer task streams, semantic parameter scoring (so a nearly-correct call isn't a total failure), and eventually testing whether replay or retrieval methods interact differently with the two supervision formats.

For now, the experiment supports a hypothesis worth taking seriously: **when training LLMs to use tools, showing the model what happened before — not just what needs to happen next — appears to help it learn which tool to reach for.** That's not nothing, even with the caveats.

---

*This project was done with Vishnu Vardhan Reddy B and Soumik Bhatta for CS 590NN at UMass Amherst. Vishnu built the data preprocessing and evaluation pipeline, I handled the training notebook and continual-learning metrics, and Soumik did the error analysis and figures.*
