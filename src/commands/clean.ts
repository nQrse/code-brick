import * as p from "@clack/prompts";
import pc from "picocolors";
import fs from "fs-extra";
import path from "path";
import {
    isInitialized,
    getTemplatePath,
    getTemplate,
    loadTemplateMetadata,
    saveTemplateMetadata,
    resolveTemplateName,
} from "../lib/storage.js";

interface CleanOptions {
    pattern?: string;
    dryRun?: boolean;
    keepExternal?: boolean;
}

// Common patterns for local imports by file extension
const LOCAL_IMPORT_PATTERNS: Record<string, RegExp[]> = {
    // Dart/Flutter: package:project_name/... imports
    ".dart": [
        /^import\s+['"]package:[^\/]+\/[^'"]+['"]\s*;?\s*$/gm,
        /^export\s+['"]package:[^\/]+\/[^'"]+['"]\s*;?\s*$/gm,
    ],
    // TypeScript/JavaScript: relative imports
    ".ts": [
        /^import\s+.*from\s+['"]\.\.?\/[^'"]+['"]\s*;?\s*$/gm,
        /^import\s+['"]\.\.?\/[^'"]+['"]\s*;?\s*$/gm,
        /^export\s+.*from\s+['"]\.\.?\/[^'"]+['"]\s*;?\s*$/gm,
    ],
    ".tsx": [
        /^import\s+.*from\s+['"]\.\.?\/[^'"]+['"]\s*;?\s*$/gm,
        /^import\s+['"]\.\.?\/[^'"]+['"]\s*;?\s*$/gm,
        /^export\s+.*from\s+['"]\.\.?\/[^'"]+['"]\s*;?\s*$/gm,
    ],
    ".js": [
        /^import\s+.*from\s+['"]\.\.?\/[^'"]+['"]\s*;?\s*$/gm,
        /^import\s+['"]\.\.?\/[^'"]+['"]\s*;?\s*$/gm,
        /^export\s+.*from\s+['"]\.\.?\/[^'"]+['"]\s*;?\s*$/gm,
        /^const\s+\w+\s*=\s*require\s*\(\s*['"]\.\.?\/[^'"]+['"]\s*\)\s*;?\s*$/gm,
    ],
    ".jsx": [
        /^import\s+.*from\s+['"]\.\.?\/[^'"]+['"]\s*;?\s*$/gm,
        /^import\s+['"]\.\.?\/[^'"]+['"]\s*;?\s*$/gm,
        /^export\s+.*from\s+['"]\.\.?\/[^'"]+['"]\s*;?\s*$/gm,
    ],
    // Python: relative imports
    ".py": [
        /^from\s+\.\S*\s+import\s+.*$/gm,
        /^import\s+\.\S+.*$/gm,
    ],
    // Go: project-specific imports (anything not from standard lib or known packages)
    ".go": [
        // Will be handled with custom pattern
    ],
    // Rust: crate-relative imports
    ".rs": [
        /^use\s+crate::.*;\s*$/gm,
        /^use\s+super::.*;\s*$/gm,
    ],
    // Swift: no standard local import pattern, handled by custom pattern
    ".swift": [],
    // Kotlin: project-specific imports
    ".kt": [],
};

// External package prefixes to keep (not remove)
const EXTERNAL_PREFIXES: Record<string, string[]> = {
    ".dart": [
        "package:flutter/",
        "package:flutter_",
        "package:dart:",
        "package:go_router/",
        "package:dio/",
        "package:http/",
        "package:provider/",
        "package:bloc/",
        "package:flutter_bloc/",
        "package:get/",
        "package:riverpod/",
        "package:hooks_riverpod/",
        "package:freezed_annotation/",
        "package:json_annotation/",
        "package:equatable/",
        "package:dartz/",
        "package:injectable/",
        "package:get_it/",
        "package:shared_preferences/",
        "package:path_provider/",
        "package:sqflite/",
        "package:hive/",
        "package:firebase_",
        "package:cloud_firestore/",
        "package:intl/",
        "package:cached_network_image/",
        "package:image_picker/",
        "package:url_launcher/",
        "package:connectivity",
        "package:permission_handler/",
        "package:auto_route/",
        "package:mockito/",
        "package:test/",
        "package:flutter_test/",
    ],
};

