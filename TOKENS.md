# Token usage tracking — Sodales

This project is built with AI agents. This file logs the LLM token usage of those
development sessions, session by session — kept for transparency, and because the
numbers are part of the project's story. It is not required to run the application.

## Cumulative tally (2026-08-02)

| Metric | Value |
|---|---|
| Dev sessions | 1 |
| Scripted agent sessions (API) | 28 |
| Models | deepseek-v4-pro |
| Messages | 635 |
| API calls | 299 |
| Input tokens | 354 369 |
| Output tokens | 214 754 |
| Of which reasoning | 57 285 |
| Cache read (cache_read) | 17 685 120 |
| Cache write (cache_write) | 0 |
| **Total (input + output)** | **569 123** |
| Estimated cost | ≈ 0.405 USD |

> Repo created 2026-05-06: most of the initial development is not tracked (scripted
> agents / other machines). The tally covers the security audit + fixes of Aug 01
> and the scripted sessions.

## Method

- Figures come from the development assistant's session counters — real runtime
  numbers, not estimates.
- "Scripted agent sessions" = automated sessions driven by scripts (audits,
  releases, background tasks) attached to this project.
- `reasoning_tokens` is probably included in `output_tokens` (to be confirmed
  with the provider).

After each development session, the matching counters are appended to the table.
