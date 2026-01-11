# 🧱 Brick CLI

A **framework-agnostic** CLI tool for managing reusable code templates. Stop copy-pasting code between projects — save it once, use it everywhere.

## The Problem

Every developer has faced this workflow:

1. Create a new project (`nest new my-app`)
2. Open an existing project with code you want to reuse
3. Manually copy-paste files (auth module, pagination utils, config files)
4. Adjust imports, fix paths, install missing dependencies
5. **Repeat for every new project**

**Brick eliminates steps 2-4 entirely.**

## Installation

```bash
# Install globally via npm
npm install -g brick-cli

# Or with yarn
yarn global add brick-cli

# Or with pnpm
pnpm add -g brick-cli

# Or with bun
bun add -g brick-cli
```

After installation, the `brick` command will be available globally:

```bash
brick --version
```

## Quick Start

```bash
# 1. Initialize brick (one-time setup)
brick init

# 2. Save a folder as a reusable template
brick save my-auth ./src/auth --description "JWT authentication module"

# 3. View your saved templates
brick list

# 4. Apply a template to a new project
cd ~/new-project
brick apply my-auth ./src/auth
```

## Commands

### `brick init`

Initialize Brick on your system. Creates the storage directory at `~/.codebrick/`.

```bash
brick init
```

### `brick save <name> [path]`

Save a folder as a reusable template.

```bash
# Save current directory
brick save my-template

# Save a specific path
brick save nestjs-auth ./src/auth

# With options
brick save nestjs-auth ./src/auth \
  --description "JWT authentication for NestJS" \
  --tags auth,jwt,nestjs \
  --detect-deps
```

**Options:**

- `-d, --description <desc>` — Template description
- `-t, --tags <tags>` — Comma-separated tags
- `--include <patterns>` — Glob patterns to include
- `--exclude <patterns>` — Glob patterns to exclude
- `--detect-deps` — Auto-detect dependencies from imports

### `brick list`

List all saved templates.

```bash
brick list

# Filter by type
brick list --local
brick list --remote

# Filter by tag
brick list --tag auth

# Detailed view
brick list --detailed
```

### `brick tree <name>`

Display the file structure of a template.

```bash
brick tree nestjs-auth

# With file sizes
brick tree nestjs-auth --size
```

**Output:**

```
nestjs-auth
├── guards/
│   └── jwt.guard.ts
├── strategies/
│   └── jwt.strategy.ts
├── auth.controller.ts
├── auth.module.ts
└── auth.service.ts

5 files, 2 directories
```

### `brick apply <name> [destination]`

Apply a template to your project.

```bash
# Apply to current directory
brick apply nestjs-auth

# Apply to specific path
brick apply nestjs-auth ./src/auth

# With options
brick apply nestjs-auth --force --latest
```

**Options:**

- `-f, --force` — Overwrite existing files without prompting
- `--skip-existing` — Skip files that already exist
- `--dry-run` — Preview changes without writing files
- `--latest` — Use @latest for all dependency versions
- `--no-deps` — Skip dependency installation prompts

### `brick info <name>`

Show detailed information about a template.

```bash
brick info nestjs-auth
```

### `brick add <name> <files...>`

Add files to an existing template.

```bash
# Add a single file
brick add nestjs-auth ./src/auth/dto/login.dto.ts

# Add multiple files
brick add nestjs-auth ./src/auth/dto/*.ts

# Add a directory
brick add nestjs-auth ./src/auth/decorators/
```

### `brick remove-file <name> <files...>`

Remove files from a template.

```bash
brick remove-file nestjs-auth auth.controller.ts
brick remove-file nestjs-auth dto/
```

### `brick delete <name>`

Delete a template entirely.

```bash
brick delete nestjs-auth

# Skip confirmation
brick delete nestjs-auth --force
```

## Framework Agnostic

Brick works with **any language or framework** since it operates at the file level:

| Category       | Examples                                             |
| -------------- | ---------------------------------------------------- |
| Frontend       | React, Vue, Angular, Svelte, Solid, Astro            |
| Backend        | NestJS, Express, FastAPI, Django, Rails, Spring Boot |
| Mobile         | React Native, Flutter, Swift, Kotlin                 |
| Languages      | TypeScript, JavaScript, Python, Go, Rust, Java, C#   |
| Infrastructure | Terraform, Pulumi, Docker, Kubernetes configs        |
| Other          | Markdown docs, config files, shell scripts           |

## Storage Location

Templates are stored locally at:

```
~/.codebrick/
├── config.json      # Configuration
├── store.json       # Template registry
└── templates/       # Actual template files
    ├── nestjs-auth/
    ├── react-modal/
    └── ...
```

## Examples

### Save a NestJS Auth Module

```bash
# From your existing project with a working auth implementation
cd ~/projects/my-backend
brick save nestjs-auth ./src/auth \
  --description "JWT authentication with Passport" \
  --tags nestjs,auth,jwt,passport \
  --detect-deps
```

### Apply to a New Project

```bash
# Create new project
nest new my-new-api
cd my-new-api

# Apply the auth template
brick apply nestjs-auth ./src/auth

# Install dependencies (brick will show you the command)
npm install @nestjs/jwt @nestjs/passport passport-jwt bcrypt
```

### Save React Components

```bash
brick save react-modal ./src/components/Modal \
  --description "Animated modal with backdrop" \
  --tags react,modal,ui,animation
```

### Save Docker Configs

```bash
brick save docker-dev ./docker \
  --description "Docker Compose development setup" \
  --tags docker,devops
```

## License

MIT

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.
