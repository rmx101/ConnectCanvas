import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL ?? "postgresql://connect_canvas:connect_canvas@localhost/connect_canvas";

const sql = neon(databaseUrl);

export const db = drizzle(sql, { schema });
