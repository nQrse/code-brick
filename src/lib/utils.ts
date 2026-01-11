import fs from "fs-extra";
import path from "path";
import pc from "picocolors";

// Format file size
export function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Format date
export function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
}

// Format relative time
export function formatRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "today";
    if (diffDays === 1) return "yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
}

// Get all files in a directory recursively
export async function getFilesRecursive(
    dir: string,
    baseDir: string = dir
): Promise<string[]> {
    const files: string[] = [];
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.relative(baseDir, fullPath);

        if (entry.isDirectory()) {
            // Skip hidden directories and common ignores
            if (
                entry.name.startsWith(".") ||
                entry.name === "node_modules" ||
                entry.name === "__pycache__"
            ) {
                continue;
            }
            const subFiles = await getFilesRecursive(fullPath, baseDir);
            files.push(...subFiles);
        } else {
            // Skip hidden files and brick.json
            if (!entry.name.startsWith(".") && entry.name !== "brick.json") {
                files.push(relativePath);
            }
        }
    }

    return files.sort();
}

// Get directory stats
export async function getDirectoryStats(
    dir: string
): Promise<{ files: number; directories: number; totalSize: number }> {
    let files = 0;
    let directories = 0;
    let totalSize = 0;

    const processDir = async (currentDir: string) => {
        const entries = await fs.readdir(currentDir, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(currentDir, entry.name);

            if (entry.isDirectory()) {
                if (
                    !entry.name.startsWith(".") &&
                    entry.name !== "node_modules" &&
                    entry.name !== "__pycache__"
                ) {
                    directories++;
                    await processDir(fullPath);
                }
            } else {
                if (!entry.name.startsWith(".")) {
                    files++;
                    const stat = await fs.stat(fullPath);
                    totalSize += stat.size;
                }
            }
        }
    };

    await processDir(dir);
    return { files, directories, totalSize };
}

// Generate tree structure
export interface TreeNode {
    name: string;
    type: "file" | "directory";
    size?: number;
    children?: TreeNode[];
}

export async function buildTree(
    dir: string,
    includeSize: boolean = false
): Promise<TreeNode[]> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const nodes: TreeNode[] = [];

    // Sort: directories first, then files, alphabetically
    const sortedEntries = entries.sort((a, b) => {
        if (a.isDirectory() && !b.isDirectory()) return -1;
        if (!a.isDirectory() && b.isDirectory()) return 1;
        return a.name.localeCompare(b.name);
    });

    for (const entry of sortedEntries) {
        // Skip hidden files/dirs and brick.json for display
        if (entry.name.startsWith(".")) continue;

        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            if (entry.name === "node_modules" || entry.name === "__pycache__")
                continue;

            const children = await buildTree(fullPath, includeSize);
            nodes.push({
                name: entry.name,
                type: "directory",
                children,
            });
        } else {
            const node: TreeNode = {
                name: entry.name,
                type: "file",
            };
            if (includeSize) {
                const stat = await fs.stat(fullPath);
                node.size = stat.size;
            }
            nodes.push(node);
        }
    }

    return nodes;
}

// Render tree to string
export function renderTree(
    nodes: TreeNode[],
    prefix: string = "",
    isLast: boolean = true,
    showSize: boolean = false
): string {
    let output = "";

    nodes.forEach((node, index) => {
        const isLastNode = index === nodes.length - 1;
        const connector = isLastNode ? "└── " : "├── ";
        const sizeStr =
            showSize && node.size !== undefined
                ? pc.dim(` (${formatSize(node.size)})`)
                : "";

        if (node.type === "directory") {
            output += `${prefix}${connector}${pc.blue(node.name)}/\n`;
            if (node.children && node.children.length > 0) {
                const newPrefix = prefix + (isLastNode ? "    " : "│   ");
                output += renderTree(node.children, newPrefix, isLastNode, showSize);
            }
        } else {
            output += `${prefix}${connector}${node.name}${sizeStr}\n`;
        }
    });

    return output;
}

// Create a box around text
export function createBox(
    title: string,
    content: string[],
    width: number = 60
): string {
    const lines: string[] = [];
    const innerWidth = width - 4;

    // Top border
    lines.push(pc.dim("┌" + "─".repeat(width - 2) + "┐"));

    // Title
    const titlePadding = Math.max(0, innerWidth - stripAnsi(title).length);
    lines.push(pc.dim("│") + "  " + title + " ".repeat(titlePadding) + pc.dim("│"));

    // Separator
    lines.push(pc.dim("├" + "─".repeat(width - 2) + "┤"));

    // Content
    for (const line of content) {
        const stripped = stripAnsi(line);
        const padding = Math.max(0, innerWidth - stripped.length);
        lines.push(pc.dim("│") + "  " + line + " ".repeat(padding) + pc.dim("│"));
    }

    // Bottom border
    lines.push(pc.dim("└" + "─".repeat(width - 2) + "┘"));

    return lines.join("\n");
}

