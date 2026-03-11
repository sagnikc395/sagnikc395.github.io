---
title: My Teeny Tiny Understanding of Diffusion Models
date: 2026-3-10
image:
---

*(This took a lot of time to write, as I had to traverse through my course notes again and refer to sources , and Im really glad I did that as it really solidified the understanding of the topic not only from an exam perspective but also really really understand how modern diffusion models came into being)*

# From Noise to Cats: A Deep Dive into Normalizing Flows and Diffusion Models

There's a strange and wonderful idea sitting at the heart of modern generative AI: that you can start with pure, structureless noise — just a cloud of random numbers drawn from a standard Gaussian — and, by applying the right transformation, produce a photorealistic image of a cat. Or a sandwich at a bowling alley. Or anything else you can describe.

The two dominant mathematical frameworks for doing this are **normalizing flows** and **diffusion models**. They take very different roads to the same destination, and understanding both is one of the most satisfying journeys you can take in machine learning. One is a masterpiece of mathematical precision. The other is, in the words of a professor I once had, *"incredibly appealing"* — both as an idea and as a method that actually works spectacularly well in practice.

This post covers both. We'll build up the core mathematics carefully, connect everything to intuition, and by the end you'll have a real grasp of not just *what* these models do, but *why* they work. If you've seen some probability and calculus, you should be able to follow along. Linear algebra helps too.

## The Problem: What Does It Mean to Model a Distribution?

Suppose you have a dataset of images — thousands of photographs of cats. You want to build a model that "understands" this distribution. By *understand*, we mean two things:

1. **Generate**: produce new, realistic-looking cat images that weren't in the training set.
2. **Evaluate**: given a new image, assign it a probability density.

This sounds simple, but it's genuinely hard. The space of 256×256 color images is astronomically large. The distribution of "real cat images" lives on some complicated low-dimensional manifold inside this space, and that manifold has no clean closed-form description.

Fitting a simple parametric distribution doesn't work. If you fit a multivariate Gaussian to images of the digits 0 and 1, the mean of that Gaussian is a blurry smear — the average of a zero and a one — which isn't a valid digit at all. Averages of real images are not real images. Real image distributions are deeply non-Gaussian and non-convex.

The deep learning approach to this problem is: **start with something simple and transform it into something complex**.

## The Shared Foundation: Transforming Simple Distributions

Here is the core recipe shared by nearly all deep generative models:

1. Sample simple noise: **z ~ N(0, I)**
2. Apply a learned transformation: **x = T_w(z)**
3. Call x the generated sample.

The transformation T_w is a neural network with learnable parameters w. The idea is that if T_w is expressive enough, it can warp the simple Gaussian into whatever complicated shape the data actually lives on.

Generating samples is easy — just draw z and compute T_w(z). But computing the *probability* of a given data point x is the hard part, and how different models handle it is what separates normalizing flows from diffusion models.

## Part I: Normalizing Flows

### The Naive (and Wrong) Approach

Here's a tempting idea. Suppose T_w is invertible, so we can write z = T_w^{-1}(x). We know how to evaluate p_Z(z) since Z is a standard Gaussian. So maybe:

> **Tempting (wrong) claim:** log p_X(x) = log p_Z(T_w^{-1}(x))

This seems reasonable — just "plug x back through the inverse." But it is wrong, and understanding *why* it's wrong is the entire key to normalizing flows.

### Why Densities Don't Transform Naively

The problem is that **probability densities quantify mass per unit volume**, and invertible transformations change volume. If a transformation compresses a region of space, the density in that region must increase to conserve total probability mass. If it expands a region, the density decreases.

A 1D example makes this concrete. Suppose Z ~ p_Z and X = f(Z) = 2Z — just stretching the real line by a factor of 2. The distribution of X is twice as spread out. To keep the total area under the density equal to 1, the density of X must be half as tall:

```
p_X(x) = p_Z(x/2) · (1/2)
```

The factor of 1/2 is the derivative of the inverse f^{-1}(x) = x/2. In general, for any 1D monotone transformation:

```
p_X(x) = p_Z(f^{-1}(x)) · |df^{-1}(x)/dx|
```

This is the **change of variables formula** in 1D. The derivative of the inverse tells you how much the transformation locally stretches or compresses the axis — you must account for this when transforming densities.

### The Jacobian: Generalizing to d Dimensions

In higher dimensions, the "local volume scaling factor" of a transformation f: R^d → R^d is captured by the **Jacobian matrix**:

