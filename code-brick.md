# CodeBrick – Product Requirement Document (PRD)

## Product & Architecture Overview

**Goal:**
Create a **framework-agnostic**, **hybrid** CLI tool for managing reusable code templates (called **Bricks**). Supports both **local templates** (stored on disk, fully mutable) and **remote templates** (fetched from GitHub on-demand). Developers can create, modify, inspect, and apply templates to new projects seamlessly.

### The Problem We're Solving

Every developer has faced this workflow:

1. Create a new project (e.g., `nest new my-app`)
2. Open an existing project with code you want to reuse
3. Manually copy-paste files (auth module, pagination utils, config files)
4. Adjust imports, fix paths, install missing dependencies
5. Repeat for every new project

**CodeBrick eliminates steps 2-4 entirely.**

### Core Concept

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              HYBRID WORKFLOW                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                        LOCAL TEMPLATES                              │   │
│   │                                                                     │   │
│   │   [Local Project]  ──brick save──►  [~/.codebrick/templates/]       │   │
│   │                                             │                       │   │
│   │   [New Project]  ◄──brick apply─────────────┘                       │   │
│   │                                                                     │   │
│   │   ✓ Files stored on disk    ✓ Fully mutable    ✓ Offline access     │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                       REMOTE TEMPLATES (GitHub)                     │   │
│   │                                                                     │   │
│   │   [GitHub Repo]  ──brick link──►  [Registry with metadata only]     │   │
│   │                                             │                       │   │
│   │   [New Project]  ◄──brick apply─────────────┘  (fetches on-demand)  │   │
│   │                                                                     │   │
│   │   ✓ No disk usage    ✓ Always latest    ✓ Team sharing via GitHub   │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

- **Local Brick:** A reusable, mutable template with actual files stored on disk
- **Remote Brick:** A pointer to a GitHub repo/path — files fetched on-demand when applied
- **Template Store:** Local directory for local templates + registry for remote references
- **Non-Destructive:** Original codebase is never modified when saving templates

### Key Principles

| Principle              | Description                                                                  |
| ---------------------- | ---------------------------------------------------------------------------- |
| **Hybrid Storage**     | Choose between local (files on disk) or remote (GitHub) per template         |
| **Local = Mutable**    | Local templates can be modified anytime without affecting source             |
| **Remote = Linked**    | Remote templates stay in sync with GitHub, always fetch latest or pinned ref |
| **Framework Agnostic** | Works with any language, framework, or file type                             |
| **Non-Destructive**    | Original codebase is never modified when saving or updating templates        |
| **Version Aware**      | Smart dependency version management when applying templates                  |

### When to Use Which?

| Use Case                                 | Recommended Type |
| ---------------------------------------- | ---------------- |
| Personal utilities you modify frequently | **Local**        |
| Team-shared templates via GitHub         | **Remote**       |
| Templates you want to customize per use  | **Local**        |
| Open-source boilerplates                 | **Remote**       |
| Offline development                      | **Local**        |
| Always want latest version               | **Remote**       |

### Framework Agnostic

**CodeBrick works with any technology stack** since it operates at the file level:

| Category       | Examples                                              |
| -------------- | ----------------------------------------------------- |
| Frontend       | React, Vue, Angular, Svelte, Solid, Astro             |
| Backend        | NestJS, Express, FastAPI, Django, Rails, Spring Boot  |
| Mobile         | React Native, Flutter, Swift, Kotlin                  |
| Languages      | TypeScript, JavaScript, Python, Go, Rust, Java, C#    |
| Infrastructure | Terraform, Pulumi, Docker, Kubernetes configs         |
| Other          | Markdown docs, config files, shell scripts, any files |

---

## Architecture

### Storage Structure

```
~/.codebrick/
├── config.json              # Global configuration (GitHub token, preferences)
├── store.json               # Template registry/index (both local & remote)
└── templates/               # LOCAL templates only (actual files)
    ├── nestjs-auth/
    │   ├── brick.json       # Template metadata
    │   ├── auth.module.ts
    │   ├── auth.service.ts
    │   ├── auth.controller.ts
    │   ├── guards/
    │   │   └── jwt.guard.ts
    │   └── strategies/
    │       └── jwt.strategy.ts
    ├── react-modal/
    │   ├── brick.json
    │   ├── Modal.tsx
    │   ├── Modal.styles.ts
    │   └── index.ts
    └── fastapi-auth/
        ├── brick.json
        ├── auth.py
        ├── dependencies.py
        └── schemas.py

# REMOTE templates are NOT stored here — only metadata in store.json
# Files are fetched from GitHub on-demand when applying
```

