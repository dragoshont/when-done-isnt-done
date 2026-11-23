export const handlers = new Map([
  ["monitored", (request, { log, monitor }) => {
    log(request.id);
    monitor({ requestId: request.id });
    return { status: 200 };
  }],
  ["logging", (request, { log }) => {
    log(request.id);
    return { status: 200 };
  }],
]);
