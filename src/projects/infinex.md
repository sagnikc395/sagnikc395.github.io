---
title: Infinex
date: 2026-06-29
lead: a from-scratch Go inference engine project focused on GGUF model loading, low-level tensor primitives, autoregressive generation, and eventually an OpenAI-compatible server.
topics: [go, inference-engine, llm-inference, gguf, systems]
image:
subimages:
---

## motivation

i wanted to understand LLM inference below the Python framework layer. most of the time we interact with models through libraries that hide the real machinery: tensor layouts, weight loading, attention score computation, KV cache management, sampling, batching, and server-side request scheduling.

Infinex is my attempt to build that machinery from scratch in Go.

the goal is intentionally ambitious: a minimal but real inference engine that can load open-weight models, run autoregressive generation, expose a simple CLI, and eventually serve an OpenAI-compatible HTTP API. the point is not to beat vLLM or llama.cpp. the point is to understand what those systems are doing by rebuilding a smaller version piece by piece.

the repo is still early-stage. right now it has the CLI shell, the project structure, and a tested tensor package with the operations needed for a GPT-style forward pass. the model loader, tokenizer, sampler, KV cache, and server pieces are laid out as the next layers.

## the shape of the project

the intended stack looks like this:

1. load model weights from GGUF files
2. wrap weights in Go tensor structures without unnecessary copies
3. tokenize a prompt
4. run transformer blocks over the prompt
5. maintain a KV cache for autoregressive decoding
6. sample the next token with greedy, temperature, or top-p sampling
7. expose the loop through a CLI, TUI, and later an HTTP server

the repository is organized around those boundaries:

```text
cmd/                 cobra CLI entrypoint
internal/tensor/     low-level tensor operations
internal/model/      attention, MLP, transformer block, GPT-2 model skeleton
internal/tokenizer/  BPE tokenizer wrapper
internal/sampler/    greedy, temperature, top-p sampling plan
internal/gguf/       GGUF loading boundary
pkg/                 public generation API plan
```

the current `infinex` command is a Cobra root command. it describes the target runtime: load GGUF models, run autoregressive text generation, avoid a Python runtime, and keep the system understandable.

## tensor primitives

the most developed part of the repo is `internal/tensor`. it defines a simple tensor type:

```go
type Tensor struct {
    Data  []float32
    Shape []int
}
```

there are two construction paths. `New` allocates zeroed memory for a shape. `From` wraps existing `[]float32` data without copying, which matters for model weights. once weights are loaded from GGUF, the engine should not duplicate every matrix just to put it into a custom tensor type.

the tensor package currently implements the core operations needed for a GPT-style forward pass:

- regular matrix multiplication
- transposed-layout matrix multiplication for weight matrices stored as `[out_features, in_features]`
- in-place bias addition
- residual addition
- row-wise softmax with a max-subtraction stability fix
- GELU using the tanh approximation
- layer normalization

the comments in the code are focused on inference-specific details. for example, `MatmulTrans` is written for GPT-2-style projection weights and accesses both input rows and weight rows sequentially in the inner loop. that is the kind of systems detail i wanted this project to force me to think about.

## why Go

Go is not the obvious choice for ML research code, which is part of why it is interesting here.

the appeal is that Go makes the runtime pieces feel natural: CLIs, HTTP servers, request queues, goroutines, channels, profiling, and deployable binaries. if the goal is to build an inference server rather than just a notebook experiment, those things matter.

using Go also removes the temptation to call PyTorch for every hard part. if the engine needs matrix multiplication, sampling, tokenization, or memory layout decisions, the project has to make them explicit.

that does mean the early stages are slower. before there is a model generating text, there has to be a tensor layer that is correct enough to trust.

## GGUF as the model boundary

the README frames GGUF loading as the main model format goal. the intended workflow is that a user downloads a GGUF model from Hugging Face and points Infinex at it:

```bash
hf download openai-community/gpt2 --local-dir data/gpt2
```

then the engine should be able to load the weights and run inference directly.

the repo already includes `gguf-parser-go` as a dependency, and `internal/gguf` is the boundary where that loader should live. the important design constraint is that loading should preserve weight memory where possible. that is why the tensor package has `From(...)` as a zero-copy wrapper.

## planned runtime modes

the README sketches two user-facing modes.

the first is one-shot generation:

```text
infinex --model path/to/model.gguf --prompt "..." --max-tokens 128
```

that path is the simplest end-to-end test: load weights, tokenize the prompt, generate tokens, print text.

the second is an interactive loop. the dependencies already include Bubble Tea and Lip Gloss, so the plan is a terminal UI for repeatedly prompting the model until a token limit or exit condition is reached.

after that, the broader server goal is an OpenAI-compatible HTTP API. that is where the inference-engine work becomes more interesting: batching, request scheduling, PagedAttention-style KV cache management, and quantized weights all start to matter.

## tests

the repo has focused tests for the tensor layer. they check:

- matrix multiplication values and shape mismatch panics
- softmax normalization and stability on large values
- layer norm output mean
- GELU reference values
- bias addition over one or multiple rows

that is the right place for tests at this stage. before the project has model-level correctness, it needs confidence that the primitive operations behave predictably.

## what i learned

**inference engines start with memory layout.** before sampling or serving matters, the question is how weights and activations are represented. even the difference between `Matmul` and `MatmulTrans` matters because model weights are stored in a layout chosen by the format and the architecture.

**a model server is not just a forward pass.** the README roadmap includes PagedAttention, batching, quantization, and an OpenAI-compatible API because production inference is mostly about throughput and memory pressure. generating one token locally is only the first milestone.

**Go makes the systems boundary clear.** in Python, it is easy to blur model code, serving code, and orchestration code. in Go, the shape of the engine pushes toward explicit packages: CLI, tensor, model, tokenizer, sampler, public generate API.

**the honest first milestone is correctness.** the current code is not yet a complete inference engine. the useful work so far is laying down primitives and boundaries that can support one.

## setup

the project is a Go module.

```bash
git clone https://github.com/sagnikc395/infinex.git
cd infinex
go test ./...
go run . --help
```

the eventual GGUF workflow is:

```bash
hf download openai-community/gpt2 --local-dir data/gpt2
```

then pass the downloaded model files into the Infinex CLI once model loading and generation commands are implemented.

## what's next

- implement the GGUF loader boundary and map model weights into tensors
- build the GPT-2 model path: attention, MLP, block, and stacked model forward pass
- add tokenizer integration for prompt encoding and generated-token decoding
- implement the autoregressive generation loop with a KV cache
- add greedy, temperature, and top-p samplers
- expose one-shot generation through Cobra
- add an interactive TUI with Bubble Tea and Lip Gloss
- later, add request batching, PagedAttention-style cache management, quantization, and an OpenAI-compatible HTTP API

ref: [infinex](https://github.com/sagnikc395/infinex)