### Template Metadata (`brick.json`)

Each **local** template contains a `brick.json` file with metadata:

```json
{
  "name": "nestjs-auth",
  "type": "local",
  "version": "1.0.0",
  "description": "JWT authentication module for NestJS",
  "createdAt": "2026-01-11T10:30:00Z",
  "updatedAt": "2026-01-11T14:20:00Z",
  "source": {
    "origin": "local",
    "path": "/Users/dev/projects/my-backend/src/auth"
  },
  "files": [
    "auth.module.ts",
    "auth.service.ts",
    "auth.controller.ts",
    "guards/jwt.guard.ts",
    "strategies/jwt.strategy.ts"
  ],
  "dependencies": {
    "@nestjs/jwt": "^10.0.0",
    "@nestjs/passport": "^10.0.0",
    "passport-jwt": "^4.0.0",
    "bcrypt": "^5.1.0"
  },
  "devDependencies": {
    "@types/passport-jwt": "^3.0.0",
    "@types/bcrypt": "^5.0.0"
  },
  "tags": ["auth", "jwt", "nestjs", "security"]
}
```

### Registry Index (`store.json`)

```json
{
  "version": "1.0",
  "templates": {
    "nestjs-auth": {
      "type": "local",
      "path": "templates/nestjs-auth",
      "description": "JWT authentication module for NestJS",
      "tags": ["auth", "jwt", "nestjs"],
      "createdAt": "2026-01-11T10:30:00Z",
      "updatedAt": "2026-01-11T14:20:00Z"
    },
    "react-modal": {
      "type": "local",
      "path": "templates/react-modal",
      "description": "Reusable modal component with animations",
      "tags": ["react", "modal", "ui"],
      "createdAt": "2026-01-10T09:00:00Z",
      "updatedAt": "2026-01-10T09:00:00Z"
    },
    "company-starter": {
      "type": "remote",
      "github": {
        "owner": "mycompany",
        "repo": "templates",
        "path": "nestjs-starter",
        "ref": "main",
        "commit": "a1b2c3d4"
      },
      "description": "Company NestJS starter template",
      "tags": ["nestjs", "starter", "company"],
      "createdAt": "2026-01-08T15:00:00Z",
      "updatedAt": "2026-01-08T15:00:00Z"
    },
    "oss-react-hooks": {
      "type": "remote",
      "github": {
        "owner": "awesome-dev",
        "repo": "react-utils",
        "path": "src/hooks",
        "ref": "v2.1.0",
        "commit": null
      },
      "description": "Collection of useful React hooks",
      "tags": ["react", "hooks", "utils"],
      "createdAt": "2026-01-05T10:00:00Z",
      "updatedAt": "2026-01-05T10:00:00Z"
    }
  }
}
```

**Key Differences:**

| Property      | Local Template                    | Remote Template                |
| ------------- | --------------------------------- | ------------------------------ |
| `type`        | `"local"`                         | `"remote"`                     |
| `path`        | Path to `~/.codebrick/templates/` | Not used                       |
| `github`      | Not used                          | Owner, repo, path, ref, commit |
| Files stored? | Yes, on disk                      | No, fetched on-demand          |
| Mutable?      | Yes                               | No (re-link to update)         |

---

## Recommended Tech Stack

| Component     | Technology         | Reason                                |
| ------------- | ------------------ | ------------------------------------- |
| Language      | TypeScript         | Type safety, better maintainability   |
| Runtime       | Node.js            | Cross-platform, familiar ecosystem    |
| CLI Framework | Commander.js       | Industry standard, excellent DX       |
| Prompts       | @clack/prompts     | Beautiful, modern interactive prompts |
| File Ops      | fs-extra           | Robust filesystem utilities           |
| Styling       | picocolors         | Fast, lightweight terminal colors     |
| Tree View     | Custom / tree-cli  | Display template structure            |
| Diff          | diff               | Show changes when updating templates  |
| Glob          | fast-glob          | Fast file pattern matching            |
| GitHub API    | Octokit (optional) | For GitHub import feature             |

