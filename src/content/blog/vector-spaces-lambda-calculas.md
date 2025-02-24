---
title: Vector Spaces serving as Simply Typed Lambda Calculi
excerpt: My notes on finite state vector spaces for simply typed lambda calculi
publishDate: 'Feb 24 2025'
tags:
  - pl
  - lambda-calculas
  - type-theory
  - finite-vector-spaces
---

### Background:

To equip myself more in the field of field of type theory and programming languages , I have decided to start reading research papers in the field of programming languages and type theory in particular.

This weekend, I read the paper [Finites Vector Spaces as Model of Simply Typed Lambda Calculi](https://www.cis.upenn.edu/~stevez/papers/VZ14.pdf), by authors: [Benoit Valiron](https://www.monoidal.net/), whose blog I would suggest you to check by he way, 
and [Steve Zdancewic](https://www.cis.upenn.edu/~stevez) and here is a writeup of what I could understand from the paper,especially from a beginner's perspetive in PL.



### Introduction :

Programming languages are the backbone of the digital world, enabling us to create software, applications, and countless other technological wonders. But have you ever wondered about the underlying mathematical structures that govern these languages? In a recent paper, researchers explored a fascinating connection between programming languages and vector spaces, opening up new avenues for understanding the fundamental nature of computation.

### What are Vector Spaces?

Before diving into the research, let's brush up on what vector spaces are. Imagine a grid where you can move in any direction – horizontally, vertically, or any combination thereof. Vector spaces are similar, but more abstract. They are collections of entities called "vectors" that can be added together and multiplied by numbers, following certain axioms. In computer science, vector spaces can be used to represent data, computations, and even the structure of programming languages.

### The Research: Modeling PCF-like Languages with Vector Spaces

The researchers focused on a simple, yet powerful, programming language called PCF (short for "Programming Computable Functions"). PCF is a classic language often used in theoretical computer science to study the foundations of programming. The goal of the paper was to investigate whether vector spaces could serve as a meaningful "model" for PCF-like languages.

In this context, a model is a mathematical structure that mirrors the behavior of a programming language. Traditionally, sets and functions are used to model programming languages. However, this paper explored the use of finite vector spaces, which have a limited number of dimensions and values.

### Key Findings

The researchers' exploration yielded several interesting findings:

- Finite Sets as a Baseline:
  The paper first established that finite sets (collections of distinct objects) provide a fully complete model for PCF. This means that every aspect of the language's behavior can be perfectly captured using sets.
- Finite Vector Spaces:
  A More Nuanced Picture: When it came to finite vector spaces, the situation was more intricate. The researchers discovered that finite vector spaces, on their own, didn't perfectly model PCF. However, they could achieve a fully complete model by introducing an algebraic extension of PCF. This extension involved incorporating mathematical operations directly into the programming language.
- The Significance of Full Completeness:
  A model is considered fully complete when it can represent all possible behaviors of a programming language. This property ensures that the model is faithful to the language and doesn't miss any essential aspects.

### Real World Implications:

At first glance, this research might seem purely theoretical. However, it has several important implications:

- New Perspectives on Computation:
  Using vector spaces to model programming languages provides a fresh perspective on how we think about computation. It highlights the inherent mathematical structures that underlie our code.
- Potential Applications in Emerging Fields:
  The connection between programming languages and vector spaces could have practical applications in areas like quantum computing and machine learning, where linear algebra plays a crucial role.
- A Deeper Understanding of Programming Language Semantics:
  By exploring different mathematical models, we gain a deeper understanding of the semantics of programming languages – the meaning behind the code.

### Conclusion

The paper demonstrates a deep and fascinating connection between programming languages and vector spaces. While the concepts might seem abstract, they have the potential to reshape our understanding of computation and pave the way for new advancements in computer science.
