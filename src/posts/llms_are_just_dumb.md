---
title: LLMs are Just Dumb
date: 2025-10-30
image:
---

one of the most surprising things , dare I say weird things that I found about taking a NLP course in grad school is the fact that LLMs as a whole are a token crunching machines , compared to taking text as input that I originally thought they would be. you would think that how come an LLM that takes text that you type as a input and gives out text as an output would be using tokenization (and heck even, what even is tokenization), but there are some pretty good reasons why this would be the case. also another thing , to my surprise , is why models perform better on english language text than other language text has a very distinct reason that just the training size of the english language based corpus being huge, and how an idea from 40 years ago (it seems like most of the old ideas in AI are good, we just didn't have good enough hardware to support that) is one of the fundamental pieces of tech, which GPT-2 used to make ingestion of such large scale data into pre-training GPT-2 possible. recently there have been super useful improvements itself in the bpe algorithm : superbpe and how they improve tokenization and making embeddings more efficient for non-english language super efficient and easy.

