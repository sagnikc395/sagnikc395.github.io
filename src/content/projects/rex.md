---
title: 'rex: A RegEx machine in Go'
description: An  attempt to write an regex machine from scratch in Go.
publishDate: 'Aug 22 2024'
---

You can view the source code here : [Github](https://github.com/sagnikc395/rex)

Regular expressions (regex) are powerful tools for pattern matching and text manipulation. While most programmers use built-in regex libraries, understanding how to build a regex machine from scratch can provide valuable insights into both regex and finite state machines. In this blog post, we'll walk through the process of creating a simple regex machine in Go, but first, let's dive into some important theoretical concepts.

### Theoretical Background: NFAs and DFAs

Before we start implementing our regex machine, it's crucial to understand two fundamental concepts in automata theory: Deterministic Finite Automata (DFAs) and Nondeterministic Finite Automata (NFAs).
Deterministic Finite Automata (DFA)
A DFA is a finite state machine where:

> Each state has exactly one transition for each possible input symbol.
> There are no "epsilon" transitions (transitions without consuming an input symbol).
> For any given input string, there is exactly one path through the automaton.

DFAs are straightforward to implement and efficient to execute, as there's always only one possible state transition for each input symbol.
Nondeterministic Finite Automata (NFA)
An NFA is a more flexible finite state machine where:

> A state can have zero, one, or multiple transitions for each input symbol.
> Epsilon transitions are allowed (transitions without consuming an input symbol).
> For any given input string, there can be multiple possible paths through the automaton.

NFAs are often easier to construct for complex patterns, especially those involving alternation (|) or repetition (\*).

### Relationship between NFAs and DFAs

Every NFA can be converted to an equivalent DFA. This is a fundamental theorem in automata theory. The process of converting an NFA to a DFA is called "subset construction" or "powerset construction". Here's how they relate:

**Expressiveness**: NFAs and DFAs are equally expressive. They can recognize exactly the same set of regular languages.
**State Space**: A DFA equivalent to an NFA may have up to 2^n states, where n is the number of states in the NFA. This is because each state in the DFA represents a set of possible states in the NFA.
**Construction**: NFAs are often easier to construct for complex patterns, while DFAs are more efficient for execution.
**Simulation**: When implementing a regex engine, it's often easier to simulate an NFA directly rather than converting it to a DFA first. This is the approach we'll take in our implementation.

## Regex Engines and NFAs

Most regex engines, including the one we're about to build, use NFA-based approaches because:

NFAs can be constructed directly from regex patterns in a straightforward manner.
NFAs naturally handle features like alternation and repetition.
While simulating an NFA can be less efficient than running a DFA, it avoids the potential exponential blowup in state space that can occur when converting an NFA to a DFA.

Our implementation will use a technique called "Thompson's construction" to build an NFA from a regex pattern, and then simulate this NFA to perform matching.

## Understanding Regex Machines

At its core, a regex machine is a finite state machine that processes input strings to determine if they match a given pattern. Our implementation will focus on a subset of regex features to keep things manageable:

Character literals:
The wildcard character (.)
Repetition (\*)
Alternation (|)

### Step 1: Defining the Basic Structures

Let's start by defining the basic structures we'll need:

```go
type State struct {
    isEnd bool
    transitions map[rune]*State
    epsilonTransitions []*State
}

type RegexMachine struct {
    start *State
}
```

The State struct represents a state in our finite state machine. It has a boolean to indicate if it's an accepting state, a map for character transitions, and a slice for epsilon transitions (used for repetition and alternation).
The RegexMachine struct is a wrapper that holds the start state of our machine.

### Step 2: Building the Machine

Now, let's implement a function to build our regex machine from a pattern string:

```go
func BuildRegexMachine(pattern string) *RegexMachine {
    start := &State{transitions: make(map[rune]*State)}
    current := start

    for i := 0; i < len(pattern); i++ {
        switch pattern[i] {
        case '.':
            next := &State{transitions: make(map[rune]*State)}
            for r := rune(0); r < 128; r++ {
                current.transitions[r] = next
            }
            current = next
        case '*':
            if i > 0 {
                prev := current
                current = &State{transitions: make(map[rune]*State)}
                prev.epsilonTransitions = append(prev.epsilonTransitions, current)
                prev.epsilonTransitions = append(prev.epsilonTransitions, prev)
            }
        case '|':
            // Implementation for alternation
        default:
            next := &State{transitions: make(map[rune]*State)}
            current.transitions[rune(pattern[i])] = next
            current = next
        }
    }

    current.isEnd = true
    return &RegexMachine{start: start}
}
```

This function processes the pattern string character by character, building the state machine as it goes. It handles literals, wildcards, and repetition. (We'll add alternation later.)

### Step 3: Matching Strings

Now that we can build our machine, let's implement the matching function:

```go
func (rm *RegexMachine) Match(input string) bool {
    currentStates := []*State{rm.start}

    for _, ch := range input {
        var nextStates []*State
        for _, state := range currentStates {
            if next, ok := state.transitions[ch]; ok {
                nextStates = append(nextStates, next)
            }
            if next, ok := state.transitions[0]; ok {
                nextStates = append(nextStates, next)
            }
            nextStates = append(nextStates, state.epsilonTransitions...)
        }
        currentStates = nextStates
    }

    for _, state := range currentStates {
        if state.isEnd {
            return true
        }
    }
    return false
}
```

This function simulates the NFA by maintaining a set of current states. It processes the input string character by character, moving to the next possible states based on the transitions.

### Step 4: Adding Alternation

To support alternation (|), we need to modify our BuildRegexMachine function:

```go
func BuildRegexMachine(pattern string) *RegexMachine {
    // ... (previous code)

    case '|':
        alternateStart := &State{transitions: make(map[rune]*State)}
        alternateEnd := &State{transitions: make(map[rune]*State)}
        start.epsilonTransitions = append(start.epsilonTransitions, alternateStart)
        current.epsilonTransitions = append(current.epsilonTransitions, alternateEnd)
        current = alternateStart

    // ... (rest of the function)
}
```

This modification creates a new branch in the state machine for the alternate pattern.

### Step 5: Testing Our Regex Machine

Let's write a simple test to verify our regex machine:

```go
func main() {
    patterns := []string{"a*b", "a.c", "a|b"}
    inputs := []string{"aaab", "abc", "b"}

    for i, pattern := range patterns {
        rm := BuildRegexMachine(pattern)
        result := rm.Match(inputs[i])
        fmt.Printf("Pattern: %s, Input: %s, Match: %v\n", pattern, inputs[i], result)
    }
}
```

This test creates regex machines for different patterns and checks if they correctly match the corresponding inputs.

## Conclusion

Building a regex machine from scratch in Go provides deep insights into both regex processing and finite state machines. Our implementation, based on NFAs, demonstrates the power and flexibility of this approach. While our implementation is basic and doesn't cover all regex features, it forms a solid foundation for understanding how regex engines work.
Some potential improvements and extensions to this project could include:

Support for more regex features (e.g., character classes, anchors)
Optimization of the matching algorithm

1. Implementation of capturing groups
2. Error handling for invalid regex patterns
3. Exploration of converting our NFA to a DFA for potentially faster matching