---

## CLI Commands

### Command Overview

#### Local Template Commands

| Command                               | Description                                   |
| ------------------------------------- | --------------------------------------------- |
| `brick init`                          | Initialize CodeBrick in the system            |
| `brick save <name> [path]`            | Create a new LOCAL template from files        |
| `brick apply <name> [destination]`    | Apply template to current/specified directory |
| `brick list`                          | List all saved templates (local & remote)     |
| `brick tree <name>`                   | Display template file structure               |
| `brick info <name>`                   | Show detailed template information            |
| `brick add <name> <files...>`         | Add files to an existing LOCAL template       |
| `brick remove-file <name> <files...>` | Remove files from a LOCAL template            |
| `brick delete <name>`                 | Delete a template entirely                    |
| `brick update <name> [path]`          | Update LOCAL template from source             |
| `brick clone <name> <new-name>`       | Duplicate a template                          |
| `brick export <name> [output]`        | Export template as .brick archive             |
| `brick import <file>`                 | Import template from .brick archive           |

#### Remote Template Commands (GitHub)

| Command                          | Description                                 |
| -------------------------------- | ------------------------------------------- |
| `brick auth <token>`             | Authenticate with GitHub PAT                |
| `brick link <name> <github-url>` | Create a REMOTE template linked to GitHub   |
| `brick unlink <name>`            | Remove a remote template link               |
| `brick refresh <name>`           | Update remote template to latest commit     |
| `brick pull <name>`              | Convert remote template to local (download) |

---

## Development Roadmap

### Phase 1: Foundation

**Commands:** `brick init`, `brick save`, `brick list`

#### `brick init`

Initializes the CodeBrick storage structure.

```bash
brick init
```

**Behavior:**

- Creates `~/.codebrick/` directory structure
- Initializes empty `store.json` and `config.json`
- Displays welcome message with quick start guide

**Output:**

```
✓ CodeBrick initialized successfully!

Storage location: ~/.codebrick/

Quick Start:
  brick save my-auth ./src/auth    Save a template
  brick list                       View all templates
  brick apply my-auth              Apply to current project
```

---

#### `brick save <name> [path]`

Creates a new template from local files.

```bash
# Save current directory as template
brick save nestjs-auth

# Save specific path as template
brick save nestjs-auth ./src/auth

# Save with description
brick save nestjs-auth ./src/auth --description "JWT auth module"

# Save with tags
brick save nestjs-auth ./src/auth --tags auth,jwt,nestjs
```

**Options:**

| Flag            | Description                             |
| --------------- | --------------------------------------- |
| `--description` | Template description                    |
| `--tags`        | Comma-separated tags for organization   |
| `--include`     | Glob patterns to include (default: all) |
| `--exclude`     | Glob patterns to exclude                |
| `--detect-deps` | Auto-detect dependencies from imports   |

**Behavior:**

1. Validate path exists
2. Prompt for confirmation if template name already exists
3. Copy all files to `~/.codebrick/templates/<name>/`
4. Scan files for dependencies (if `--detect-deps`)
5. Generate `brick.json` metadata
6. Update `store.json` registry
7. Display success with file count

**Output:**

```
┌  Saving template: nestjs-auth
│
├  Source: /Users/dev/projects/my-backend/src/auth
├  Files:  5 files, 2 directories
│
◇  Detected dependencies:
│  @nestjs/jwt, @nestjs/passport, passport-jwt, bcrypt
│
◇  Add these to template metadata? (Y/n)
│
└  ✓ Template 'nestjs-auth' saved successfully!

   View structure: brick tree nestjs-auth
   Apply template: brick apply nestjs-auth
```

---

#### `brick list`

Lists all saved templates (both local and remote).

```bash
brick list

# Filter by tag
brick list --tag auth

# Filter by type
brick list --local      # Only local templates
brick list --remote     # Only remote templates

# Show detailed view
brick list --detailed
```

**Output (Default):**

```
┌─────────────────┬────────┬────────────────────────────────────┬─────────────┐
│ Name            │ Type   │ Description                        │ Files       │
├─────────────────┼────────┼────────────────────────────────────┼─────────────┤
│ nestjs-auth     │ local  │ JWT authentication module          │ 5 files     │
│ react-modal     │ local  │ Reusable modal component           │ 3 files     │
│ company-starter │ remote │ Company NestJS starter template    │ 8 files     │
│ oss-hooks       │ remote │ Collection of React hooks          │ 12 files    │
└─────────────────┴────────┴────────────────────────────────────┴─────────────┘

Total: 4 templates (2 local, 2 remote)
```

