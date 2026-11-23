import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { handlers } from "./handlers.mjs";

const oldRoute = "/v1/orders";
const newRoute = "/v2/orders";
const cases = new Set(["M1", "M2"]);

function monitorResult(routes) {
  function dispatch(path, id, monitor) {
    const handler = handlers.get(routes[path]);
    return handler ? handler({ id }, { log() {}, monitor }) : { status: 404 };
  }
  const retired = dispatch(oldRoute, "old", () => {}).status === 404;
  const requests = ["sample-17", "sample-93"].map(id => {
    const observedRequestIds = [];
    const response = dispatch(newRoute, id, event => observedRequestIds.push(event.requestId));
    return { id, status: response.status, observedRequestIds, matchingEvent: observedRequestIds.includes(id) };
  });
  const smoke = requests.every(request => request.status === 200);
  return {
    smoke,
    retired,
    requests,
    verdict: retired && smoke && requests.every(request => request.matchingEvent) ? "READY" : "HOLD",
  };
}

export function evaluate(caseId, bytes) {
  if (!cases.has(caseId)) throw new Error("Unknown case ID");
  let routes;
  try {
    routes = JSON.parse(bytes.toString("utf8"));
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
    return { verdict: "INVALID_INPUT", reason: "Expected a single JSON object" };
  }
  if (routes === null || typeof routes !== "object" || Array.isArray(routes))
    return { verdict: "INVALID_INPUT", reason: "Expected a JSON object" };
  const entries = Object.entries(routes);
  if (entries.some(([path, handler]) => (path !== oldRoute && path !== newRoute) || !handlers.has(handler)))
    return { verdict: "INVALID_INPUT", reason: "Unknown route or handler" };
  if (caseId === "M2" && (entries.length !== 1 || routes[newRoute] !== "logging"))
    return { verdict: "INVALID_INPUT", reason: "M2 requires the fixed log-only route" };
  return monitorResult(routes);
}

function main(args) {
  const [caseId, file] = args;
  if (args.length !== 2 || !cases.has(caseId) || !file) {
    console.error("Usage: node verify.mjs <M1|M2> <routes.json>");
    return 3;
  }
  let bytes;
  try {
    bytes = readFileSync(file);
  } catch (error) {
    if (typeof error?.code !== "string") throw error;
    console.error(`Could not read the input file: ${error.code}`);
    return 3;
  }
  const result = evaluate(caseId, bytes);
  console.log(JSON.stringify({ caseId, inputSha256: createHash("sha256").update(bytes).digest("hex"),
    ...result }, null, 2));
  return result.verdict === "READY" ? 0 : result.verdict === "HOLD" ? 1 : 2;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  process.exitCode = main(process.argv.slice(2));
