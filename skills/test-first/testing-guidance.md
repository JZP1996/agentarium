# Choosing Tests and Test Doubles

- Test observable behavior at the agreed interface. A unit or integration test may be appropriate; choose based on the behavior and repository practice, not a universal preference.
- Use a known example or requirement for the expected result. Recomputing the same algorithm in the test can hide the same bug twice.
- Prefer real, deterministic collaborators when inexpensive and isolated. Use fixtures, fakes, or mocks for external services, time, randomness, expensive resources, or failure scenarios when justified.
- Do not call production services or mutate shared databases to get realistic coverage. Explain what a stand-in cannot validate and whether a separate integration check is needed.
- Avoid assertions about incidental internal calls. Call count, ordering, storage, or side effects can be valid assertions when they are part of the confirmed contract; do not prohibit them categorically.
- Preserve existing tests unless a separately approved change demonstrates why an assertion is obsolete. Passing higher-level tests alone is not permission to delete lower-level coverage.
- Test the language's actual semantics where relevant: lazy evaluation, asynchronous ordering, resource cleanup, error propagation, or mutable state. Do not import another language's test framework or style.