**Output (Detailed):**

```
LOCAL TEMPLATES
───────────────

nestjs-auth
  Type:        local
  Description: JWT authentication module
  Files:       5 files, 2 directories
  Tags:        auth, jwt, nestjs
  Created:     2026-01-11
  Updated:     2026-01-11

react-modal
  Type:        local
  Description: Reusable modal component
  Files:       3 files
  Tags:        react, modal, ui
  Created:     2026-01-10
  Updated:     2026-01-10

REMOTE TEMPLATES (GitHub)
─────────────────────────

company-starter
  Type:        remote
  Source:      github:mycompany/templates/nestjs-starter
  Ref:         main @ a1b2c3d4
  Description: Company NestJS starter template
  Tags:        nestjs, starter, company
  Linked:      2026-01-08

oss-hooks
  Type:        remote
  Source:      github:awesome-dev/react-utils/src/hooks
  Ref:         v2.1.0
  Description: Collection of React hooks
  Tags:        react, hooks, utils
  Linked:      2026-01-05

Total: 4 templates (2 local, 2 remote)
```

---

### Phase 2: Template Application

**Commands:** `brick apply`, `brick tree`, `brick info`

#### `brick apply <name> [destination]`

Applies a template to the current or specified directory.

```bash
# Apply to current directory
brick apply nestjs-auth

# Apply to specific path
brick apply nestjs-auth ./src/auth

# Apply with options
brick apply nestjs-auth --force --latest
```

**Options:**

| Flag              | Description                                |
| ----------------- | ------------------------------------------ |
| `--force`         | Overwrite existing files without prompting |
| `--skip-existing` | Skip files that already exist              |
| `--dry-run`       | Preview changes without writing files      |
| `--latest`        | Use @latest for all dependency versions    |
| `--no-deps`       | Don't prompt for dependency installation   |

**Interactive Flow:**

```
┌  Applying template: nestjs-auth
│
├  Destination: ./src/auth
│
◆  5 files will be created:
│  ├── auth.module.ts
│  ├── auth.service.ts
│  ├── auth.controller.ts
│  ├── guards/jwt.guard.ts
│  └── strategies/jwt.strategy.ts
│
◆  Dependency versions:
│
│  This template requires the following dependencies:
│
│  ┌─────────────────────┬───────────────┬─────────────────┐
│  │ Package             │ Template Ver  │ Action          │
│  ├─────────────────────┼───────────────┼─────────────────┤
│  │ @nestjs/jwt         │ ^10.0.0       │ install         │
│  │ @nestjs/passport    │ ^10.0.0       │ install         │
│  │ passport-jwt        │ ^4.0.0        │ install         │
│  │ bcrypt              │ ^5.1.0        │ install         │
│  └─────────────────────┴───────────────┴─────────────────┘
│
◇  How would you like to handle versions?
│  ● Use template versions (recommended)
│  ○ Use @latest for all packages
│  ○ Specify versions manually
│  ○ Skip dependency installation
│
◇  Proceed with installation? (Y/n)
│
├  Creating files...
├  ✓ Created auth.module.ts
├  ✓ Created auth.service.ts
├  ✓ Created auth.controller.ts
├  ✓ Created guards/jwt.guard.ts
├  ✓ Created strategies/jwt.strategy.ts
│
└  ✓ Template applied successfully!

   Run: npm install (to install dependencies)
```

---

#### `brick tree <name>`

Displays the file structure of a template.

```bash
brick tree nestjs-auth

# Show file sizes
brick tree nestjs-auth --size

# Show with content preview
brick tree nestjs-auth --preview
```

**Output:**

```
nestjs-auth
├── brick.json
├── auth.module.ts
├── auth.service.ts
├── auth.controller.ts
├── guards/
│   └── jwt.guard.ts
└── strategies/
    └── jwt.strategy.ts

5 files, 2 directories
```

**Output (with `--size`):**

