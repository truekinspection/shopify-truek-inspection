import { PrismaClient } from "@/prisma/generated/client/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

/** Explicit pool avoids default limits that starve interactive transactions under load (Prisma P2028). */
const pool = new Pool({
  connectionString,
  max: 10,
  connectionTimeoutMillis: 20_000,
  idleTimeoutMillis: 30_000,
});

const adapter = new PrismaPg(pool);

const prismaClientSingleton = () => {
  return new PrismaClient({ adapter });
};

declare const globalThis: {
  prismaGlobal: ReturnType<typeof prismaClientSingleton>;
} & typeof global;

const db = globalThis.prismaGlobal ?? prismaClientSingleton();

export default db;

if (process.env.NODE_ENV !== "production") globalThis.prismaGlobal = db;