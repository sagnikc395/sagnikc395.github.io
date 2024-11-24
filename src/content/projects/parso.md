---
title: 'parso: A Parser Combinator from in Typescript'
description: Parso is an attempt to write an Parser Combinator from Scratch in Typescript
publishDate: 'Sept 25 2024'
seo:
  image:
    src: '/project-parso/parso.webp'
    alt: parso
---

<img src="/public/project-parso/parso.webp" height="500px" width="150px" alt="parso">

You can view the source code of this project here: [Github](https://github.com/sagnikc395/parso)

### Introduction

In the world of programming, parsing is a fundamental task that we often take for granted. Whether it's processing JSON, parsing command-line arguments, or interpreting domain-specific languages, parsers are everywhere. Today, we're going to dive into the fascinating world of parser combinators by building one from scratch in TypeScript. Enter Parso: our attempt to create a powerful yet intuitive parser combinator library.

## What is a Parser Combinator?

Before we dive into the implementation, let's clarify what a parser combinator is. At its core, a parser combinator is a higher-order function that accepts multiple parsers as input and returns a new parser as its output. This approach allows us to build complex parsers by combining smaller, simpler ones.
The beauty of parser combinators lies in their composability and declarative nature. They enable us to express the grammar of our language directly in code, making it easier to understand, maintain, and extend.
Getting Started with Parso
Parso is our TypeScript implementation of a parser combinator library. Let's start by defining the basic building blocks:

```ts
type Parser<T> = (input: string) => [T, string] | null;

function str(match: string): Parser<string> {
  return (input: string) => {
    if (input.startsWith(match)) {
      return [match, input.slice(match.length)];
    }
    return null;
  };
}
```

Here, we define a Parser<T> type, which is a function that takes a string input and returns either a tuple containing the parsed result and the remaining input, or null if parsing fails.

The str function is our first parser. It matches a specific string and returns it if successful.

## Combining Parsers

Now that we have our basic parser, let's create some combinators to combine them:

```ts
function seq<T extends any[]>(...parsers: { [K in keyof T]: Parser<T[K]> }): Parser<T> {
  return (input: string) => {
    const results: any[] = [];
    let remaining = input;
    for (const parser of parsers) {
      const result = parser(remaining);
      if (result === null) return null;
      results.push(result[0]);
      remaining = result[1];
    }
    return [results as T, remaining];
  };
}

function alt<T>(...parsers: Parser<T>[]): Parser<T> {
  return (input: string) => {
    for (const parser of parsers) {
      const result = parser(input);
      if (result !== null) return result;
    }
    return null;
  };
}
```

The seq combinator runs multiple parsers in sequence, while alt tries multiple parsers and returns the first successful result.

## Adding More Power

Let's add a few more combinators to make our parser more powerful:

```ts
function many<T>(parser: Parser<T>): Parser<T[]> {
  return (input: string) => {
    const results: T[] = [];
    let remaining = input;
    while (true) {
      const result = parser(remaining);
      if (result === null) break;
      results.push(result[0]);
      remaining = result[1];
    }
    return [results, remaining];
  };
}

function map<T, U>(parser: Parser<T>, fn: (value: T) => U): Parser<U> {
  return (input: string) => {
    const result = parser(input);
    if (result === null) return null;
    return [fn(result[0]), result[1]];
  };
}
```

The many combinator applies a parser zero or more times, collecting the results. The map combinator allows us to transform the result of a parser.

### Putting It All Together

Now that we have our basic combinators, let's use Parso to parse a simple arithmetic expression:

```ts
const digit = map(alt(...'0123456789'.split('').map(str)), (d) => parseInt(d, 10));

const number = map(seq(alt(str(''), str('-')), digit, many(digit)), ([sign, first, rest]) => parseInt(sign + first + rest.join(''), 10));

const expr = alt(
  number,
  map(
    seq(str('('), (input) => expr(input), str(')')),
    ([, value]) => value
  )
);

const result = expr('(42)');
console.log(result); // [42, '']
```

In this example, we've built a parser that can handle parenthesized expressions and negative numbers. The expr parser is defined recursively, allowing for nested expressions.

## Conclusion

Building a parser combinator library from scratch gives us a deep understanding of how parsing works and provides a flexible tool for tackling complex parsing tasks. Parso demonstrates the power and elegance of parser combinators in TypeScript.
While our implementation is basic, it can be extended with more combinators and optimizations. Some potential improvements include:

1. Adding error reporting and recovery
2. Implementing left-recursion handling
3. Improving performance with techniques like memoization
