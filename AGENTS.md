# Project working agreement

The user requests that completed project updates be committed and pushed to GitHub automatically, without being asked each time.

- After completing code changes, run the relevant checks, commit the intended source changes, and push to the configured `origin` remote on the working branch unless the user explicitly says otherwise.
- Do not force-push or overwrite unrelated changes. If a push is blocked, report the concrete blocker.
- Keep local databases, database backups, uploads, virtual environments, generated caches and secrets out of new commits.
- In the final response, report whether the push succeeded and link the commit when available.