```
nestjs-auth (12.4 KB)
├── brick.json (0.8 KB)
├── auth.module.ts (1.2 KB)
├── auth.service.ts (3.1 KB)
├── auth.controller.ts (2.8 KB)
├── guards/
│   └── jwt.guard.ts (1.9 KB)
└── strategies/
    └── jwt.strategy.ts (2.6 KB)

5 files, 2 directories, 12.4 KB total
```

---

#### `brick info <name>`

Shows detailed information about a template.

```bash
brick info nestjs-auth
```

**Output:**

```
┌─────────────────────────────────────────────────────────┐
│  nestjs-auth                                            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Description:  JWT authentication module for NestJS     │
│  Version:      1.0.0                                    │
│  Created:      2026-01-11 10:30 AM                      │
│  Updated:      2026-01-11 02:20 PM                      │
│                                                         │
│  Source:       /Users/dev/projects/my-backend/src/auth  │
│  Storage:      ~/.codebrick/templates/nestjs-auth       │
│                                                         │
│  Tags:         auth, jwt, nestjs, security              │
│                                                         │
│  Files:        5 files, 2 directories                   │
│                                                         │
│  Dependencies:                                          │
│    @nestjs/jwt         ^10.0.0                          │
│    @nestjs/passport    ^10.0.0                          │
│    passport-jwt        ^4.0.0                           │
│    bcrypt              ^5.1.0                           │
│                                                         │
│  Dev Dependencies:                                      │
│    @types/passport-jwt ^3.0.0                           │
│    @types/bcrypt       ^5.0.0                           │
│                                                         │
└─────────────────────────────────────────────────────────┘

Commands:
  brick tree nestjs-auth     View file structure
  brick apply nestjs-auth    Apply to project
  brick add nestjs-auth      Add files to template
```

---

### Phase 3: Template Modification

**Commands:** `brick add`, `brick remove-file`, `brick update`, `brick clone`

#### `brick add <name> <files...>`

Adds files to an existing template.

```bash
# Add single file
brick add nestjs-auth ./src/auth/dto/login.dto.ts

# Add multiple files
brick add nestjs-auth ./src/auth/dto/*.ts

# Add entire directory
brick add nestjs-auth ./src/auth/decorators/
```

**Output:**

```
┌  Adding files to: nestjs-auth
│
├  Files to add:
│  ├── dto/login.dto.ts
│  ├── dto/register.dto.ts
│  └── decorators/current-user.decorator.ts
│
◇  Confirm adding 3 files? (Y/n)
│
├  ✓ Added dto/login.dto.ts
├  ✓ Added dto/register.dto.ts
├  ✓ Added decorators/current-user.decorator.ts
│
└  ✓ Template updated! (8 files total)
```

---

#### `brick remove-file <name> <files...>`

Removes files from a template.

```bash
# Remove single file
brick remove-file nestjs-auth auth.controller.ts

# Remove multiple files
brick remove-file nestjs-auth dto/login.dto.ts dto/register.dto.ts

# Remove directory
brick remove-file nestjs-auth decorators/
```

**Output:**

```
┌  Removing files from: nestjs-auth
│
├  Files to remove:
│  └── auth.controller.ts
│
◇  Confirm removing 1 file? (Y/n)
│
├  ✓ Removed auth.controller.ts
│
└  ✓ Template updated! (4 files remaining)
```

---

#### `brick update <name> [path]`

Updates a template from its source or a new path.

```bash
# Update from original source (if tracked)
brick update nestjs-auth

# Update from new path
brick update nestjs-auth ./src/auth

# Preview changes without applying
brick update nestjs-auth --dry-run
```

**Output:**

```
┌  Updating template: nestjs-auth
│
├  Source: /Users/dev/projects/my-backend/src/auth
│
◆  Changes detected:
│
│  Modified:
│    ├── auth.service.ts (15 lines changed)
│    └── guards/jwt.guard.ts (3 lines changed)
│
│  Added:
│    └── dto/refresh-token.dto.ts (new file)
│
│  Removed:
│    └── (none)
│
◇  Apply these changes? (Y/n)
│
├  ✓ Updated auth.service.ts
├  ✓ Updated guards/jwt.guard.ts
├  ✓ Added dto/refresh-token.dto.ts
│
└  ✓ Template 'nestjs-auth' updated!
```

---

#### `brick clone <name> <new-name>`

Duplicates a template.

