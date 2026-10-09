# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Current state

This monorepo is an empty scaffold (only the initial commit). It has no package manager, workspace config, build tooling, linter, or test runner yet, so there are no build/lint/test commands. Do not assume a toolchain (npm/pnpm/Turborepo/Nx, etc.). Confirm with the user before introducing one, then update this file with the real commands.

## Layout

Top-level directories (each currently holds only a `.gitkeep`):

- `apps/`: deployable applications
- `packages/`: shared packages consumed by apps
- `lib/`: library code
- `docs/`: documentation
- `scripts/`: project/maintenance scripts

The README doesn't define how `packages/` and `lib/` differ. Ask before choosing where new shared code goes.

## Environment

Development happens on Windows (PowerShell and Git Bash both available). Keep scripts cross-platform or say which shell they target.
