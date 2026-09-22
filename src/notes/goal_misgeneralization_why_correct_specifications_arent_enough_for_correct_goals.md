---
title: "Goal Misgeneralization: Why Correct Specifications Aren't Enough for Correct Goals"
tags:
  - alignment
  - goal-misgeneralization
  - specification-gaming
date: 9/21/26
url: https://arxiv.org/pdf/2210.01790
authors: Rohin Shah, Vikrant Varma et all
---
**(1)

Specification Gaming: The post defines specification gaming as behavior that satisfies the literal objective without achieving the designer's intended outcome, for example the agent that flips the red Lego block instead of stacking it. It argues this comes from misspecified tasks (poor reward shaping, missed criteria, flawed human feedback in RLHF, simulator bugs), not from flaws in the RL algorithm. 

Goal Misgeneralization: The paper shows that an agent can pursue an unintended goal even when the specification is correct. This happens when several goals are consistent with the training data and the learned one diverges under distribution shift while the agent's capabilities still generalize.

(2)

  

Specification Gaming: Before this post, examples of reward hacking were spread across RL, evolutionary computation, and robotics papers under different names. The post groups them under one concept, adds a public list of examples, and separates two views. From a benchmarking view, gaming shows the optimizer is strong. From an alignment view, it is a failure. It also separates specification gaming from reward tampering, where the agent changes the physical carrier of the reward itself.

Goal Misgeneralization: Compared with Langosco et al. (ICML 2022), the definition does not require an RL framework and adds a capability condition: if the model cannot do the intended task at test time, the failure counts as a capability failure, not goal misgeneralization. New settings include agent-induced distribution shift (longer episodes, reset-free continual learning), LLM few-shot prompting without RL, and examples found "in the wild." It also places the two failures in the Ortega et al. framing: ideal vs. design objective mismatch is outer misalignment (specification gaming), and design vs. revealed objective mismatch is inner misalignment (goal misgeneralization).

  

(3)

  

Specification Gaming

- Strength: The same optimization power that produces Move 37 produces block flipping, and the specification decides which one you get. This reframes gaming as a design problem rather than an algorithm bug, and it points toward learned objectives such as RLHF while admitting those can also be gamed (the hovering-hand example).
    
- Weakness: There is no formal definition and no empirical method. The post admits there is no objective way to separate "creative solution" from "gaming," since that boundary depends on the designer's unstated intent. As a result the concept cannot be measured, and the proposed remedies stay at the level of open questions.
    

Goal Misgeneralization

- Strength: The paper separates goal misgeneralization from ordinary generalization failure by requiring that the model keep its capabilities at test time. When the observations are flipped vertically, the agent gets stuck and acts incoherently, which is a capability failure. When the expert is replaced with an anti-expert, the agent still navigates skillfully but follows the wrong partner and collects negative reward, which is goal misgeneralization. 
    
- Weakness: The core concepts are not rigorously defined. "Capability" means the model can be quickly tuned to do a task, and "goal" is whatever task the behavior appears to solve. The authors call both definitions provisional. Since many goals can explain the same behavior, the misgeneralized goal is identified after the fact rather than predicted in advance. 
    

  
  

(4)

  

Specification Gaming:With RLHF, the reward model is a learned proxy that is itself optimized against. Does that just move gaming from the reward function to the evaluator, as in the hovering-hand case, and does it get worse as the policy gets more capable?

Goal Misgeneralization: The proposed fix is more diverse training data, but the misaligned scheduler example depends on "fixed" features like "no pandemic." How could one ever enumerate these ahead of time?

  
  
  

(5)

  

Specification Gaming 

[https://proceedings.neurips.cc/paper_files/paper/2022/hash/3d719fee332caa23d5038b8a90e81796-Abstract-Conference.html](https://proceedings.neurips.cc/paper_files/paper/2022/hash/3d719fee332caa23d5038b8a90e81796-Abstract-Conference.html)

  

It gives a formal definition of reward hacking: a proxy is unhackable if increasing expected proxy return can never decrease expected true return. They show that over all stochastic policies, this only holds if one of the two rewards is constant. This supplies the formalism the blog post lacks.

  
  
  

Goal Misgeneralization

[https://arxiv.org/abs/2507.03068](https://arxiv.org/abs/2507.03068) 

The authors prove that goal misgeneralization can occur under approximate optimization of the maximum expected value objective, but not the minimax expected regret objective. In experiments, domain randomization shows goal misgeneralization in procedurally generated gridworlds, while regret-based unsupervised environment design methods are more robust.**