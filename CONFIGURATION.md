# Configuration Guide

This document defines the recommended repository and runtime configuration for this project.

## 1. GitHub Repository Setup

### Visibility
- Use `Private` while development is ongoing.
- If you need enforced branch protection on private repos, use a GitHub plan that supports it.

### Collaborators
- Add collaborators from `Settings -> Collaborators and teams`.
- Recommended permission:
  - `Write` for developers
  - `Admin` only for maintainers

### Default Branches
- `main`: production-ready, stable
- `dev`: integration branch for ongoing work

## 2. Branching and Merge Policy

- Never develop directly on `main`.
- Use this flow:
  - `feature/*` -> PR to `dev`
  - `dev` -> PR to `main` after validation

### Local Commands
```powershell
# create feature branch from dev
& 'C:\Program Files\Git\cmd\git.exe' checkout dev
& 'C:\Program Files\Git\cmd\git.exe' pull
& 'C:\Program Files\Git\cmd\git.exe' checkout -b feature/<short-name>
```

## 3. Branch Protection (main)

Configure in `Settings -> Branches -> Add rule` for branch pattern `main`.

Enable:
- `Require a pull request before merging`
- `Require approvals` = `1`
- `Require status checks to pass before merging`
- `Require branches to be up to date before merging`
- `Require conversation resolution before merging`
- `Do not allow bypassing the above settings` (if available)

Leave disabled unless needed:
- `Require signed commits`
- `Require linear history`
- `Require deployments to succeed before merging`
- `Lock branch`

## 4. CI / Checks

- CI workflow exists at:
  - `.github/workflows/ci.yml`
- Ensure CI runs on PRs to `dev` and `main`.
- Once checks appear in GitHub UI, mark them as required under branch protection.

## 5. Secrets and Environment Variables

Do not commit real secrets.

Use:
- Root: `.env.production.example` -> copy to `.env.production`
- Backend: `backend/.env.production.example` -> copy to `backend/.env`

Set at minimum:
- `DATABASE_URL`
- `JWT_SECRET`
- `REFRESH_TOKEN_SECRET` (if used in your deployment)
- `REDIS_URL`
- `CORS_ORIGINS`
- SMTP settings if password reset email is required

For GitHub Actions deployments, store secrets in:
- `Settings -> Secrets and variables -> Actions`

## 6. City Master Reliability Rules

- Route source/destination must exist in city master.
- Manage cities from:
  - `/manager/cities`
- Route creation UI uses active city master data from:
  - `/api/cities`

## 7. Operational Rules for Team

- Open an issue before large feature work.
- Keep PRs focused and small.
- At least one reviewer approval before merge.
- Rebase/merge `dev` into feature branch if it gets stale.
- Tag releases from `main` only.

## 8. Quick Health Checklist

- `main` protected
- collaborator accepted invite
- CI passing
- no direct commits to `main`
- secrets configured for target environment
- migrations applied before app start