```
         [ ∂x₁/∂z₁   ···   ∂x₁/∂z_d ]
J_f(z) = [    ⋮       ⋱       ⋮      ]
         [ ∂x_d/∂z₁  ···  ∂x_d/∂z_d ]
```

This is a d×d matrix of all partial derivatives. Its determinant, |det J_f(z)|, measures the factor by which f locally scales volume near the point z. It is the multidimensional generalization of "how much is the axis being stretched here?"

Two useful identities follow from the inverse function theorem:

```
J_{f^{-1}}(x) = (J_f(z))^{-1}    with z = f^{-1}(x)

|det J_{f^{-1}}(x)| = 1 / |det J_f(z)|
```

The d-dimensional **change of variables formula** is:

```
p_X(x) = p_Z(f^{-1}(x)) · |det J_{f^{-1}}(x)|
```

Or equivalently:

```
p_X(x) = p_Z(z) · |det J_f(z)|^{-1},    where z = f^{-1}(x)
```

Taking logarithms — which is what we use in practice:

```
log p_X(x) = log p_Z(f^{-1}(x)) + log |det J_{f^{-1}}(x)|
```

That second term — `log |det J_{f^{-1}}(x)|` — is the **Jacobian correction** the naive approach was missing. It is not optional. Without it, you are not computing a valid probability density.

### The Correct Training Objective

Given a dataset {x^(n)}, the maximum likelihood objective for a normalizing flow (an invertible neural network f_θ) is:

```
max_θ  Σ_n  [ log p_Z(f_θ^{-1}(x^(n))) + log |det J_{f_θ^{-1}}(x^(n))| ]
```

The first term pushes the encoder to map data to regions of high probability under the base Gaussian. The second term accounts for how much the transformation warps volume at each data point. Both terms are necessary.

### Stacking Flows

A single invertible transformation is rarely expressive enough. In practice we compose many layers:

```
z₀ = z,   z₁ = f₁(z₀),   z₂ = f₂(z₁),   …,   x = f_K(z_{K-1})
```

The log-likelihood decomposes via the chain rule:

```
log p_X(x) = log p_Z(z₀) + Σ_{i=1}^{K}  log |det J_{f_i^{-1}}(z_i)|
```

Each layer contributes its own Jacobian correction. You sum them all up. This is why these models are called "flows" — data flows through a sequence of invertible transformations, accumulating Jacobian terms along the way.

### The Computational Problem

Here's the fundamental obstacle. Computing the determinant of a general d×d matrix costs **O(d³)**. For a 256×256 color image, d ≈ 200,000. The Jacobian has ~4×10^10 entries — you can't even store it, let alone compute its determinant.

The key insight: **if the Jacobian is triangular, its determinant is just the product of the diagonal**:

```
det(triangular matrix) = Π_i  (diagonal entries)
```

This costs O(d). That structural trick is the entire computational foundation of normalizing flows.

### Real NVP: Affine Coupling Layers

Real NVP (Dinh et al., 2016) is the canonical example of how to achieve tractable Jacobians. The key building block is the **affine coupling layer**.

Split the input into two halves: x = [x_a, x_b]. Define the transformation:

```
y_a = x_a
y_b = x_b ⊙ exp(s(x_a)) + t(x_a)
```

Here s (scale) and t (translate) are arbitrary neural networks that take x_a as input, and ⊙ is elementwise multiplication.

The Jacobian of this transformation is:

```
J_f = [ I_a                   0               ]
      [ ∂y_b/∂x_a    diag(exp(s(x_a)))        ]
```

The upper-left block is the identity (y_a = x_a). The lower-right block is diagonal. The matrix is block-lower-triangular, so its determinant is just the product of the lower-right diagonal:

```
log |det J_f| = Σ_i  s_i(x_a)
```

O(d). And the inverse is trivial — you don't need to invert the neural networks s and t at all:

```
x_a = y_a
x_b = (y_b - t(y_a)) ⊙ exp(-s(y_a))
```

You evaluate s and t in the forward direction during inversion. This is one of the elegant properties of affine coupling layers: the inverse is as cheap as the forward pass.

The catch: x_a is never directly transformed when it appears in the conditioning role. To ensure every dimension gets transformed, you alternate the mask — in odd layers transform x_b conditioned on x_a, in even layers transform x_a conditioned on x_b. After a few layers, every dimension has been directly transformed.

