---
name: bump-version
description: Bump the extension version in manifest.json and commit. Run from a feature branch before merging the PR.
argument-hint: [patch|minor|major|x.y.z]
allowed-tools: Read, Edit, Bash
---

## Git status
!`git status --short && echo "branch: $(git branch --show-current)"`

## Current version
!`grep '"version"' manifest.json | head -1`

## Commits on this branch (vs main)
!`git log main..HEAD --oneline --no-merges 2>/dev/null`

---

You are bumping the version for a Chrome extension release.

**Argument:** `$ARGUMENTS` (patch | minor | major | explicit version like 1.2.3). Default to `patch` if empty.

## Step 1 — Validate environment

Check the git status output above for any staged or unstaged changes (excluding `manifest.json` itself, which will be modified by this skill):
- If there are **no other changes**, proceed silently.
- If there are **other uncommitted changes**, list them and ask the user:
  "There are uncommitted changes:
  <list the files>
  Include these in the version bump commit, or commit only the version bump?
  Reply **all** to include everything, or **version-only** to commit just manifest.json."

  Wait for the user's reply and remember the choice for Step 3.

No branch restriction — this runs on feature branches before a PR is merged.

## Step 2 — Determine new version and suggest commit message

Read the current version from manifest.json. Based on the argument:
- `patch` or empty → increment patch (1.1.1 → 1.1.2)
- `minor` → increment minor, reset patch (1.1.1 → 1.2.0)
- `major` → increment major, reset minor and patch (1.1.1 → 2.0.0)
- explicit version (e.g. `1.2.3`) → use it directly

Then look at the commits on this branch vs main (shown above) and infer a short description of what this release is for (e.g. "Side Panel migration", "CORS fix").

Tell the user the suggested commit message and ask them to confirm or modify:
```
Suggested commit message:
🔧 chore: bump version to Y.Y.Y for <inferred description> release

Confirm, or reply with the description you'd like to use instead.
```

Wait for the user's reply before continuing.

## Step 3 — Update manifest.json and commit

- Edit `manifest.json`: update the `version` field to the new version.
- Commit (do NOT push):
  - If the user chose **all** in Step 1:
    ```bash
    git add -A
    git commit -m "🔧 chore: bump version to Y.Y.Y for <confirmed description> release"
    ```
  - If the user chose **version-only** (or there were no other changes):
    ```bash
    git add manifest.json
    git commit -m "🔧 chore: bump version to Y.Y.Y for <confirmed description> release"
    ```

Tell the user the commit is done and they can push when ready.