```bash
brick clone nestjs-auth nestjs-auth-v2
```

**Output:**

```
✓ Template 'nestjs-auth' cloned to 'nestjs-auth-v2'

  Edit the clone: brick tree nestjs-auth-v2
```

---

### Phase 4: Template Sharing

**Commands:** `brick export`, `brick import`, `brick auth`

#### `brick export <name> [output]`

Exports a template as a shareable `.brick` archive.

```bash
# Export to current directory
brick export nestjs-auth

# Export to specific path
brick export nestjs-auth ./exports/nestjs-auth.brick

# Export all templates
brick export --all ./backup/
```

**Output:**

```
✓ Exported 'nestjs-auth' to ./nestjs-auth.brick (15.2 KB)

Share this file with your team or import on another machine:
  brick import nestjs-auth.brick
```

---

#### `brick import <file>`

Imports a template from a `.brick` archive or GitHub.

```bash
# Import from file
brick import ./nestjs-auth.brick

# Import from GitHub (requires auth)
brick import github:username/repo/path/to/folder

# Import with custom name
brick import ./nestjs-auth.brick --name my-auth
```

**Output:**

```
┌  Importing template
│
├  Source: ./nestjs-auth.brick
├  Name:   nestjs-auth
├  Files:  5 files, 2 directories
│
◇  Template 'nestjs-auth' already exists. What would you like to do?
│  ○ Overwrite existing template
│  ● Import as 'nestjs-auth-2'
│  ○ Cancel import
│
└  ✓ Imported as 'nestjs-auth-2'
```

---

#### `brick auth <token>`

Authenticates with GitHub for remote imports.

```bash
brick auth ghp_xxxxxxxxxxxx
```

**Output:**

```
✓ Authenticated as @username

You can now import templates from GitHub:
  brick import github:username/repo/path
```

---

### Phase 5: Management

**Commands:** `brick delete`, `brick rename`, `brick edit`

#### `brick delete <name>`

Deletes a template entirely.

```bash
brick delete nestjs-auth

# Skip confirmation
brick delete nestjs-auth --force
```

**Output:**

```
◆  Delete template 'nestjs-auth'?
│
│  This will permanently remove:
│  - 5 files
│  - All metadata
│
◇  Type 'nestjs-auth' to confirm:
│
└  ✓ Template 'nestjs-auth' deleted
```

---

### Phase 6: Remote Templates (GitHub)

**Commands:** `brick link`, `brick unlink`, `brick refresh`, `brick pull`

#### `brick link <name> <github-url>`

Creates a remote template linked to a GitHub repository path.

```bash
# Link to a specific path in a repo (uses default branch)
brick link company-auth github:mycompany/templates/nestjs-auth

# Link with specific branch
brick link company-auth github:mycompany/templates/nestjs-auth --ref main

# Link with specific tag
brick link company-auth github:mycompany/templates/nestjs-auth --ref v2.0.0

# Link with specific commit (pinned)
brick link company-auth github:mycompany/templates/nestjs-auth --commit a1b2c3d4

# Full URL format also supported
brick link oss-hooks https://github.com/awesome-dev/react-utils/tree/main/src/hooks
```

**Options:**

| Flag            | Description                            |
| --------------- | -------------------------------------- |
| `--ref`         | Branch or tag to track (default: main) |
| `--commit`      | Pin to specific commit SHA             |
| `--description` | Template description                   |
| `--tags`        | Comma-separated tags                   |

**Output:**

```
┌  Linking remote template: company-auth
│
├  Repository:  mycompany/templates
├  Path:        nestjs-auth
├  Ref:         main
│
◆  Fetching repository info...
│
├  Files found: 6 files, 2 directories
├  Latest commit: a1b2c3d4 (2 days ago)
│
◇  Link this template? (Y/n)
│
└  ✓ Remote template 'company-auth' linked!

   View structure:  brick tree company-auth
   Apply template:  brick apply company-auth
```

---

#### `brick unlink <name>`

Removes a remote template link (does not affect GitHub).

```bash
brick unlink company-auth
```

**Output:**

```
✓ Remote template 'company-auth' unlinked
```

---

#### `brick refresh <name>`

Updates a remote template reference to the latest commit.

```bash
# Refresh to latest commit on tracked branch/tag
brick refresh company-auth

# Refresh all remote templates
brick refresh --all
```

