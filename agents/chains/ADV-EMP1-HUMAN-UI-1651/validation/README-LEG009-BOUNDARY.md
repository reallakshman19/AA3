# LEG-009 external validation boundary

This note exists only to make the stop condition explicit for the split-console recovery branch.

The material head is `c7b39f1317c4f84b7ddb6884d503c707a9e6c50a`. Repository commits after that SHA are control-plane/durable-state only.

Executable validation remains external to the connected GitHub-only environment. Use `MANUAL-EP-0014.md` for localhost observation. Focused Playwright remains separately `BLOCKED_ENVIRONMENT / NOT_RUN` until a compatible browser executes it.

Do not infer merge authority from this note, the Draft PR, mergeability, or absence of checks. Merge remains Owner-only and unauthorized until an explicit Owner merge command names/clearly targets the current PR.