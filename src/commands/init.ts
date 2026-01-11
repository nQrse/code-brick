import * as p from "@clack/prompts";
import pc from "picocolors";
import {
  isInitialized,
  initializeStorage,
  CODEBRICK_DIR,
} from "../lib/storage.js";

export async function initCommand(): Promise<void> {
  p.intro(pc.cyan("🧱 CodeBrick"));

  const alreadyInitialized = await isInitialized();

  if (alreadyInitialized) {
    p.log.warn("CodeBrick is already initialized!");
    p.log.info(`Storage location: ${pc.dim(CODEBRICK_DIR)}`);
    p.outro("Run " + pc.cyan("brick list") + " to see your templates");
    return;
  }

  const spinner = p.spinner();
  spinner.start("Initializing CodeBrick...");

  try {
    await initializeStorage();
    spinner.stop("CodeBrick initialized successfully!");

    console.log();
    console.log(`  Storage location: ${pc.dim(CODEBRICK_DIR)}`);
    console.log();
    console.log(pc.bold("  Quick Start:"));
    console.log(
      `    ${pc.cyan("brick save")} my-auth ./src/auth    Save a template`
    );
    console.log(
      `    ${pc.cyan("brick list")}                       View all templates`
    );
    console.log(
      `    ${pc.cyan("brick apply")} my-auth              Apply to current project`
    );
    console.log();

    p.outro("Happy templating! 🎉");
  } catch (error) {
    spinner.stop("Failed to initialize CodeBrick");
    p.log.error(
      error instanceof Error ? error.message : "Unknown error occurred"
    );
    process.exit(1);
  }
}
