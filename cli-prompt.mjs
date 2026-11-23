import { readFileSync } from "node:fs";

const [caseId, extra] = process.argv.slice(2);
if (extra !== undefined || !["M1", "M2"].includes(caseId)) {
  console.error("Usage: node cli-prompt.mjs <M1|M2>");
  process.exitCode = 3;
} else {
  const read = relative => readFileSync(new URL(relative, import.meta.url), "utf8")
    .replace(/\r\n?/g, "\n").trim();
  let task = read(`./cases/${caseId}.md`);
  if (caseId === "M1") {
    task = task.split("Only edit", 1)[0].trim();
    task += " Propose the complete contents of routes.json only, as a JSON object mapping paths to handler names. Do not edit files or claim that you ran a check.";
  }
  const routes = read(`./inputs/${caseId}/routes.json`);
  process.stdout.write(`${task}\n\nCandidate routes.json:\n${routes}\n\nToy handler source:\n${read("./handlers.mjs")}`);
}
