import * as p from "@clack/prompts";
import pc from "picocolors";
import fs from "fs-extra";
import path from "path";
import fg from "fast-glob";
import {
  isInitialized,
  templateExists,
  getTemplatePath,
  addTemplateToStore,
  saveTemplateMetadata,
  LocalTemplate,
  BrickMetadata,
} from "../lib/storage.js";
import {
  getFilesRecursive,
  getDirectoryStats,
  detectDependencies,
} from "../lib/utils.js";

interface SaveOptions {
  description?: string;
  tags?: string;
  include?: string;
  exclude?: string;
  detectDeps?: boolean;
}

export async function saveCommand(
  name: string,
  sourcePath: string | undefined,
  options: SaveOptions
): Promise<void> {
  p.intro(pc.cyan("🧱 Saving template"));

  // Check if initialized
  if (!(await isInitialized())) {
    p.log.error(
      "CodeBrick is not initialized. Run " + pc.cyan("brick init") + " first."
    );
    process.exit(1);
  }

  // Resolve source path
  const resolvedPath = sourcePath
    ? path.resolve(sourcePath)
    : process.cwd();

  // Validate source path exists
  if (!(await fs.pathExists(resolvedPath))) {
    p.log.error(`Path does not exist: ${resolvedPath}`);
    process.exit(1);
  }

  // Check if it's a directory
  const stat = await fs.stat(resolvedPath);
  if (!stat.isDirectory()) {
    p.log.error("Source path must be a directory");
    process.exit(1);
  }

  // Check if template already exists
  if (await templateExists(name)) {
    const shouldOverwrite = await p.confirm({
      message: `Template '${name}' already exists. Overwrite?`,
      initialValue: false,
    });

    if (p.isCancel(shouldOverwrite) || !shouldOverwrite) {
      p.cancel("Operation cancelled");
      process.exit(0);
    }

    // Remove existing template
    const existingPath = getTemplatePath(name);
    await fs.remove(existingPath);
  }

  // Get files to include
  let files: string[];
  
  if (options.include) {
    // Use glob patterns
    const patterns = options.include.split(",").map((p) => p.trim());
    files = await fg(patterns, {
      cwd: resolvedPath,
      dot: false,
      ignore: options.exclude?.split(",").map((p) => p.trim()) || [],
    });
  } else {
    // Get all files
    files = await getFilesRecursive(resolvedPath);
    
    // Apply exclude patterns if provided
    if (options.exclude) {
      const excludePatterns = options.exclude.split(",").map((p) => p.trim());
      const excluded = await fg(excludePatterns, {
        cwd: resolvedPath,
        dot: false,
      });
      const excludeSet = new Set(excluded);
      files = files.filter((f) => !excludeSet.has(f));
    }
  }

  if (files.length === 0) {
    p.log.error("No files found in the specified path");
    process.exit(1);
  }

  // Display source info
  const stats = await getDirectoryStats(resolvedPath);
  p.log.info(`Source: ${pc.dim(resolvedPath)}`);
  p.log.info(
    `Files: ${pc.green(files.length.toString())} files` +
      (stats.directories > 0 ? `, ${stats.directories} directories` : "")
  );

  // Detect dependencies if requested
  let detectedDeps: string[] = [];
  if (options.detectDeps) {
    const spinner = p.spinner();
    spinner.start("Detecting dependencies...");

    for (const file of files) {
      const filePath = path.join(resolvedPath, file);
      try {
        const content = await fs.readFile(filePath, "utf-8");
        const deps = detectDependencies(content, file);
        detectedDeps.push(...deps);
      } catch {
        // Skip files that can't be read as text
      }
    }

    // Remove duplicates
    detectedDeps = [...new Set(detectedDeps)];
    spinner.stop(`Detected ${detectedDeps.length} dependencies`);

    if (detectedDeps.length > 0) {
      p.log.info(`Dependencies: ${pc.dim(detectedDeps.join(", "))}`);

      const addDeps = await p.confirm({
        message: "Add these to template metadata?",
        initialValue: true,
      });

      if (p.isCancel(addDeps)) {
        p.cancel("Operation cancelled");
        process.exit(0);
      }

      if (!addDeps) {
        detectedDeps = [];
      }
    }
  }

  // Get description
  let description = options.description;
  if (!description) {
    const descInput = await p.text({
      message: "Template description (optional):",
      placeholder: "A reusable code template",
    });

    if (p.isCancel(descInput)) {
      p.cancel("Operation cancelled");
      process.exit(0);
    }

    description = descInput || "";
  }

  // Parse tags
  const tags = options.tags
    ? options.tags.split(",").map((t) => t.trim()).filter(Boolean)
    : [];

  // Copy files
  const spinner = p.spinner();
  spinner.start("Copying files...");

  const templatePath = getTemplatePath(name);
  await fs.ensureDir(templatePath);

  for (const file of files) {
    const sourcefile = path.join(resolvedPath, file);
    const destFile = path.join(templatePath, file);
    await fs.ensureDir(path.dirname(destFile));
    await fs.copy(sourcefile, destFile);
  }

  // Create metadata
  const now = new Date().toISOString();
  const metadata: BrickMetadata = {
    name,
    type: "local",
    version: "1.0.0",
    description: description || "",
    createdAt: now,
    updatedAt: now,
    source: {
      origin: "local",
      path: resolvedPath,
    },
    files,
    tags,
  };

  // Add detected dependencies
  if (detectedDeps.length > 0) {
    metadata.dependencies = {};
    for (const dep of detectedDeps) {
      metadata.dependencies[dep] = "*";
    }
  }

  // Save metadata
  await saveTemplateMetadata(name, metadata);

  // Update store
  const template: LocalTemplate = {
    type: "local",
    path: `templates/${name}`,
    description: description || "",
    tags,
    createdAt: now,
    updatedAt: now,
  };

  await addTemplateToStore(name, template);

  spinner.stop("Template saved!");

  console.log();
  console.log(`  View structure: ${pc.cyan(`brick tree ${name}`)}`);
  console.log(`  Apply template: ${pc.cyan(`brick apply ${name}`)}`);
  console.log();

  p.outro(`Template '${pc.green(name)}' saved successfully!`);
}
