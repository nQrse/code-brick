import fs from "fs-extra";
import path from "path";
import * as tar from "tar";
import pc from "picocolors";
import * as p from "@clack/prompts";
import {
    isInitialized,
    templateExists,
    getTemplatePath,
    addTemplateToStore,
    saveTemplateMetadata,
    LocalTemplate,
    BrickMetadata,
} from "../lib/storage.js";

interface ImportOptions {
    name?: string;
    force?: boolean;
}

export async function importCommand(
    filePath: string,
    options: ImportOptions
): Promise<void> {
    // Check if initialized
    if (!(await isInitialized())) {
        console.log(pc.red("CodeBrick is not initialized. Run: brick init"));
        process.exit(1);
    }

    // Resolve file path
    const absolutePath = path.resolve(filePath);

    // Check if file exists
    if (!(await fs.pathExists(absolutePath))) {
        console.log(pc.red(`File not found: ${absolutePath}`));
        process.exit(1);
    }

    // Validate file extension
    if (!absolutePath.endsWith(".brick")) {
        console.log(pc.yellow("⚠ Warning: File does not have .brick extension"));
    }

    console.log(pc.cyan("┌ 🧱 Importing template"));
    console.log(pc.gray(`│  ● File: ${pc.white(absolutePath)}`));

    try {
        // Create temp directory for extraction
        const tempDir = path.join(
            process.cwd(),
            `.brick-import-${Date.now()}`
        );
        await fs.ensureDir(tempDir);

        try {
            // Extract archive
            await tar.extract({
                file: absolutePath,
                cwd: tempDir,
            });

            // Read metadata
            const metadataPath = path.join(tempDir, "brick.json");
            if (!(await fs.pathExists(metadataPath))) {
                throw new Error("Invalid .brick file: missing brick.json metadata");
            }

            const metadata: BrickMetadata = await fs.readJson(metadataPath);

            // Determine template name
            let templateName = options.name || metadata.name;

            console.log(pc.gray(`│  ● Template: ${pc.white(templateName)}`));
            console.log(pc.gray(`│  ● Description: ${pc.white(metadata.description || "No description")}`));
            console.log(pc.gray(`│  ● Files: ${pc.white(metadata.files.length.toString())} files`));

            // Check if template exists
            if (await templateExists(templateName)) {
                if (options.force) {
                    console.log(pc.yellow(`│  ⚠ Overwriting existing template '${templateName}'`));
                } else {
                    console.log(pc.gray("│"));
                    const shouldOverwrite = await p.confirm({
                        message: `Template '${templateName}' already exists. Overwrite?`,
                    });

                    if (p.isCancel(shouldOverwrite) || !shouldOverwrite) {
                        // Prompt for new name
                        const newName = await p.text({
                            message: "Enter a new name for the template:",
                            placeholder: `${templateName}-imported`,
                            validate: (value) => {
                                if (!value) return "Name is required";
                                if (!/^[a-z0-9-_]+$/i.test(value)) {
                                    return "Name can only contain letters, numbers, hyphens, and underscores";
                                }
                            },
                        });

                        if (p.isCancel(newName)) {
                            console.log(pc.yellow("│  Import cancelled"));
                            console.log(pc.cyan("└"));
                            await fs.remove(tempDir);
                            return;
                        }

                        templateName = newName as string;
                        console.log(pc.gray(`│  ● New name: ${pc.white(templateName)}`));
                    }
                }
            }

            // Copy template files to destination
            const templateDir = getTemplatePath(templateName);
            const sourceTemplateDir = path.join(tempDir, "template");

            // Remove existing template directory if overwriting
            if (await fs.pathExists(templateDir)) {
                await fs.remove(templateDir);
            }

            // Check if source template directory exists
            if (await fs.pathExists(sourceTemplateDir)) {
                await fs.copy(sourceTemplateDir, templateDir);
            } else {
                // Fallback: copy everything except brick.json
                await fs.ensureDir(templateDir);
                const entries = await fs.readdir(tempDir);
                for (const entry of entries) {
                    if (entry !== "brick.json") {
                        await fs.copy(
                            path.join(tempDir, entry),
                            path.join(templateDir, entry)
                        );
                    }
                }
            }

            // Update metadata with new name and import info
            const now = new Date().toISOString();
            const updatedMetadata: BrickMetadata = {
                ...metadata,
                name: templateName,
                updatedAt: now,
                source: {
                    origin: "local",
                    path: `imported from ${path.basename(absolutePath)}`,
                },
            };

            // Save metadata
            await saveTemplateMetadata(templateName, updatedMetadata);

            // Add to store
            const storeEntry: LocalTemplate = {
                type: "local",
                path: templateDir,
                description: metadata.description || "",
                tags: metadata.tags || [],
                createdAt: metadata.createdAt || now,
                updatedAt: now,
            };

            await addTemplateToStore(templateName, storeEntry);

            console.log(pc.gray("│"));
            console.log(pc.green(`│  ◇ Import complete!`));
            console.log(pc.gray("│"));
            console.log(pc.gray(`│  View structure: ${pc.cyan(`brick tree ${templateName}`)}`));
            console.log(pc.gray(`│  Apply template: ${pc.cyan(`brick apply ${templateName}`)}`));
            console.log(pc.cyan("└"));
            console.log();
            console.log(pc.green(`✓ Template '${templateName}' imported successfully!`));
        } finally {
            // Cleanup temp directory
            await fs.remove(tempDir);
        }
    } catch (error) {
        console.log(pc.red(`│  ✗ Import failed: ${(error as Error).message}`));
        console.log(pc.cyan("└"));
        process.exit(1);
    }
}