Real NVP stacks these coupling layers with permutations between them to encourage global mixing. It is trained by maximizing the exact log-likelihood. No approximations, no bounds — exact computation.

### The Fundamental Tension

Normalizing flows are mathematically clean: exact likelihoods, exact inference, fast sampling. But the constraints are real. You cannot use arbitrary neural networks — invertibility and triangular Jacobians are required. This limits expressiveness relative to unconstrained architectures. That is the price of exactness.

## Interlude: The ELBO

Before diffusion models, we need one more piece of machinery: the **Evidence Lower BOund (ELBO)**. This is the Swiss Army knife of probabilistic machine learning.

### The Core Identity

Suppose we have a model p(x, z) over observed data x and latent variables z. We want to optimize log p(x), but the marginal ∫ p(x, z) dz is intractable.

Here is an identity that holds for *any* distribution q(z):

```
log p(x) = E_{q(z)}[ log p(x,z)/q(z) ]  +  E_{q(z)}[ log q(z)/p(z|x) ]
              ⎣_____________________⎦        ⎣________________________⎦
                       ELBO                       KL[q(z) ∥ p(z|x)]
```

Since KL divergence is always ≥ 0:

```
log p(x) ≥ ELBO
```

The ELBO is a lower bound on the log-likelihood. Maximizing it simultaneously tightens the bound (ELBO → log p(x)) and minimizes the KL divergence of q from the true posterior p(z|x) — without ever having to compute p(z|x) directly.

This decomposition underpins VAEs, variational EM, and diffusion models alike.

## Part II: Diffusion Models

### A Different Philosophy

Normalizing flows ask: *how do we transform a simple distribution into a complex one while tracking exact probability?* Diffusion models ask something different: *what if we just learned to undo noise, one small step at a time?*

This might sound less principled, but it turns out to be extraordinarily powerful. Diffusion models require no invertible architectures, no Jacobian computations, and train with ordinary regression. They also produce some of the most impressive generative outputs in the history of machine learning.

### The Forward Process: Destroying Structure

Let x₀ be a clean training image. Define a sequence of increasingly noisy versions x₁, x₂, ..., x_L by repeatedly applying:

```
q(x_i | x_{i-1}) = N(x_i | √(1-β²_i) · x_{i-1},  β²_i · I)
```

At each step, the image is slightly scaled down and Gaussian noise is added. β_i controls how aggressively signal is destroyed at step i.

The coefficient √(1-β²_i) is chosen deliberately: if Var(x_{i-1}) = I, then:

```
Var(x_i) = (1-β²_i) · I + β²_i · I = I
```

The variance stays constant across steps. Without this normalization, the distribution would either explode or vanish.

After L steps (typically L = 1000), virtually all signal from x₀ has been destroyed:

```
q(x_L | x₀) ≈ N(0, I)
```

The original image has become pure Gaussian noise. Nothing is learned here — the forward process is a fixed mathematical procedure.

### The Key Shortcut: Closed-Form Marginals

One of the most important properties of the forward process is that you can jump directly to any noise level, without simulating all intermediate steps.

Define α_i = √(1-β²_i) and ᾱ_i = ∏_{k=1}^{i} α_k. Then:

```
q(x_i | x₀) = N(x_i | ᾱ_i · x₀,  (1-ᾱ²_i) · I)
```

Equivalently:

```
x_i = ᾱ_i · x₀ + √(1-ᾱ²_i) · ε,    ε ~ N(0, I)
```

x_i is a linear combination of the original image and fresh noise. As i increases, ᾱ_i shrinks toward 0, and the image fades into noise. This closed-form shortcut is critical for training efficiency — without it, every gradient step would require simulating a full L-step trajectory.

### The Reverse Process: Learning to Denoise

The generative model P_φ runs the process in reverse:

```
P_φ(x_{i-1} | x_i) = N(x_{i-1} | μ_φ(x_i, i),  σ²(i) · I)
```

Here μ_φ is a neural network — in practice typically a large U-Net or Transformer — that takes the noisy image x_i and the time step i as inputs, and predicts the mean of a Gaussian for the denoised x_{i-1}.

This is the liberating feature of diffusion models. The neural network does **not** need to be invertible. It has no Jacobian constraint. It can be any architecture, unconstrained by any structural requirement. This is why diffusion models can leverage the most powerful neural networks that exist.

We also define P_φ(x_L) = N(0, I), since the forward process ends near a standard Gaussian.