function isExternalImport(line: string, ext: string): boolean {
    const prefixes = EXTERNAL_PREFIXES[ext] || [];
    return prefixes.some((prefix) => line.includes(prefix));
}

function detectProjectName(templatePath: string): string | null {
    // Try to detect from pubspec.yaml (Flutter/Dart)
    const pubspecPath = path.join(templatePath, "pubspec.yaml");
    if (fs.existsSync(pubspecPath)) {
        try {
            const content = fs.readFileSync(pubspecPath, "utf-8");
            const match = content.match(/^name:\s*(\S+)/m);
            if (match) return match[1];
        } catch { }
    }

    // Try to detect from package.json (Node.js)
    const packageJsonPath = path.join(templatePath, "package.json");
    if (fs.existsSync(packageJsonPath)) {
        try {
            const content = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
            if (content.name) return content.name.replace(/^@[^/]+\//, "");
        } catch { }
    }

    // Try to detect from setup.py or pyproject.toml (Python)
    const pyprojectPath = path.join(templatePath, "pyproject.toml");
    if (fs.existsSync(pyprojectPath)) {
        try {
            const content = fs.readFileSync(pyprojectPath, "utf-8");
            const match = content.match(/name\s*=\s*["']([^"']+)["']/);
            if (match) return match[1];
        } catch { }
    }

    return null;
}

function cleanFileContent(
    content: string,
    ext: string,
    customPattern?: string,
    projectName?: string,
    keepExternal: boolean = true
): { cleaned: string; removedCount: number } {
    let cleaned = content;
    let removedCount = 0;
    const lines = content.split("\n");
    const cleanedLines: string[] = [];

    for (const line of lines) {
        let shouldRemove = false;

        // Check custom pattern first
        if (customPattern) {
            const regex = new RegExp(customPattern);
            if (regex.test(line)) {
                shouldRemove = true;
            }
        }

        // Check project-specific imports for Dart
        if (!shouldRemove && ext === ".dart" && projectName) {
            const projectImportPattern = new RegExp(
                `^(import|export)\\s+['"]package:${projectName}/`
            );
            if (projectImportPattern.test(line.trim())) {
                // Check if it's an external package we should keep
                if (keepExternal && isExternalImport(line, ext)) {
                    shouldRemove = false;
                } else {
                    shouldRemove = true;
                }
            }
        }

        // Check built-in patterns
        if (!shouldRemove) {
            const patterns = LOCAL_IMPORT_PATTERNS[ext] || [];
            for (const pattern of patterns) {
                // Reset regex lastIndex
                pattern.lastIndex = 0;
                if (pattern.test(line.trim())) {
                    if (keepExternal && isExternalImport(line, ext)) {
                        shouldRemove = false;
                    } else {
                        shouldRemove = true;
                    }
                    break;
                }
            }
        }

        if (shouldRemove) {
            removedCount++;
            // Add empty line or skip entirely based on context
        } else {
            cleanedLines.push(line);
        }
    }

    // Clean up multiple consecutive empty lines
    cleaned = cleanedLines.join("\n").replace(/\n{3,}/g, "\n\n");

    return { cleaned, removedCount };
}

export async function cleanCommand(
    nameOrIndex: string,
    options: CleanOptions
): Promise<void> {
    p.intro(pc.cyan("🧹 Cleaning template imports"));

    // Check if initialized
    if (!(await isInitialized())) {
        p.log.error(
            "CodeBrick is not initialized. Run " + pc.cyan("brick init") + " first."
        );
        process.exit(1);
    }

    // Resolve template name
    const name = await resolveTemplateName(nameOrIndex);
    if (!name) {
        p.log.error(
            `Template '${nameOrIndex}' not found. Run ${pc.cyan("brick list")} to see available templates.`
        );
        process.exit(1);
    }

    const template = await getTemplate(name);
    if (!template) {
        p.log.error(`Template '${name}' not found.`);
        process.exit(1);
    }

    if (template.type === "remote") {
        p.log.error(
            "Cannot clean remote templates. Use " +
            pc.cyan(`brick pull ${name}`) +
            " to convert to local first."
        );
        process.exit(1);
    }

    const templatePath = getTemplatePath(name);
    const metadata = await loadTemplateMetadata(name);

    if (!metadata) {
        p.log.error("Failed to load template metadata.");
        process.exit(1);
    }

    // Detect project name
    const projectName = detectProjectName(templatePath);
    if (projectName) {
        p.log.info(`Detected project name: ${pc.cyan(projectName)}`);
    }

    // If custom pattern provided, use it
    if (options.pattern) {
        p.log.info(`Using custom pattern: ${pc.cyan(options.pattern)}`);
    }

    // Analyze files
    const filesToClean: { file: string; ext: string; removals: number }[] = [];
    let totalRemovals = 0;

    for (const file of metadata.files) {
        const ext = path.extname(file).toLowerCase();
        const filePath = path.join(templatePath, file);

        // Skip non-code files
        if (!LOCAL_IMPORT_PATTERNS[ext] && !options.pattern) continue;

        try {
            const content = await fs.readFile(filePath, "utf-8");
            const { removedCount } = cleanFileContent(
                content,
                ext,
                options.pattern,
                projectName || undefined,
                options.keepExternal !== false
            );

            if (removedCount > 0) {
                filesToClean.push({ file, ext, removals: removedCount });
                totalRemovals += removedCount;
            }
        } catch {
            // Skip files that can't be read
        }
    }

    if (filesToClean.length === 0) {
        p.log.info("No local imports found to clean.");
        p.outro("Template is already clean! ✓");
        return;
    }

    // Show what will be cleaned
    console.log();
    console.log(pc.bold(`  Files to clean:`));
    for (const { file, removals } of filesToClean.slice(0, 15)) {
        console.log(`    ${pc.yellow(file)} ${pc.dim(`(${removals} imports)`)}`);
    }
    if (filesToClean.length > 15) {
        console.log(pc.dim(`    ... and ${filesToClean.length - 15} more files`));
    }
    console.log();
    console.log(
        `  Total: ${pc.red(totalRemovals.toString())} local imports to remove`
    );
    console.log();

    if (options.dryRun) {
        p.log.info(pc.yellow("Dry run - no changes made"));
        p.outro("Run without --dry-run to apply changes");
        return;
    }

    // Confirm
    const confirmed = await p.confirm({
        message: `Remove ${totalRemovals} local imports from ${filesToClean.length} files?`,
        initialValue: true,
    });

    if (p.isCancel(confirmed) || !confirmed) {
        p.cancel("Operation cancelled");
        process.exit(0);
    }

    // Clean files
    const spinner = p.spinner();
    spinner.start("Cleaning imports...");

    let cleanedFiles = 0;
    for (const { file, ext } of filesToClean) {
        const filePath = path.join(templatePath, file);
        try {
            const content = await fs.readFile(filePath, "utf-8");
            const { cleaned } = cleanFileContent(
                content,
                ext,
                options.pattern,
                projectName || undefined,
                options.keepExternal !== false
            );
            await fs.writeFile(filePath, cleaned, "utf-8");
            cleanedFiles++;
        } catch {
            // Skip files that can't be processed
        }
    }

    // Update metadata
    metadata.updatedAt = new Date().toISOString();
    await saveTemplateMetadata(name, metadata);

    spinner.stop(`Cleaned ${cleanedFiles} files`);

    console.log();
    console.log(`  ${pc.green("✓")} Removed ${totalRemovals} local imports`);
    console.log();

    p.outro("Template cleaned successfully! ✓");
}
