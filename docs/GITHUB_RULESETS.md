# Proposed GitHub Ruleset for `main`

This document records the recommended repository rules for the `main` branch of ComfyMealAIV2.

> **Important:** This file is documentation only. GitHub does not activate repository rulesets from files merged into a repository. An administrator must create and save the ruleset under **Settings → Rules → Rulesets**.

## Target

- **Ruleset name:** Protect main
- **Enforcement status:** Active
- **Target:** Branches
- **Branch target pattern:** `main`
- **Bypass list:** Keep empty where practical. If GitHub requires an exception, limit it to the repository owner and use it only for emergency recovery.

## Recommended rules

| GitHub rule | Recommendation | Reason / condition |
|---|---|---|
| Restrict creations | **Off** | Avoid preventing normal branch creation workflows. |
| Restrict updates | **Off** | Can block normal pushes and PR merges; use pull-request and status-check rules instead. |
| Restrict deletions | **On** | Helps prevent accidental deletion of `main`. |
| Require linear history | **On** | Avoids merge commits; use squash or rebase merging. |
| Require deployments to succeed | **Conditional** | Enable only after a GitHub deployment environment is configured and deployments reliably report success. |
| Require signed commits | **Conditional** | Enable only after every contributor and automation workflow can produce verified signatures. |
| Require a pull request before merging | **On** | Route changes through reviewed pull requests. Require at least one approval if the repository's collaboration setup supports it; dismiss stale approvals and require approval of the most recent reviewable push where available. |
| Require status checks to pass | **Conditional** | First identify stable CI checks that actually run on pull requests. Require those exact checks; do not invent check names or enable this before checks exist. |
| Block force pushes | **On** | Prevent rewriting published history on `main`. |
| Require code scanning results | **Conditional** | Enable after a supported code-scanning tool is configured and uploads results for pull requests and the target branch. |
| Require code quality results | **Conditional** | Enable only after a code-quality analysis tool is configured and consistently reports results on pull requests. |
| Restrict code coverage | **Conditional** | Set a realistic minimum only after coverage reports are uploaded reliably; require the relevant upload/status check if merges must wait for evaluation. |
| Automatically request Copilot code review | **Optional** | Convenience feature, not a branch security requirement. Enable only if the repository owner has Copilot code review access and wants automated reviews. |

## Pull request review settings

When configuring **Require a pull request before merging**, use these safeguards where available:

- Require at least **1 approval**.
- Dismiss stale pull request approvals when new commits are pushed.
- Require approval of the most recent reviewable push, if available.
- Require conversation resolution before merging.
- Do not allow the pull request author to approve their own changes.

## Status-check rollout

Before enabling required status checks:

1. Open a test pull request and inspect the checks that GitHub reports.
2. Identify the stable CI checks that must pass (for example, build, lint, and tests, but only if those workflows exist).
3. Add those exact check names to the ruleset.
4. Confirm the checks run for pull requests targeting `main`.

Do not require a check that is not configured; it can leave pull requests permanently blocked.

## Deployment and analysis rollout

Only turn on deployment, code scanning, code quality, and coverage rules after the corresponding GitHub environments or analysis integrations are configured and producing reliable results. These controls are not automatically provided by creating this document.

## Scope and safety

- Apply this ruleset to `main` only.
- Do not change repository visibility, secrets, integrations, deployment configuration, or application source code as part of this ruleset setup.
- Keep emergency bypass permissions minimal.
- Test the rules with a small pull request before relying on them for all changes.
