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
          reject(new Error(`${description}失败${killed ? "（超时）" : ""}: ${output || error.message}`));
          return;
        }
        resolve({ description, output });
      },
    );
  });
}

async function syncMain() {
  if (!fs.existsSync(path.join(process.cwd(), ".git"))) {
    throw new Error("当前目录不是 git 仓库，无法更新网站");
  }
  const steps: Array<[string[], string]> = [
    [["reset", "--hard", "HEAD"], "重置本地仓库到最新提交"],
    [["clean", "-fd"], "清除本地未跟踪文件"],
    [["checkout", "main"], "切换到分支 main"],
    [["clean", "-fd"], "清除本地未跟踪文件"],
    [["pull", "--no-edit", "origin", "main"], "拉取远程仓库最新代码"],
  ];
  const done: GitResult[] = [];
  for (const [args, description] of steps) {
    done.push(await runGit(args, description));
  }
  return done;
}

async function commitAndPush() {
  await runGit(["add", "."], "添加所有更改到暂存区");
  const status = await runGit(["status", "--porcelain"], "检查变更");
  if (!status.output) {
    return { committed: false, pushed: false, commit: "" };
  }
  const commit = `System auto push platform code time:${stamp()}`;
  await runGit(["commit", "-m", commit], "提交更改到本地仓库");
  await runGit(["push", "origin", "main"], "推送到远程仓库", 180000);
  return { committed: true, pushed: true, commit };
}

export async function publishWebsite() {
  await syncMain();
  let generated: Awaited<ReturnType<typeof generateWebsite>>;
  try {
    generated = await generateWebsite();
  } catch (error) {
    const message = error instanceof Error ? error.message : "生成网站失败";
    throw new Error(`代码已同步到 main，生成网站失败: ${message}`);
  }
  try {
    const published = await commitAndPush();
    const summary = `已更新 ${generated.sites} 个网站、${generated.products} 个商品`;
    return {
      ...generated,
      ...published,
      message: published.pushed ? `${summary}，并已推送到 main` : `${summary}，没有新的代码需要推送`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "提交失败";
    throw new Error(`网站已生成（${generated.sites} 个网站、${generated.products} 个商品），推送失败: ${message}`);
  }
}
