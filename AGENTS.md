# Repository Guidelines for AI Agents

This document provides repository-wide guidelines for AI agents working in this repository.

## Repository Structure

### Root Layout
- **Root documentation:** `Overview.md` (project listing), `AGENTS.md` (this file), `index.html` (project portal)
- **Projects:** Each project lives in its own directory with project-specific documentation

### Current Projects
- **`brickwave/`** - Browser-based pixel platformer game with Phaser 3
  - See [brickwave/AGENTS.md](brickwave/AGENTS.md) for project-specific guidelines
  - Full documentation in `brickwave/docs/`
- **`time-marker/`** - Simple single-file time marking web app
  - See [time-marker/README.md](time-marker/README.md) for details
  - Single HTML file, no build process

## Adding New Projects

When creating a new project in this repository:

1. **Create project directory** at root level with a descriptive name
2. **Add README.md** describing the project, features, and tech stack
3. **Update Overview.md** with project entry including status and key details
4. **Update index.html** with a card linking to the project (if it's a web app)
5. **Create project AGENTS.md** if the project has specific conventions or complexity
6. **Keep project-specific docs** within the project directory, not at root level

## General Guidelines

### Repository Documentation
- **Overview.md** - Keep updated with all projects and their current status
- **Project README files** - Provide clear setup instructions and context
- **AGENTS.md files** - Project-specific conventions live in project directories

## Commit & Pull Request Guidelines

### Commit Messages
- **Format:** Concise imperative mood (e.g., `Add new project`, `Fix navigation bug`)
- **Grouping:** Group related changes into single commits where logical
- **Scope:** Keep commits focused on one concern
- **Project prefix:** Optional for multi-project changes (e.g., `brickwave: Add new level`)

### Pull Requests
- **Description:** Short scope description, key changes, testing performed
- **Issue linking:** Link to relevant issues if applicable
- **Visuals:** Include screenshots/GIFs for UI or visual updates
- **Impact:** Call out breaking changes or significant additions
- **Diffs:** Keep focused; avoid mixing refactors with behavior changes unless necessary

## Documentation Standards

### Repository-Level Documentation
- **Overview.md** - Keep current with all projects, statuses, and links
- **index.html** - Update with new project cards as they're added
- **AGENTS.md** - This file; keep repository-wide guidelines only

### Project-Level Documentation
- Each project should have its own README.md
- Complex projects should have their own AGENTS.md with specific conventions
- Keep project documentation within the project directory
- Use relative paths for internal links

### Documentation Lifecycle
- Update docs when adding features or making architectural changes
- Mark superseded sections clearly or move to archive folders
- Include "Last Updated" dates on significant documents
- Verify links work after reorganization

---

**Last Updated:** 2026-02-23