**Output:**

```
┌  Refreshing: company-auth
│
├  Current commit:  a1b2c3d4 (5 days ago)
├  Latest commit:   e5f6g7h8 (1 hour ago)
│
├  Changes:
│    + 2 files added
│    ~ 3 files modified
│
◇  Update reference? (Y/n)
│
└  ✓ Template 'company-auth' refreshed to e5f6g7h8
```

---

#### `brick pull <name>`

Converts a remote template to a local template by downloading all files.

```bash
# Pull remote to local (keeps same name)
brick pull company-auth

# Pull with new name
brick pull company-auth --as my-local-auth
```

**Output:**

```
┌  Pulling remote template: company-auth
│
├  Source: github:mycompany/templates/nestjs-auth
├  Commit: a1b2c3d4
│
◆  Downloading 6 files...
│
├  ✓ Downloaded auth.module.ts
├  ✓ Downloaded auth.service.ts
├  ✓ Downloaded auth.controller.ts
├  ✓ Downloaded guards/jwt.guard.ts
├  ✓ Downloaded strategies/jwt.strategy.ts
├  ✓ Downloaded brick.json
│
◇  Keep remote link as well? (y/N)
│
└  ✓ Template 'company-auth' is now local!

   This template is now fully mutable.
   Add files:    brick add company-auth <files>
   Remove files: brick remove-file company-auth <files>
```

---

### Applying Remote vs Local Templates

When you run `brick apply`, the behavior differs based on template type:

**Local Template:**

```
✓ Reading files from ~/.codebrick/templates/nestjs-auth/
✓ Files copied instantly (no network)
```

**Remote Template:**

```
◆ Fetching files from GitHub...
├ Repository: mycompany/templates
├ Path: nestjs-auth
├ Commit: a1b2c3d4
◆ Downloading 6 files...
✓ Files applied successfully
```

---

## Functional Requirements

### Local Templates

| ID    | Requirement                                             |
| ----- | ------------------------------------------------------- |
| FR-01 | Save local directories as templates (files on disk)     |
| FR-02 | Apply templates to projects with file conflict handling |
| FR-03 | List all templates with filtering and search            |
| FR-04 | Display template structure in tree format               |
| FR-05 | Show detailed template information and metadata         |
| FR-06 | Add files to existing local templates                   |
| FR-07 | Remove files from local templates                       |
| FR-08 | Update local templates from source with diff preview    |
| FR-09 | Clone/duplicate templates                               |
| FR-10 | Export templates as shareable archives                  |
| FR-11 | Import templates from archives                          |

### Remote Templates (GitHub)

| ID    | Requirement                                          |
| ----- | ---------------------------------------------------- |
| FR-12 | Link templates to GitHub repository paths            |
| FR-13 | Fetch files on-demand when applying remote templates |
| FR-14 | Support branch, tag, or commit pinning               |
| FR-15 | Refresh remote templates to latest commit            |
| FR-16 | Pull remote templates to convert to local            |
| FR-17 | Authenticate with GitHub for private repositories    |

### Dependency Management

| ID    | Requirement                                        |
| ----- | -------------------------------------------------- |
| FR-18 | Manage dependency versions when applying templates |
| FR-19 | Auto-detect dependencies from file imports         |
| FR-20 | Support @latest or specific version selection      |

---

## Non-Functional Requirements

| ID     | Requirement                                      |
| ------ | ------------------------------------------------ |
| NFR-01 | Template save/apply operations < 2 seconds       |
| NFR-02 | Support templates up to 100MB                    |
| NFR-03 | Framework-agnostic — works with any file type    |
| NFR-04 | Beautiful, colorized CLI output                  |
| NFR-05 | Graceful error handling with actionable messages |
| NFR-06 | No network required for local operations         |
| NFR-07 | Cross-platform support (macOS, Linux, Windows)   |
| NFR-08 | Secure storage with appropriate file permissions |

---

## User Stories

### Local Templates

| ID    | Story                                                                                 |
| ----- | ------------------------------------------------------------------------------------- |
| US-01 | As a developer, I want to save code from my existing project as a reusable template   |
| US-02 | As a developer, I want to apply templates to new projects without manual copy-paste   |
| US-03 | As a developer, I want to see what files are in a template before applying it         |
| US-04 | As a developer, I want to add or remove files from templates without affecting source |
| US-05 | As a developer, I want to control dependency versions when applying templates         |
| US-06 | As a developer, I want to share templates with my team via exportable files           |

