// Load `.env` from project root and prefer it over any stale DATABASE_URL in the shell.
import dotenv from "dotenv";
dotenv.config({ override: true });

import { normalizeDatabaseUrl, prismaCliDatabaseUrl } from "./server/lib/databaseUrl";

const databaseUrl = normalizeDatabaseUrl(process.env["DATABASE_URL"]);
if (databaseUrl) {
  process.env["DATABASE_URL"] = prismaCliDatabaseUrl(databaseUrl);
}

import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
