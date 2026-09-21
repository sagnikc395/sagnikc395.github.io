---
title: Key Concepts in RL
date: 9/20/26
tags:
  - rl
  - value-function
  - policy
url: https://spinningup.openai.com/en/latest/spinningup/rl_intro.html
authors: OpenAI
---
## main contributions of the paper:

RL formalizes learning by trial and error. An agent sees a state or partial observation, acts according to a policy, and collects rewards along a trajectory, and the goal is a policy that maximizes expected return $J(\pi)$. Value functions ($V$, $Q$), which satisfy Bellman equations, and the advantage $A = Q - V$ are the main tools for this search. Algorithms are split into model-based methods, which plan with a model of transitions and rewards, and model-free methods, which learn a policy or Q-function directly from experience.

PPO is a model-free policy optimization method for a stochastic policy $\pi_\theta$. It maximizes the clipped surrogate

$$\min\left(r_t A_t,\ \text{clip}(r_t,\ 1-\epsilon,\ 1+\epsilon),A_t\right)$$

which lets it reuse each batch for several epochs of SGD while removing any incentive to move far from the old policy.
## how the paper differs from prior work:

PPO differs from the previous work as:

- Vanilla policy gradient / A2C: These use each batch of data for only one update. PPO limits how far the policy can move per update, so it can safely reuse each batch several times.
    
- TRPO: TRPO keeps updates small using complex second-order optimization. PPO gets a similar effect with simple clipping and a standard optimizer like Adam.
    
- Flexibility: Unlike TRPO, PPO works with shared policy-value networks and trains the policy, value function, and entropy bonus together.
    
- Q-learning (DQN): DQN had not been shown to work on continuous control. PPO handles both discrete and continuous actions and matched or beat prior methods on Atari and MuJoCo.
    

## strength and one weakness of the proposed method, core argument, or experiments

- PPO strength: It is simple and general. It works with categorical policies for discrete actions and diagonal Gaussian policies for continuous actions, and it needs only action sampling and $\log \pi_\theta(a \mid s)$.
    
- PPO weakness: It pays the full on-policy sample cost, and clipping is not a strict trust region. Because parameters are shared across samples, ratios can still drift past the clip range.
    
## question to ask :
- If clipping does not bound the KL divergence, how much of PPO's stability comes from the clip versus the small number of epochs, the learning rate, and early stopping?
- And since PPO explores only through its own shrinking randomness, is the clip part of the problem?

## follow up work:
[https://proceedings.neurips.cc/paper_files/paper/2022/hash/b1efde53be364a73914f58805a001731-Abstract-Conference.html](https://proceedings.neurips.cc/paper_files/paper/2022/hash/b1efde53be364a73914f58805a001731-Abstract-Conference.html); 

PPO used as RLHF for LLMs(InstructGPT) by reward modelling on human rankings of model outputs and train a reward model on them and then further fine-tune the supervised model with RL against that reward model.
