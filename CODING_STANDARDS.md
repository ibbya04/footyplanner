# Coding standards

Read during review. Each rule says what to look for in the diff and the PR description. Report every rule the diff breaks.

## Tests come first

Code changes are built test-first with the `mattpocock-skills:tdd` skill: seams agreed, then one vertical slice at a time, each a failing test seen red for the right reason followed by the minimal code to make it pass.

Check:

- **Every behaviour change has a test that fails without it.** For each changed route, query, ingestion step, helper or component, name the test that covers the new behaviour. A behaviour change with no such test is a finding.
- **The PR description shows the red runs.** Each slice lists its test and the failure it gave before the implementation existed. A slice with no recorded red run is a finding.
- **Bug fixes start from a reproducing test.** The diff includes a test that fails on the old code for the reported bug.
- **Refactors keep their tests.** A change described as a refactor leaves existing test expectations unchanged and green. Edited expectations mean it changed behaviour, so the rules above apply.
- **Skips name their exception.** Test-first can be skipped only for changes with no testable behaviour, and the PR says which exception applies:
    - docs, ADRs, the plan, `CLAUDE.md` and this file
    - config values (measure their effect instead)
    - generated files (migrations, `worker-configuration.d.ts`, the route type declarations); test the behaviour that changed instead
    - pure styling and layout (check with a screenshot)
    - things only Cloudflare shows (CPU time, Workers Cache, cron triggering, plan limits); check them on a preview or in production
    - throwaway spikes, which are deleted and redone test-first