### Remote Templates

| ID    | Story                                                                                 |
| ----- | ------------------------------------------------------------------------------------- |
| US-07 | As a developer, I want to link templates to GitHub repos so my team stays in sync     |
| US-08 | As a developer, I want to pin templates to specific versions/commits for stability    |
| US-09 | As a developer, I want to refresh remote templates to get the latest changes          |
| US-10 | As a developer, I want to convert a remote template to local for customization        |
| US-11 | As a developer, I want to use templates from private GitHub repos with authentication |

### General

| ID    | Story                                                                                |
| ----- | ------------------------------------------------------------------------------------ |
| US-12 | As a developer, I want templates to work with any framework or language              |
| US-13 | As a developer, I want to preview changes before applying or updating templates      |
| US-14 | As a developer, I want to organize templates with tags and descriptions              |
| US-15 | As a developer, I want to choose between local storage or GitHub remote per template |

---

## Error Handling

| Scenario                | Message                                                                         |
| ----------------------- | ------------------------------------------------------------------------------- |
| Template not found      | `Error: Template 'xyz' not found. Run 'brick list' to see available templates.` |
| Source path not found   | `Error: Path './src/auth' does not exist.`                                      |
| Template already exists | `Warning: Template 'xyz' already exists. Use --force to overwrite.`             |
| File conflict on apply  | `Conflict: 'auth.ts' already exists. [overwrite / skip / diff / cancel]`        |
| Invalid .brick file     | `Error: Invalid archive. File may be corrupted.`                                |
| GitHub auth required    | `Error: GitHub import requires authentication. Run 'brick auth <token>'`        |
| Empty template          | `Error: Cannot save empty template. No files found in path.`                    |

---

## Future Enhancements (V2+)

| Feature              | Description                                                   |
| -------------------- | ------------------------------------------------------------- |
| Template Variables   | Support `{{projectName}}`, `{{author}}` placeholders in files |
| Post-Apply Hooks     | Run custom scripts after template application                 |
| Template Inheritance | Create templates that extend other templates                  |
| Version History      | Track changes to templates over time with rollback            |
| Cloud Sync           | Sync templates across machines via cloud storage              |
| Team Workspaces      | Shared template registries for teams                          |
| AI Generation        | Generate templates from natural language descriptions         |
| IDE Extensions       | VS Code / Cursor extensions for GUI management                |

---

## Implementation Priority

### MVP (Phase 1-2) — Local Templates Core

1. `brick init` - Initialize storage
2. `brick save` - Create local templates
3. `brick list` - View templates (local)
4. `brick tree` - View structure
5. `brick apply` - Apply local templates
6. `brick info` - Template details

### V1.0 (Phase 3) — Local Template Management

7. `brick add` - Add files to local templates
8. `brick remove-file` - Remove files from local templates
9. `brick update` - Update from source
10. `brick delete` - Delete templates
11. `brick clone` - Duplicate templates

### V1.1 (Phase 4-5) — Sharing & Export

12. `brick export` - Export as .brick archive
13. `brick import` - Import from archive
14. Dependency version management (@latest vs pinned)

### V1.2 (Phase 6) — Remote Templates (GitHub)

15. `brick auth` - GitHub authentication
16. `brick link` - Create remote template links
17. `brick unlink` - Remove remote links
18. `brick refresh` - Update to latest commit
19. `brick pull` - Convert remote to local
20. Apply remote templates (fetch on-demand)

---

## Next Steps

1. Initialize TypeScript project with Commander.js
2. Implement storage layer (`~/.codebrick/` structure)
3. Build `brick init`, `brick save`, `brick list` (local templates)
4. Add `brick tree`, `brick apply`, `brick info`
5. Implement local template modification commands
6. Add export/import functionality
7. Implement GitHub authentication
8. Add remote template commands (`link`, `refresh`, `pull`)
9. Write comprehensive tests
10. Publish to npm as `brick-cli`

---

## Reference

- Commander.js: https://github.com/tj/commander.js
- @clack/prompts: https://github.com/natemoo-re/clack
- fs-extra: https://github.com/jprichardson/node-fs-extra
