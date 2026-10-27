#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig, redactSecret } from "./credentials.js";
import { createNodoServer } from "./server.js";

async function main(): Promise<void> {
  const config = loadConfig(process.env);
  const server = createNodoServer(config);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "NODO MCP failed to start";
  console.error(redactSecret(message, process.env.NODO_API_SECRET));
  process.exit(1);
});
