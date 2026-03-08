---
description: Debug an issue
---
# Debug

## Description
Systematically diagnose and fix an issue using a structured debugging approach.

## Steps

1. **Understand the problem.** Ask me to describe the symptom, error message, or unexpected behavior. Do NOT start making changes yet.

2. **Reproduce and gather evidence.** Read the relevant files and logs. Run the failing code or test to confirm the current behavior. Summarize what you observe.

3. **Form hypotheses.** List 2-3 possible root causes ranked by likelihood. For each, explain what evidence supports or contradicts it.

4. **Isolate the root cause.** Add targeted logging, inspect state, or run minimal test cases to narrow down which hypothesis is correct. Do NOT apply a fix yet -- confirm the cause first.

5. **Propose the fix.** Describe the minimal change needed to fix the root cause. Explain why it works and what side effects to watch for. Wait for my approval before applying.

6. **Apply and verify.** Make the fix. Run the relevant tests or reproduce the original scenario to confirm the issue is resolved. Summarize what changed and why.