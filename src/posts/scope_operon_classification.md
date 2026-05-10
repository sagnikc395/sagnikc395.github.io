---
title: "Can Protein Language Models Tell Which Genes Work Together? Operon Classification with Siamese Networks"
date: 2026-05-10
tags: [bioinformatics, nlp, protein-language-models, siamese-networks, computational-biology]
---

# Can Protein Language Models Tell Which Genes Work Together?

Bacteria are economical organisms. When they need to produce a set of proteins that work together — say, the enzymes for metabolizing a specific sugar — they often pack the corresponding genes into a single transcription unit called an **operon**. One promoter, one mRNA, multiple proteins. It's a neat trick for coordinating expression of functionally related genes.

Knowing which genes are co-operonic matters a lot. Operon structure tells you about regulatory relationships, helps you annotate the function of unknown genes by their neighbors, and has direct implications for identifying drug targets. The problem is that experimentally confirming operon membership (via RT-PCR or RNA-seq) is slow and largely limited to a handful of well-studied bacteria. For the vast majority of sequenced microbial genomes, we don't have this data.

So: can we predict it from sequence alone?

This is what SCOPE (Siamese Contrastive Operon Pair Embeddings) tried to answer. Done with Akarsh Gupta and Kenneth Rodrigues, the project compared protein language model embeddings against traditional hand-crafted features for the binary task of operon pair classification — given two consecutive genes in a genome, do they belong to the same transcription unit?

## The Setup

The task is a pairwise binary classification problem. For each pair of neighboring protein sequences, predict: operonic (1) or not (0). This framing comes from the DGEB benchmark (Diverse Genomic Embedding Benchmark), which evaluates whether learned sequence representations encode biologically meaningful relationships.

We tested four models:

**Physicochemical baselines** — Logistic regression and XGBoost operating on a 305-dimensional feature vector encoding amino acid composition, hydrophobicity, net charge, molecular weight, Shannon entropy, and biochemical group frequencies. For each pair, these features are combined via a Siamese interaction pattern: concatenation, signed difference, absolute difference, and element-wise product.

**Siamese MLP models** — Two frozen protein language model encoders (ESM-2 3B and ProtBERT-BFD), each followed by a trained MLP classifier. The encoder produces a per-token embedding for each sequence, which gets mean-pooled to a fixed-size vector. The two vectors are fused using the same Siamese interaction pattern as the baselines, then passed through the MLP to produce a classification probability.

The Siamese setup is the same across all four models — what differs is whether the input representation comes from hand-crafted chemistry or from a transformer that's read 250 million protein sequences.

## Why Siamese?

The standard DGEB approach embeds each sequence independently and computes cosine similarity. That's unsupervised — no training on the classification task at all. Our hypothesis was that a learned classifier over the *joint* embedding space should do better, because cosine similarity has a known flaw: its behavior depends heavily on the geometry induced by the encoder's training objective, and that geometry isn't necessarily aligned with what you want for binary classification.

The Siamese MLP learns a decision boundary in the fused interaction space rather than relying on angular distance alone. This is theoretically better motivated for classification. Whether it actually helps in practice is a different question — and the answer turned out to be more nuanced than we expected.

## What We Found

The clearest result: protein language model embeddings are substantially better than physicochemical features.

| Model | ROC-AUC | Average Precision |
|---|---|---|
| Logistic Regression | 0.6252 | 0.41 |
| XGBoost | 0.6160 | 0.40 |
| ESM-2 3B + MLP | **0.7104** | 0.52 |
| ProtBERT-BFD + MLP | 0.7064 | 0.51 |
| DGEB baseline (cosine sim) | — | 0.52 |

The ~10 percentage point jump in ROC-AUC from physicochemical to PLM-based models is meaningful. Amino acid composition and hydrophobicity statistics simply don't capture enough about what a protein does to reliably identify functional co-membership. A transformer trained on evolutionary sequence data encodes something richer — functional relationships, conserved motifs, structural tendencies — that the hand-crafted features miss.

The more interesting finding is the second part: our Siamese MLP doesn't significantly improve over the DGEB cosine similarity baseline in Average Precision. The DGEB baseline uses ESM-2 embeddings plus cosine similarity and gets 0.5247. Our ESM-2 3B + MLP gets 0.5172 — marginally worse, despite being a learned classifier. ProtBERT-BFD + MLP gets 0.5074.

The learned classification head didn't add much. The embedding geometry already contains the signal needed for this task, and a simple similarity measure in that space captures most of it.

## The More Surprising Number

Despite falling slightly short of DGEB's Average Precision, our ESM-2 3B Siamese MLP achieves a ROC-AUC of 0.71 — which is competitive with ESM-3 on the DGEB leaderboard. ESM-3 is a significantly newer and larger model. That our architecture using ESM-2 (an older, smaller encoder) gets comparable discrimination performance suggests that learned pairwise fusion may partially compensate for encoder limitations — or at least that ROC-AUC and Average Precision are telling different stories here.

The class imbalance matters for interpreting this. Most consecutive gene pairs in a genome are *not* co-operonic — the positive class is genuinely rare. ROC-AUC is robust to class imbalance (it summarizes performance across all thresholds), while Average Precision is more sensitive to how well you rank positives at the top. The fact that our model's ROC-AUC holds up well but Average Precision doesn't suggests it's discriminating at a global level but struggling to precisely rank the genuinely co-operonic pairs above everything else.

## What This Tells Us

The main takeaway is that the encoder is the bottleneck, not the classification head. Once you have good protein embeddings, the geometry of that space already reflects functional relationships well enough that a cosine similarity score gets you most of the way there. Adding a learned MLP on top doesn't hurt, but it doesn't help much either.

This has a practical implication: for operon prediction at genome scale, you don't necessarily need to fine-tune a classifier. You can embed sequences with a pre-trained protein language model and compute pairwise similarities — and get competitive results without any labeled training data for your target organism. That's useful when you're working on a poorly characterized microbe with no experimental operon annotations.

The physicochemical baseline results reinforce this from the other direction. Hydrophobicity and amino acid composition are real features of proteins, but they're nowhere near sufficient for this task. You need representations that encode evolutionary and functional context, and hand-crafted statistics don't do that.

## What's Next

The natural follow-up is to try newer encoders — ESM-3, ESM-C, or other recent protein language models — to see if the Average Precision gap closes. If the embedding geometry improves, the classification performance should improve with it, with or without a learned head.

Alternatively, the fusion strategy could be worth revisiting. Concatenation and element-wise products are a reasonable starting point, but cross-attention between the two sequence embeddings might capture inter-sequence relationships that the current fusion approach misses.

Longer-term, the more interesting question is whether this scales. The whole point of a computational method for operon prediction is to work on organisms we know nothing about. Testing on phylogenetically diverse genomes — not just the well-studied bacteria that dominate training data — would tell us whether protein language model embeddings actually generalize here, or whether they're implicitly relying on the distribution of organisms they were trained on.

---

*SCOPE was built with Akarsh Gupta and Kenneth Rodrigues. Akarsh and Kenneth led the model architecture and evaluation pipeline; my contribution was on the embedding infrastructure and experimental analysis. Code is on GitHub.*
