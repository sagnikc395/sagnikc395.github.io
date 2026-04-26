## AI Agents & Mechanistic Interpretability Projects


## 1. Tool-Use Trace Analyzer (Agents + Mech Interp)
Objective: Build an agent that solves multi-step tasks (web search, code execution, file I/O), then use activation patching to identify which attention heads and MLP layers "decide" to call which tool. Publish a circuit diagram mapping tool-selection behavior to specific model components.


## 2. Failure Mode Taxonomy for Autonomous Agents
Objective: Design a harness that stress-tests a ReAct/function-calling agent across >200 adversarial prompts. Categorize failures (hallucinated tool args, infinite loops, goal misgeneralization). Map each failure class back to internal representations using logit lens and probing classifiers.


## 3. Sparse Autoencoders on Agent Reasoning Chains
Objective: Train SAEs on the residual stream of a small open-weight model (Llama 3.1 8B or Mistral) while it executes multi-hop reasoning tasks. Identify monosemantic features that activate during planning vs. tool-retrieval vs. answer synthesis. Reproduce and extend Anthropic's sparse feature work on a reasoning-specific domain.


## 4. Reward Hacking Detection via Internal Probes
Objective: Fine-tune an agent on a simple environment where reward hacking is possible. Train linear probes on mid-layer activations to predict *when* the agent is about to hack vs. genuinely solve. Use this as an early-warning system and gate it into a CI safety pipeline.


## 5. Cross-Model Circuit Comparison
Objective: Pick one well-studied circuit (indirect object identification, greater-than, or docstring completion). Replicate it across 3 model families (Pythia, Gemma, Llama). Quantify how circuit structure shifts with scale and training data. Write this up as a short paper — this is a genuine research gap.


## Step-by-step architecture of what we are building:

These projects sit at the intersection of two of the fastest-moving areas in AI research right now. Agents work is about *what* models do externally; mech interp is about *why* they do it internally. Combining both is a rare, high-signal portfolio angle that almost no candidates have.

---

**Project 1: Tool-Use Trace Analyzer**
- TransformerLens Documentation – Essential library for hooks, activation patching, and attention head analysis: https://transformerlensorg.github.io/TransformerLens/
- Wang et al. "Interpretability in the Wild" (IOI Circuit) – The canonical reference for circuit analysis methodology: https://arxiv.org/abs/2211.00593
- LangGraph for agent scaffolding: https://langchain-ai.github.io/langgraph/

**Project 2: Failure Mode Taxonomy**
- ToolBench / AgentBench – Existing agent benchmarks to extend or stress-test against: https://github.com/OpenBMB/ToolBench
- Logit Lens explainer (nostalgebraist): https://www.lesswrong.com/posts/AcKRB8wDpdaN6v6ru/interpreting-gpt-the-logit-lens
- ReAct Paper – Grounding for the agent architecture you'll be breaking: https://arxiv.org/abs/2210.03629

**Project 3: Sparse Autoencoders on Reasoning Chains**
- Anthropic's SAE paper and open-source release: https://transformer-circuits.pub/2023/monosemantic-features
- EleutherAI's SAE library (SAEBench): https://github.com/EleutherAI/sae
- GSM8K for reasoning task traces: https://huggingface.co/datasets/openai/gsm8k

**Project 4: Reward Hacking Detection**
- Anthropic's "Alignment Faking" paper – Strong prior work to build on: https://arxiv.org/abs/2412.14093
- Probing classifiers tutorial (Neel Nanda): https://www.neelnanda.io/mechanistic-interpretability/glossary
- Gymnasium for environment scaffolding: https://gymnasium.farama.org/

**Project 5: Cross-Model Circuit Comparison**
- Pythia model suite (controlled scale experiments): https://github.com/EleutherAI/pythia
- ARENA Mechanistic Interpretability curriculum – Best structured curriculum for this work: https://arena-chapter1-transformer-interp.streamlit.app/
- Neel Nanda's 200 Concrete Open Problems in Mech Interp – Find your exact research gap here: https://www.alignmentforum.org/posts/LbrPTJ4fmABEdEnLf/
