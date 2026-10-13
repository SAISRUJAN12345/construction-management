#!/usr/bin/env bash
set -euo pipefail

REPO_NAME="${1:-construction-management}"

# Do not ever run `git add` from a parent directory such as $HOME.
# The script must be started at the actual project root.
PROJECT_DIR="$(pwd -P)"
if [[ ! -f "pom.xml" || ! -f "mvnw" || ! -d "src" || ! -f ".gitignore" ]]; then
  echo "ERROR: Run this script from the construction-management project root." >&2
  echo "Current directory: ${PROJECT_DIR}" >&2
  echo "Expected pom.xml, mvnw, src/, and .gitignore in this directory." >&2
  exit 1
fi

if ! command -v git >/dev/null 2>&1; then
  echo "Git is required. Install Xcode Command Line Tools with: xcode-select --install" >&2
  exit 1
fi
if ! command -v gh >/dev/null 2>&1; then
  echo "GitHub CLI is required. On macOS with Homebrew, install it with: brew install gh" >&2
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "Sign in to GitHub in the browser that opens next."
  gh auth login
fi

OWNER="$(gh api user --jq .login)"
FULL_REPO="${OWNER}/${REPO_NAME}"

# If a Git repository was accidentally initialized in $HOME, do not use it.
# Create an isolated repository at this project root instead.
GIT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [[ "$GIT_ROOT" != "$PROJECT_DIR" ]]; then
  if [[ -e ".git" ]]; then
    echo "ERROR: A .git entry exists here, but Git reports a different repository root: ${GIT_ROOT}" >&2
    echo "Stopping to avoid publishing files from outside the project." >&2
    exit 1
  fi
  echo "Initializing a project-only Git repository at: ${PROJECT_DIR}"
  git init
fi

GIT_ROOT="$(cd "$(git rev-parse --show-toplevel)" && pwd -P)"
if [[ "$GIT_ROOT" != "$PROJECT_DIR" ]]; then
  echo "ERROR: Git root (${GIT_ROOT}) is not the project directory (${PROJECT_DIR}). Aborting." >&2
  exit 1
fi

# .gitignore prevents environment secrets, build output, logs, and IDE files being committed.
git add -A
echo "Files staged for publication:"
git status --short

if ! git rev-parse --verify HEAD >/dev/null 2>&1; then
  if ! git config user.name >/dev/null; then git config user.name "$OWNER"; fi
  if ! git config user.email >/dev/null; then git config user.email "${OWNER}@users.noreply.github.com"; fi
  git commit -m "Initial commit: construction management project"
elif ! git diff --cached --quiet; then
  if ! git config user.name >/dev/null; then git config user.name "$OWNER"; fi
  if ! git config user.email >/dev/null; then git config user.email "${OWNER}@users.noreply.github.com"; fi
  git commit -m "Update construction management project"
else
  echo "No new changes to commit."
fi

git branch -M main
EXPECTED_HTTPS="https://github.com/${FULL_REPO}.git"
EXPECTED_SSH="git@github.com:${FULL_REPO}.git"

if gh repo view "$FULL_REPO" >/dev/null 2>&1; then
  if git remote get-url origin >/dev/null 2>&1; then
    CURRENT_URL="$(git remote get-url origin)"
    if [[ "$CURRENT_URL" != "$EXPECTED_HTTPS" && "$CURRENT_URL" != "$EXPECTED_SSH" ]]; then
      echo "ERROR: The origin remote points to ${CURRENT_URL}, not ${EXPECTED_HTTPS}." >&2
      echo "Update the origin remote to the intended repository before pushing." >&2
      exit 1
    fi
  else
    git remote add origin "$EXPECTED_HTTPS"
  fi
  git push -u origin main
else
  if git remote get-url origin >/dev/null 2>&1; then
    CURRENT_URL="$(git remote get-url origin)"
    if [[ "$CURRENT_URL" != "$EXPECTED_HTTPS" && "$CURRENT_URL" != "$EXPECTED_SSH" ]]; then
      echo "ERROR: The origin remote points to ${CURRENT_URL}. Remove or correct it before creating ${FULL_REPO}." >&2
      exit 1
    fi
    gh repo create "$FULL_REPO" --private --push
  else
    gh repo create "$FULL_REPO" --private --source=. --remote=origin --push
  fi
fi

echo "Published: https://github.com/${FULL_REPO}"
echo "Next: open https://dashboard.render.com/blueprints and create a Blueprint from this repository."