// Strip ANSI codes for length calculation
function stripAnsi(str: string): string {
    return str.replace(
        /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g,
        ""
    );
}

// Pad string to width
export function padEnd(str: string, width: number): string {
    const stripped = stripAnsi(str);
    const padding = Math.max(0, width - stripped.length);
    return str + " ".repeat(padding);
}

// Truncate string
export function truncate(str: string, maxLength: number): string {
    if (str.length <= maxLength) return str;
    return str.slice(0, maxLength - 3) + "...";
}

// Create table
export function createTable(
    headers: string[],
    rows: string[][],
    columnWidths: number[]
): string {
    const lines: string[] = [];

    // Top border
    const topBorder =
        "┌" +
        columnWidths.map((w) => "─".repeat(w + 2)).join("┬") +
        "┐";
    lines.push(pc.dim(topBorder));

    // Header row
    const headerRow =
        pc.dim("│") +
        headers
            .map((h, i) => " " + pc.bold(padEnd(h, columnWidths[i])) + " ")
            .join(pc.dim("│")) +
        pc.dim("│");
    lines.push(headerRow);

    // Header separator
    const headerSep =
        "├" +
        columnWidths.map((w) => "─".repeat(w + 2)).join("┼") +
        "┤";
    lines.push(pc.dim(headerSep));

    // Data rows
    for (const row of rows) {
        const dataRow =
            pc.dim("│") +
            row
                .map((cell, i) => " " + padEnd(cell, columnWidths[i]) + " ")
                .join(pc.dim("│")) +
            pc.dim("│");
        lines.push(dataRow);
    }

    // Bottom border
    const bottomBorder =
        "└" +
        columnWidths.map((w) => "─".repeat(w + 2)).join("┴") +
        "┘";
    lines.push(pc.dim(bottomBorder));

    return lines.join("\n");
}

// Detect package manager
export async function detectPackageManager(
    dir: string
): Promise<"npm" | "yarn" | "pnpm" | "bun" | null> {
    if (await fs.pathExists(path.join(dir, "bun.lockb"))) return "bun";
    if (await fs.pathExists(path.join(dir, "pnpm-lock.yaml"))) return "pnpm";
    if (await fs.pathExists(path.join(dir, "yarn.lock"))) return "yarn";
    if (await fs.pathExists(path.join(dir, "package-lock.json"))) return "npm";
    if (await fs.pathExists(path.join(dir, "package.json"))) return "npm";
    return null;
}

// Parse dependencies from file content (basic implementation)
export function detectDependencies(
    content: string,
    filename: string
): string[] {
    const deps: Set<string> = new Set();

    // TypeScript/JavaScript imports
    if (
        filename.endsWith(".ts") ||
        filename.endsWith(".tsx") ||
        filename.endsWith(".js") ||
        filename.endsWith(".jsx")
    ) {
        // import ... from "package"
        const importRegex = /import\s+.*?\s+from\s+['"]([^'"./][^'"]*)['"]/g;
        let match;
        while ((match = importRegex.exec(content)) !== null) {
            const pkg = match[1].split("/")[0];
            if (!pkg.startsWith("@")) {
                deps.add(pkg);
            } else {
                // Scoped package
                const parts = match[1].split("/");
                if (parts.length >= 2) {
                    deps.add(`${parts[0]}/${parts[1]}`);
                }
            }
        }

        // require("package")
        const requireRegex = /require\s*\(\s*['"]([^'"./][^'"]*)['"]\s*\)/g;
        while ((match = requireRegex.exec(content)) !== null) {
            const pkg = match[1].split("/")[0];
            if (!pkg.startsWith("@")) {
                deps.add(pkg);
            } else {
                const parts = match[1].split("/");
                if (parts.length >= 2) {
                    deps.add(`${parts[0]}/${parts[1]}`);
                }
            }
        }
    }

    // Python imports (basic)
    if (filename.endsWith(".py")) {
        const importRegex = /^(?:from|import)\s+(\w+)/gm;
        let match;
        while ((match = importRegex.exec(content)) !== null) {
            const pkg = match[1];
            // Skip standard library modules (basic check)
            if (!["os", "sys", "json", "re", "typing", "dataclasses"].includes(pkg)) {
                deps.add(pkg);
            }
        }
    }

    return Array.from(deps);
}
