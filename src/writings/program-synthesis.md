---
date: 2025-05-24
image:
subimage:
---

tbh i really feel that program synthesis and the making small domain specific changes driven by RL is the way to go.
for example:

- consider rust, the error messages in Rust it suggests the error based on type information by the compiler and static analysis on your project.Now image after the changes that are suggested, a human can directly change the source code, why not let an agent take over and make the changes.
- so that goes into the loop of generating code via error messages and then the static anlyzer would again find new errors to find.
- kinda like a better cursor ?
