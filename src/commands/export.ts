import fs from "fs-extra";
import path from "path";
import archiver from "archiver";
import pc from "picocolors";
import {
    isInitialized,
    resolveTemplateName,
    getTemplate,
    getTemplatePath,
    loadTemplateMetadata,
} from "../lib/storage.js";

interface ExportOptions {
    output?: string;
}

export async function exportCommand(
    templateNameOrIndex: string,
    options: ExportOptions
): Promise<void> {
    // Check if initialized
    if (!(await isInitialized())) {
        console.log(pc.red("CodeBrick is not initialized. Run: brick init"));
        process.exit(1);
    }

    // Resolve template name
    const templateName = await resolveTemplateName(templateNameOrIndex);
    if (!templateName) {
        console.log(pc.red(`Template '${templateNameOrIndex}' not found`));
        process.exit(1);
    }

    // Get template info
    const template = await getTemplate(templateName);
    if (!template) {
        console.log(pc.red(`Template '${templateName}' not found`));
        process.exit(1);
    }

    // Only local templates can be exported
    if (template.type !== "local") {
        console.log(
            pc.red("Only local templates can be exported. Remote templates must be pulled first.")
        );
        process.exit(1);
    }

    const templatePath = getTemplatePath(templateName);

    // Check if template directory exists
    if (!(await fs.pathExists(templatePath))) {
        console.log(pc.red(`Template files not found at: ${templatePath}`));
        process.exit(1);
    }

    // Load metadata
    const metadata = await loadTemplateMetadata(templateName);
    if (!metadata) {
        console.log(pc.red("Template metadata not found"));
        process.exit(1);
    }

    // Determine output path
    const outputFileName = `${templateName}.brick`;
    const outputPath = options.output
        ? path.resolve(options.output)
        : path.join(process.cwd(), outputFileName);

    // Ensure output directory exists
    await fs.ensureDir(path.dirname(outputPath));

    console.log(pc.cyan("┌ 🧱 Exporting template"));
    console.log(pc.gray(`│  ● Template: ${pc.white(templateName)}`));
    console.log(pc.gray(`│  ● Files: ${pc.white(metadata.files.length.toString())} files`));
    console.log(pc.gray(`│  ● Output: ${pc.white(outputPath)}`));

    try {
        await createBrickArchive(templatePath, outputPath, metadata);

        const stats = await fs.stat(outputPath);
        const sizeKB = (stats.size / 1024).toFixed(2);

        console.log(pc.gray("│"));
        console.log(pc.green(`│  ◇ Export complete!`));
        console.log(pc.gray(`│    Size: ${pc.white(sizeKB + " KB")}`));
        console.log(pc.gray("│"));
        console.log(pc.gray(`│  Share this file and import with:`));
        console.log(pc.cyan(`│    brick import ${outputFileName}`));
        console.log(pc.cyan("└"));
        console.log();
        console.log(pc.green(`✓ Template '${templateName}' exported to ${outputPath}`));
    } catch (error) {
        console.log(pc.red(`│  ✗ Export failed: ${(error as Error).message}`));
        console.log(pc.cyan("└"));
        process.exit(1);
    }
}

async function createBrickArchive(
    templatePath: string,
    outputPath: string,
    metadata: any
): Promise<void> {
    return new Promise((resolve, reject) => {
        const output = fs.createWriteStream(outputPath);
        const archive = archiver("tar", {
            gzip: true,
            gzipOptions: { level: 9 },
        });

        output.on("close", () => resolve());
        output.on("error", (err) => reject(err));
        archive.on("error", (err) => reject(err));
        archive.on("warning", (err) => {
            if (err.code !== "ENOENT") {
                reject(err);
            }
        });

        archive.pipe(output);

        // Add all template files (excluding brick.json, we'll add it separately)
        archive.directory(templatePath, "template", (entry) => {
            // Skip the brick.json file - we'll add our own
            if (entry.name === "brick.json") {
                return false;
            }
            return entry;
        });

        // Add metadata as a separate file at root level
        const metadataBuffer = Buffer.from(JSON.stringify(metadata, null, 2));
        archive.append(metadataBuffer, { name: "brick.json" });

        archive.finalize();
    });
}
