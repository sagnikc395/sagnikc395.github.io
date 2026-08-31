---
title: Fine-Tuning Qwen2.5 with LoRA and Unsloth
date: 2026-07-30
lead: a small, end-to-end fine-tuning pipeline for a 4-bit Qwen2.5 chat model, built to understand what each part of LoRA training actually does.
topics: [llm, fine-tuning, qwen, lora, unsloth, huggingface]
image:
subimages:
references:
  - title: qwen2.5-finetuning
    url: https://github.com/sagnikc395/qwen2.5-finetuning
    author: Sagnik Chatterjee
  - title: "LoRA: Low-Rank Adaptation of Large Language Models"
    url: https://arxiv.org/abs/2106.09685
    author: Hu et al.
  - title: "QLoRA: Efficient Finetuning of Quantized LLMs"
    url: https://arxiv.org/abs/2305.14314
    author: Dettmers et al.
  - title: Qwen2.5-0.5B-Instruct model card
    url: https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct
    author: Qwen
  - title: Unsloth documentation
    url: https://docs.unsloth.ai/
    author: Unsloth
  - title: SFT Trainer documentation
    url: https://huggingface.co/docs/trl/sft_trainer
    author: Hugging Face TRL
  - title: bitsandbytes quantization documentation
    url: https://huggingface.co/docs/transformers/quantization/bitsandbytes
    author: Hugging Face Transformers
---

## Why I built this

Fine-tuning a language model can look deceptively simple in a notebook. Load a model, create a trainer, call `train()`, and wait for a loss value. That is enough to get something running, but it hides most of the decisions that make the process work.

I built this project to unpack that pipeline one piece at a time. The goal was not to train a large production model or claim a new result. I wanted a small experiment where I could inspect every stage, understand what LoRA changes, and follow the data all the way from a Python dictionary to a generated response.

The result is a 20-step supervised fine-tuning pipeline built around Qwen2.5-0.5B-Instruct, Unsloth, Hugging Face, TRL, and bitsandbytes. It is intentionally lightweight enough to run in Colab.

## Starting with a quantized model

The base model is `Qwen2.5-0.5B-Instruct`, loaded in 4-bit precision through Unsloth. Quantization reduces the memory needed to hold the model, which makes this kind of experiment practical on limited hardware.

I added a check that walks through the model and looks for bitsandbytes `Linear4bit` layers. This is a small detail, but it catches an easy mistake: asking for a quantized model and assuming the library actually loaded one. The pipeline also counts the model's parameters and makes sure the tokenizer has a padding token, falling back to the end-of-sequence token when necessary.

These checks made the setup feel less like magic. Before training anything, I could verify what had been loaded and whether the tokenizer was ready for batching.

## Adapting attention with LoRA

Updating every weight in a language model would be wasteful for such a small experiment. Instead, I attach LoRA adapters to the query, key, value, and output projections in the attention layers: `q_proj`, `k_proj`, `v_proj`, and `o_proj`.

LoRA keeps the quantized base model frozen and learns a much smaller set of low-rank matrices. In this project, the adapters use rank 8 and an alpha of 16. I count the trainable parameters after attaching them and compare that number with the total parameter count. Seeing that fraction makes the main benefit of LoRA concrete: only a small portion of the model needs to be updated.

## Preparing the training data

To keep the mechanics visible, the project uses a tiny hand-written instruction dataset. Each example has an instruction and a response, which I convert into a consistent text format:

```text
### Instruction:
What is the capital of China?

### Response:
Beijing
```

The formatted strings are placed in a Hugging Face `Dataset`. I also tokenize an example and count its tokens before training. That step is useful because sequence length is not an abstract configuration value. It determines how much of each example the model can actually see.

This dataset is deliberately too small to produce a broadly useful model. Its purpose is to make the path through the training stack easy to inspect and debug.

## Running supervised fine-tuning

Training is handled by TRL's `SFTTrainer`. The configuration uses a batch size of one, a learning rate of `2e-4`, an 8-bit AdamW optimizer, and five optimization steps. It selects BF16 when the available GPU supports it and otherwise uses FP16.

I also disable checkpoint saving and multiprocessing for this short run. Those choices avoid unnecessary serialization and worker-process issues in a notebook environment. They would need to be reconsidered for a longer training job, but they make sense for a focused exercise that is meant to finish quickly.

The trainer returns the final loss as a regular Python float. More importantly, the code keeps model loading, adapter setup, dataset construction, trainer creation, and training in separate functions. That separation makes it easier to replace one part without rewriting the rest of the pipeline.

## Generating with the tuned model

After training, the model is switched into Unsloth's inference mode. A user instruction is formatted with Qwen's chat template, tokenized, and passed to greedy generation.

One implementation detail I wanted to get right was decoding only the new tokens. The raw output contains both the original prompt and the continuation, so the code records the prompt length and slices it away before decoding. The returned string is the assistant's reply, not a copy of the entire conversation.

The scaffold finishes with a few basic checks. It confirms that the model has parameters, that LoRA introduced a nonzero but small trainable subset, that the loss is valid, and that generation produced a nonempty string.

## What I learned

The useful part of this project was not the five training steps. It was turning a familiar recipe into components I could reason about.

Quantization and LoRA solve different problems. Quantization makes the frozen backbone cheaper to store and run, while LoRA limits how many parameters training needs to update. The tokenizer and prompt template matter just as much as the trainer because the model only learns from the exact token sequence it receives. Inference also needs its own preparation, even when it happens immediately after training.

Most of all, I came away with a better mental model of parameter-efficient fine-tuning. It is not one library call. It is a chain of small choices, and each choice can be checked.

## Limitations and next steps

This is a learning-oriented pipeline with three examples and a five-step training run. It has no evaluation set, multiple seeds, checkpoint comparison, or a meaningful measurement of generalization. The generated response only proves that the full path works.

A natural next version would use a real instruction dataset, separate training and validation splits, and compare the tuned model against the untouched base model. I would also track validation loss and task-level accuracy, then test different LoRA ranks and target modules. That would turn the implementation exercise into an actual fine-tuning experiment.

ref: [qwen2.5-finetuning](https://github.com/sagnikc395/qwen2.5-finetuning)