### The Training Objective: An ELBO on the Trajectory

We want to maximize log P_φ(x₀). The exact marginal requires integrating over all possible trajectories, which is intractable. So we use the ELBO:

```
ELBO(x₀) = E_{q(x_{1:L}|x₀)}[ log P_φ(x_{0:L}) / q(x_{1:L}|x₀) ]
```

And by the ELBO decomposition:

```
log P_φ(x₀) = ELBO(x₀) + KL[q(x_{1:L}|x₀) ∥ P_φ(x_{1:L}|x₀)]
```

The KL gap can be made very small if μ_φ is powerful and β_i is small at each step. Empirically, in models like Stable Diffusion, this gap is tiny — which is why generated images are so good.

### Simplifying the ELBO: It Becomes Regression

Writing out the product structure of P_φ and q:

```
ELBO(x₀) = E_{q(x_L|x₀)}[ log P_φ(x_L) ]
           + Σ_{i=1}^{L}  E_{q(x_i, x_{i-1}|x₀)}[ log P_φ(x_{i-1}|x_i) / q(x_i|x_{i-1}) ]
```

The first term involves P_φ(x_L) = N(0, I), which has no learnable parameters — it is a constant. The q terms in the denominator also have no parameters. After dropping constants, the objective reduces to:

```
Σ_{i=1}^{L}  E_{q(x_i, x_{i-1}|x₀)}[ log P_φ(x_{i-1}|x_i) ]
```

Substituting in P_φ(x_{i-1}|x_i) = N(μ_φ(x_i, i), σ²(i)·I) and taking the log of the Gaussian:

```
ELBO(x₀)  =  C'  -  Σ_{i=1}^{L}  E_q[  1/(2σ²(i))  ·  ‖x_{i-1} - μ_φ(x_i, i)‖²  ]
```

This is **mean-squared error regression**. The model μ_φ is trained to predict x_{i-1} (the slightly less noisy image) from x_i (the slightly more noisy image). All the variational machinery, the entire forward process derivation — it collapses to: *train a neural network to denoise images*. That's the training objective.

### Training Algorithm

Because we can sample any x_i directly from x₀ using the closed-form marginal, and we can estimate the sum over i by sampling a single random time step, each training step is:

1. Sample a training image **x₀**
2. Sample a random time step **i ~ Uniform(1, ..., L)**
3. Sample noise **ε ~ N(0, I)**
4. Compute the noisy image: **x_i = ᾱ_i · x₀ + √(1-ᾱ²_i) · ε**
5. Predict x_{i-1} using **μ_φ(x_i, i)**
6. Compute MSE loss, backpropagate, update parameters

No trajectory simulation. No chain of L forward passes per update. Just: corrupt an image to a random noise level, predict the denoised version, compute a loss.

### Generation: Running the Reverse Chain

Once training is complete, generating a new sample is:

1. Sample **x_L ~ N(0, I)** (pure noise)
2. For i = L, L-1, ..., 1: sample **x_{i-1} ~ N(μ_φ(x_i, i), σ²(i)·I)**
3. Return **x₀**

Each step requires one neural network forward pass. With L = 1000, generating one image requires 1000 evaluations — significantly slower than a normalizing flow (which needs only one), but techniques like DDIM sampling can reduce this to ~50 steps with minimal quality loss.

---

## Part III: Putting the Two Together

These two frameworks look very different on the surface. They make opposite bets.

**Normalizing flows** insist on exactness. The price is architectural constraint: every transformation must be invertible with a tractable Jacobian. This limits how expressive the model can be.

**Diffusion models** relax exactness via a variational bound. The reward is complete architectural freedom: the denoiser can be any neural network. The price is approximate (not exact) likelihoods and slow generation.

| Property                   | Normalizing Flows                 | Diffusion Models             |
|----------------------------|-----------------------------------|------------------------------|
| Likelihood computation     | Exact                             | Lower bound (ELBO)           |
| Architecture constraints   | Invertible + triangular Jacobian  | Unconstrained                |
| Sampling speed             | Fast (single forward pass)        | Slow (L forward passes)      |
| Training objective         | Exact MLE                         | MSE regression               |
| Practical image quality    | Good                              | State of the art             |

### Why Diffusion Models Won in Practice

