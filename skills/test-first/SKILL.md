---
name: test-first
description: Implement a feature or bug fix test-first when the user explicitly requests TDD, a failing regression test before a fix, or test-first development. Confirm behavior and test scope before writing tests; not for ordinary test additions or automatic refactoring.
license: MIT
---

# Test First

Confirm the behavior to test, demonstrate a meaningful failure, then implement only enough to make that test pass. Follow the repository's language, framework, and test conventions. No particular model, hosting service, tool, or other Skill is required.

## Confirm the Test Boundary

Inspect the relevant code and existing test setup read-only. Before writing tests or implementation, present a short proposal covering:

- The behavior to add or fix, the observable interface to exercise, and expected results.
- Important success, failure, and edge cases, plus what is out of scope.
- The existing test framework and command, fixtures or test doubles, and any external dependencies or side effects.

Wait for the user's confirmation. A previously confirmed proposal in the current task is sufficient; continue within that scope without asking the same question for every test. Reconfirm changes to the behavior, interface, or agreed scope. If feedback is needed, stop after the proposal rather than assuming silence is approval.

An ordinary request to fix a bug or add integration tests is not by itself a request for this workflow. If the user has not chosen test-first, offer it when useful rather than imposing it.

## One Behavior at a Time

1. **Establish a baseline.** Run the relevant existing checks when feasible. Record pre-existing failures separately; do not repair unrelated failures as part of this task.
2. **Write one failing test.** Exercise the agreed behavior through its observable interface. Derive expected results from the requirement or an independent example, not by reproducing the implementation. See [testing-guidance.md](testing-guidance.md) when choosing fixtures or test doubles.
3. **Verify the failure.** Run the focused test. Confirm that it fails for the missing behavior or reported bug, not because of syntax, missing packages, unavailable services, or broken setup. If it passes already, investigate the reproduction or requirement instead of breaking working code to manufacture a failure.
4. **Implement the minimum.** Make only the changes needed for that behavior. Preserve user edits and unrelated behavior; do not anticipate unconfirmed features or slip in structural cleanup.
5. **Verify success.** Rerun the focused test, then relevant neighboring checks. Do not weaken assertions, skip the regression, or alter expected behavior just to obtain a passing result.
6. **Continue within scope.** Repeat for the next agreed behavior. Do not write the entire suite against an imagined design before implementing the first slice.

For a bug fix, the red step should reproduce the reported failure. If a fix already exists in the working tree, do not delete or revert it to prove the test: explain the limitation and ask before using a separate isolated baseline. Never overwrite user changes to enforce test order.

If meaningful execution is blocked, report exactly why. Ask whether to resolve the prerequisite or switch to another validation approach; do not claim a red-green cycle based on reasoning alone. Do not install dependencies, call live services, or mutate shared data without the necessary authorization.

## Keep Refactoring Separate

Do not automatically refactor after green. If a worthwhile opportunity appears, describe the problem, expected benefit, proposed change, affected scope, validation, and the consequence of leaving it as-is. Offer keeping the current implementation as a valid choice and wait for a decision.

A read-only review can evaluate the proposal; it does not authorize edits. After explicit approval, use the repository's normal refactoring workflow: a small behavior-preserving simplification can be handled by code-simplifier when available, while interface or architectural changes need their own scope and plan. Neither skill is a prerequisite for test-first. Rerun relevant checks after approved changes.

## Report Evidence

Summarize the confirmed scope, tests added, observed failure reason, commands and results before and after the implementation, and any remaining gaps. Distinguish a locally passing test from broader integration confidence. Do not commit, push, or publish results unless separately requested.
