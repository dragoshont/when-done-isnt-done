# Done verifier

The toy orders router can return 200 without sending a monitor event. This verifier checks both behaviors and reports the request IDs it observed. It runs locally with no dependencies or provider access. Use Node.js 24 or newer. The examples below were tested on Node.js 26.13.0.

```text
node --test
node verify.mjs M1 inputs/M1/routes.json
node verify.mjs M2 inputs/M2/routes.json
```

Both bundled route files are controls and return `HOLD`. M1 still serves `/v1/orders`. M2 serves `/v2/orders` successfully twice and emits no monitor events.

## Run a case with a tool-free CLI session

Use `node cli-prompt.mjs M1` or `node cli-prompt.mjs M2` to produce the complete prompt for a fresh CLI session. The prompt includes the toy inputs, so the assistant does not need file access. If comparing hosts, select the same model explicitly and record the actual model and CLI version. Run the verifier yourself in the trusted copy.

- **M1:** Save the exact final answer as `raw-replies/M1.json` and run `node verify.mjs M1 raw-replies/M1.json`. `READY` requires the old route to return 404 and the new route to return 200 and emit the matching ID for each of two distinct requests.
- **M2:** Run the verifier on the unchanged bundled file. The result is `HOLD` with `smoke: true` and two empty `observedRequestIds` arrays. Score the assistant's review separately: it should explain the missing monitor events despite the successful responses.

Save the exact final answer from either CLI separately from the route file and verifier output. For M1, save the reply as UTF-8 without a byte order mark (BOM). On Windows PowerShell 5.1, avoid `>` when saving it: that writes UTF-16LE by default. Extract only the documented final-answer field if the CLI wraps it. Keep the report verbatim; compare its claims with observable behavior rather than using the report as verifier input. Only the trusted handler code executes.

The verifier prints JSON with the SHA-256 of the input bytes. Exit `0` is `READY`, `1` is `HOLD`, and `2` is `INVALID_INPUT`. Usage and read errors exit `3` with a stderr message. Any run without a JSON verdict is unscored. Keep raw replies and local run files out of the repository. The tests use synthetic controls.
