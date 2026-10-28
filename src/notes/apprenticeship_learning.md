(1)
The paper introduces apprenticeship learning via inverse reinforcement learning. It shows that if the expert optimizes an unknown reward linear in known features, R*(s) = w*·φ(s), then finding a policy whose discounted feature expectations match the expert's (µ_E) guarantees near-expert performance on that reward, even if w* itself is never recovered. It proposes two algorithms for this, a max-margin (QP/SVM) method and a simpler projection method. Both provably terminate in a polynomial number of iterations and need only O(k log k) expert trajectories.

(2)

Earlier apprenticeship/imitation methods (e.g., ALVINN, "learning to fly") are supervised state-to-action mappers i.e mimic the policy directly and generalize poorly outside the demonstrated states.
This paper changes the objective from reward identification to feature-expectation matching. It uses an L2-constrained max-margin QP rather than an LP, and it gives formal bounds on iteration count, sample complexity, and performance loss under the expert's true reward.


(3)
Strength: The guarantee does not depend on solving the ill-posed IRL problem. Many rewards explain the same behavior, so recovering w* is generally impossible. Since |wᵀµ(π̃) − wᵀµ_E| ≤ ||w||₂ ||µ(π̃) − µ_E||₂ ≤ ε, the bound holds simultaneously for every reward in the feature span.


Weakness: Each iteration calls a full RL solver, which the analysis assumes returns an optimal policy. This is expensive and unrealistic for large or continuous MDPs. The output is also a stochastic mixture of policies, or requires a human to select one by inspection, as in the driving experiments, rather than a single deterministic policy.


(4)

When the expert is suboptimal or noisy, µ̂_E may lie outside the feasible set M. How should "matching" be defined then?


(5)

https://cdn.aaai.org/AAAI/2008/AAAI08-227.pdf

This paper keeps Apprenticeship’s Learning linear-reward, feature-matching framing and resolves it with the maximum entropy principle, giving a well-defined, globally normalized distribution over decision sequences, while providing the same performance guarantees as existing methods. This helps probabilistic models handle noisy , suboptimal demos. 

