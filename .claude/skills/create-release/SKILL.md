---
name: create-release
description: Package the Chrome extension and create a GitHub release with Chinese release notes. Run from main after the PR is merged and pulled.
argument-hint: (no arguments)
allowed-tools: Read, Bash
---

## Current branch
!`git branch --show-current`

## Current version
!`grep '"version"' manifest.json | head -1`

## Last tag
!`git describe --tags --abbrev=0 2>/dev/null || echo "no tags yet"`

## Commits since last tag
!`git log $(git describe --tags --abbrev=0 2>/dev/null)..HEAD --oneline --no-merges 2>/dev/null`

---

You are creating a GitHub release for the Chrome extension.

## Step 1 — Validate environment

Check the branch output above:
- If on `main`, proceed in normal mode.
- If NOT on `main`, warn the user:
  "You're on branch `<branch>`, not main. Running in **dry-run mode** — packaging and release notes will be generated, but no GitHub release will be created. Continue? (yes/no)"
  Wait for the user's reply. If no, stop. If yes, set **dry-run = true** and proceed.

Keep track of the mode (normal or dry-run) for Step 4.

## Step 2 — Package the extension

Read the version from manifest.json (e.g. `1.1.2`) and run:

```bash
zip -r archive4fun-vY.Y.Y.zip manifest.json src/ \
  assets/icon16.png assets/icon32.png assets/icon48.png \
  assets/icon128.png assets/logo.png assets/reward_code.png
```

## Step 3 — Generate draft Chinese release notes

Using the commits since last tag (shown above), excluding any `🔧 chore: bump version` commits:

Categorize by emoji prefix:
- `✨ feat` → **新增功能**
- `🐛 fix` → **修复内容**
- `📸 docs` or `📝 docs` → **文档更新**
- `🧹 refactor` → **代码优化**

Choose the headline emoji based on the dominant change type (feat → ✨, fix → 🐛, etc.) and write a one-line Chinese summary as the heading.

Output format:
```
## ✨ 一句话概括本次主要改动

### 新增功能
- ...

### 修复内容
- ...
```

Only include sections that have entries. Omit empty sections.

Example from a previous release:
```
## ✨ 重写抓取引擎，支持实况照片下载

### 新增功能
- 改用微博 getImageWall API 抓取图片，不再依赖 DOM 结构，彻底解决微博改版后无法抓取的问题
- 支持实况照片（Live Photo）下载，自动配对同名 .jpg 和 .mov 文件

### 修复内容
- 修复部分用户通过 www.weibo.com 访问时的 CORS 错误
```

Show the draft release notes and ask:
- **If dry-run mode**: "Does this look good? Reply yes to continue the dry-run, or paste your edits."
- **If normal mode**: "Ready to publish? Reply yes to create the release, or paste your edits."

Wait for the user's reply before continuing.

- If the user replies with edits, incorporate them and re-show the updated notes, then ask again.
- If yes, proceed to Step 4.

## Step 4 — Check for existing GitHub release and publish

**If dry-run mode**, skip this step entirely. Instead, tell the user:
"Dry-run complete. The release would be created with the above notes using:
```
gh release create vY.Y.Y ./archive4fun-vY.Y.Y.zip --title \"vY.Y.Y\" --notes \"...\"
```
No GitHub release was created. Merge your PR to main, run `git pull`, then run `/create-release` again to publish."

Then proceed to Step 5 (clean up).

**If normal mode**, run:
```bash
gh release view vY.Y.Y 2>&1
```

If a release already exists (exit code 0), show its details to the user and ask:
**"A GitHub release for vY.Y.Y already exists (shown above). Overwrite it? (yes/no)"**

Wait for the user's reply. If no, delete the zip and stop:
```bash
rm archive4fun-vY.Y.Y.zip
```

If yes, delete the existing release first:
```bash
gh release delete vY.Y.Y --yes
```

Then create the release with the approved notes:
```bash
gh release create vY.Y.Y ./archive4fun-vY.Y.Y.zip \
  --title "vY.Y.Y" \
  --notes "<approved release notes>"
```

## Step 5 — Clean up

Ask the user: **"Delete the local zip file `archive4fun-vY.Y.Y.zip`? (yes/no)"**

If yes:
```bash
rm archive4fun-vY.Y.Y.zip
```

If no, tell the user the zip is kept at `./archive4fun-vY.Y.Y.zip`.

## Step 6 — Done

Tell the user:
- The GitHub release is live and the zip is attached.
- Next step: go to the Chrome Web Store Developer Dashboard, download the zip from the GitHub release, upload it, and submit for review.