The honest answer is that the quality gap is enormous. Stable Diffusion, DALL-E 2, Sora — these are all diffusion models. The core reason is architectural freedom. Diffusion models can use U-Nets with attention, Transformers, and any other architecture that the community has spent years optimizing for image tasks. Normalizing flows must use architectures shaped by invertibility constraints, which makes it harder to benefit from those same advances.

### The ELBO Is Everywhere

One thing that becomes clear when studying these models together is that the ELBO appears everywhere. VAEs use it. Variational EM uses it. Diffusion models use it. Even normalizing flows can be seen as a special case of variational inference where the variational family is so expressive that the ELBO gap collapses to zero — making the bound exact.

The general principle is this: *when you cannot compute the marginal likelihood exactly, find a tractable lower bound and maximize that instead.* Different models are different choices of how to parameterize the variational distribution and how to define the generative model. The ELBO is what holds it all together.

---

## A Few Things Worth Sitting With

**The Jacobian correction is not optional.** It can feel like a correction factor you might get away with dropping early in training. It is not. Without it, you are optimizing the wrong objective — your model will learn to map data to regions of high prior probability under p_Z regardless of whether that mapping preserves probability mass. The Jacobian term is what enforces that your transformation defines a valid density.

**Diffusion models are learned denoisers.** It is easy to get lost in the ELBO derivation and forget what the training objective actually is. Strip everything away: you are training a neural network to remove Gaussian noise from images, at random noise levels. The reason this produces a generative model is that the denoising process, iterated from pure noise, traces out the reverse of a process that transforms data into Gaussian noise by design. The whole variational machinery is there to make this rigorous, but the training signal is beautifully simple.

**Expressiveness vs. tractability never goes away.** Every method in probabilistic machine learning navigates some version of this tradeoff. Normalizing flows sit at one extreme: exact computation, constrained architecture. Diffusion models sit at another: approximate computation via ELBO, unconstrained architecture. Understanding the tradeoff explicitly is what lets you reason about why one approach might be better for a given problem — and what the next generation of methods might look like.

## Summary: The Essential Math

**Normalizing Flows — Change of Variables:**

```
log p_X(x) = log p_Z(f^{-1}(x)) + log |det J_{f^{-1}}(x)|
```

For a composition of K transformations:

```
log p_X(x) = log p_Z(z₀) + Σ_{i=1}^{K}  log |det J_{f_i^{-1}}(z_i)|
```

Affine coupling layer (Real NVP), O(d) log-determinant:

```
y_a = x_a
y_b = x_b ⊙ exp(s(x_a)) + t(x_a)
log |det J| = Σ_i  s_i(x_a)
```

---

**Diffusion Models — Forward and Reverse:**

Forward process (step-by-step):

```
q(x_i | x_{i-1}) = N(x_i | √(1-β²_i) · x_{i-1},  β²_i · I)
```

Closed-form marginal (jump to any noise level directly):

```
x_i = ᾱ_i · x₀ + √(1-ᾱ²_i) · ε,    ε ~ N(0, I)
```

Reverse model:

```
P_φ(x_{i-1} | x_i) = N(x_{i-1} | μ_φ(x_i, i),  σ²(i) · I)
```

Training objective (simplified from the ELBO):

```
min_φ  Σ_{i=1}^{L}  E_q[  ‖x_{i-1} - μ_φ(x_i, i)‖²  ]
```

Which in practice means: train a neural network to predict the denoised image from the noisy one, at random noise levels.

## Final Thought

What I find most compelling about these two models is that they represent two completely different philosophical stances toward the same problem — and both stances are internally consistent and mathematically principled.

The normalizing flow says: *I will be exact. I will never approximate. I will pay whatever architectural cost I must to maintain perfect mathematical bookkeeping.*

The diffusion model says: *I will be pragmatic. I will accept a variational bound and slow sampling, if it means I can use any neural network I want. And if I can use any neural network I want, I can be as expressive as the best of modern deep learning.*

Empirically, the pragmatism has paid off. But the exactness of flows is genuinely valuable in settings — scientific modeling, likelihood-based anomaly detection, conditional density estimation — where approximate bounds don't cut it.

Both attitudes have their place. And both make much more sense once you've actually seen the mathematics.

*Sources: Lecture notes and slides from CMPSCI 689 (Machine Learning), UMass Amherst, Fall 2025. Dinh et al., "Density Estimation Using Real NVP" (2016). Ho et al., "Denoising Diffusion Probabilistic Models" (2020). Rezende & Mohamed, "Variational Inference with Normalizing Flows" (2015).*
