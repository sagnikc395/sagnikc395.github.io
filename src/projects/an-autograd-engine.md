---
date: 2025-11-8
image:
subimage:
---

## motivation

for the longest time that i have been using Pytorch, i could make the model but could never understand the fundamental operations that PyTorch or any fundamental autograd engines worked - i.e how does the operator works under the hood to make the optimization and how does in a backward pass why we are calculating the gradients and how we are doign it from scratch.

## solution

i built a simple autograd engine from scratch that pokes holes under this and helps me understand how does an autograd engine works under the hood.

ref : [autograd-engine](https://github.com/sagnikc395/autograd)
