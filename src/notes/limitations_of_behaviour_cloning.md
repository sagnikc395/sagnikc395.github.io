---
title: A Reduction of Imitation Learning and Sturcture Prediction to No-Regret Online Learning
tags:
  - dagger
  - behaviour-cloning
date: 09/20/26
authors: Stephane Rose, Geoffery Gordon et all
url: https://proceedings.mlr.press/v15/ross11a/ross11a.pdf
---


## main contributions of the paper

The core idea that the paper addresses how to train a policy by imitating an expert so that it still performs well once it acts on its own and reaches situations the expert never demonstrated. 

The paper proposes DAgger, an iterative imitation learning algorithm that repeatedly runs the current policy, has the expert label the states that it visits, and retrains a single policy on the aggregated dataset, so the policy learns how to act in the states its own mistakes leads to.

By showing that DAgger is a no regret online learner, the paper reduces imitation learning to no-regret online learning and proves that any such learner yields a policy whose cost grows only linearly with the task horizon.

## how the paper differs from prior work.

Behavior cloning trains only on expert states, so its errors compound once the policy drifts, and the cost grows quadratically with the horizon. Earlier fixes such as forward training, SMILe, and SEARN avoid this, but they need either one policy per time step or a stochastic mixture of policies with many iterations and a tuned mixing rate.

DAgger instead aggregates data rather than mixing policies, producing a single deterministic, stationary policy in a number of iterations roughly linear in T, with no parameters to tune in its simplest form.

## strength and one weakness of the proposed method, core argument, or experiments

Strength:

DAgger is simple to implement and works with any supervised learner, since each iteration is just retraining on a larger dataset.

Eg: In Super Tux Kart, behavior cloning stays at about 3 falls per lap no matter how much expert data is added, because the expert never shows how to recover from mistakes. DAgger stops falling off the track completely after 15 iterations. 

Weakness:

DAgger needs an expert who can label any state the learner visits. This is easy with a planner as in the Mario game, but hard for human experts, who must label without controlling the system. This guarantee also assumes the expert can recover from the learner’s mistakes.

Eg: In Super Tux Kart, the human has to give steering labels while the learner is driving, so the labels may be noisy, and the paper does not measure this. Running poor early policies can also be unsafe on a real robot


## question to ask:

DAgger asks the expert to label every state the learner visits, even states where the learner already acts correctly. Could we ask the expert only in states where the learner is uncertain? How many labels would that save, and would the guarantee still hold?

## follow up work

HG-Dagger ; [https://arxiv.org/abs/1810.02890](https://arxiv.org/abs/1810.02890)

In DAgger the human must give labels while the learner is in control, which is unsafe and leads to poor labels. In HG-DAgger , the learner drives by default and the human takes over only when the learner starts making mistakes, and these corrections are then used as training data. 

HG-DAgger also learns a model-uncertainty-based safety threshold that predicts where the trained policy is likely to perform well.

