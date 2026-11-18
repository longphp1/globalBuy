import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { generateWebsite } from "@/lib/admin/generate";

type GitResult = { description: string; output: string };

function stamp() {
  const date = new Date();
  const part = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${part(date.getMonth() + 1)}-${part(date.getDate())} ${part(date.getHours())}:${part(date.getMinutes())}:${part(date.getSeconds())}`;
}

function runGit(args: string[], description: string, timeout = 120000): Promise<GitResult> {
  const cwd = process.cwd();
  return new Promise((resolve, reject) => {
    execFile(
      "git",
      args,
      {
        cwd,
        timeout,
        maxBuffer: 10 * 1024 * 1024,
        env: {
          ...process.env,
          GIT_TERMINAL_PROMPT: "0",
          GIT_MERGE_AUTOEDIT: "no",
          GIT_EDITOR: "true",
        },
      },
      (error, stdout, stderr) => {
        const output = `${stdout ?? ""}${stderr ?? ""}`.trim();
        if (error) {
          const killed = "killed" in error && error.killed;
          reject(new Error(`${description} failed${killed ? " (timed out)" : ""}: ${output || error.message}`));
          return;
        }
        resolve({ description, output });
      },
    );
  });
}

async function syncMain() {
  if (!fs.existsSync(path.join(process.cwd(), ".git"))) {
    throw new Error("This directory is not a git repository, so the website cannot be updated");
  }
  const steps: Array<[string[], string]> = [
    [["reset", "--hard", "HEAD"], "Reset the local repository to the latest commit"],
    [["clean", "-fd"], "Remove untracked files"],
    [["checkout", "main"], "Switch to branch main"],
    [["clean", "-fd"], "Remove untracked files"],
    [["pull", "--no-edit", "origin", "main"], "Pull the latest code from the remote repository"],
  ];
  const done: GitResult[] = [];
  for (const [args, description] of steps) {
    done.push(await runGit(args, description));
  }
  return done;
}

async function commitAndPush() {
  await runGit(["add", "."], "Stage all changes");
  const status = await runGit(["status", "--porcelain"], "Check for changes");
  if (!status.output) {
    return { committed: false, pushed: false, commit: "" };
  }
  const commit = `System auto push platform code time:${stamp()}`;
  await runGit(["commit", "-m", commit], "Commit changes to the local repository");
  await runGit(["push", "origin", "main"], "Push to the remote repository", 180000);
  return { committed: true, pushed: true, commit };
}

export async function publishWebsite() {
  if (process.env.VERCEL) {
    const generated = await generateWebsite();
    return {
      ...generated,
      committed: false,
      pushed: false,
      commit: "",
      message: `Updated ${generated.sites} sites and ${generated.products} products`,
    };
  }
  await syncMain();
  let generated: Awaited<ReturnType<typeof generateWebsite>>;
  try {
    generated = await generateWebsite();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Website generation failed";
    throw new Error(`Code is synced to main. Website generation failed: ${message}`);
  }
  try {
    const published = await commitAndPush();
    const summary = `Updated ${generated.sites} sites and ${generated.products} products`;
    return {
      ...generated,
      ...published,
      message: published.pushed ? `${summary}, and pushed to main` : `${summary}. No new code to push`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Commit failed";
    throw new Error(`Website generated (${generated.sites} sites, ${generated.products} products). Push failed: ${message}`);
  }
}
