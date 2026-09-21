---
title: Behavioural Cloning from Observation
tags:
  - behaviour-cloning
  - supervised-learning
date: 9/8/26
authors: Faraz Torabi, Garrett Warnell et al
url: https://arxiv.org/abs/1805.01954
---


## main contributions of the paper

BCO imitates from state-only demonstrations by fitting an inverse dynamics model on transitions that the agent generates from a random policy and uses that model to label the demonstrated state and clone the recovered pairs. The paper also talks about environment interactions into what happens before the demonstrations arrives and after , showing that that almost all of it can be moved to the earlier phase.

  

## how the paper differs from prior work.

BC, GAIL, FEM all need the demonstrator's actions. Liu et al. (2017) works without actions too, but its reward is defined against the demonstration and cannot exist until the demonstration does, so its reinforcement learning cost falls entirely afterward.

BCO however pays the equivalent cost up front. Nair et al. (2017) had already used an inverse model to recover missing actions, BCO adds the restriction to agent-specific state features, while the policy keeps the full state. That restriction leaves the model independent of the task, so it can be fit before the task is known.

  

## strength and one weakness of the proposed method, core argument, or experiments

Strength : Split between agent specific and task specific state. 

Eg. In Reacher, the arm's joint angles and velocities are agent-specific, and the target's position, resampled every episode, is task-specific. To work out which torque produced a given transition you only need to know how the arm moved; where the target happened to sit tells you nothing about it. So the inverse model is fit on arm motion alone and stays valid for any reaching task with that arm, because the arm's dynamics do not change when the goal moves. The policy is the opposite case, since it cannot reach for something without knowing where it is. This is what licenses fitting the model before any demonstration exists: feed the target in and the model would start fitting correlations that hold only for the targets it saw, so it would need refitting whenever the task changed. Reacher bears this out, since BCO needs fewer demonstrations than GAIL in the one domain where the task variable actually changes.

  

Weakness: BCO(\alpha) refits the inverse model on data collected by the policy it is training.

By Bayes' rule, P(a | s, s') \propto P(s' | s, a) · P(a | s), where the second term is the action distribution of whatever policy gathered that data. In phase one that policy is random, so the prior is flat and the likelihood alone decides which action the model infers. Inside the improvement loop it is the imitation policy, whose action distribution is nowhere near flat. The refit model therefore carries that policy's preferences, and on any transition where the likelihood barely separates two actions the prior settles it in favor of whatever the policy already does. Those labels go into cloning, the policy skews further, and the next refit starts from a more skewed prior. 

  

## question to ask:

When the demonstrator and imitator have different bodies, BCO's inferred action is what the imitator would have done rather than what the demonstrator did, so what is the policy actually learning, and would that show up in the returns or just look like a slightly worse policy?

## follow up work

https://arxiv.org/abs/2602.02762/

They cite BCO for the explanation it offered of why learning an inverse model is cheap, an analogy to sample efficiency in model-based RL, and replace that analogy with something sharper.

