import { serve, sql } from "bun";
import { z } from "zod";
import assert from "assert";
import app from "./index.html";

assert(process.env.POSTGRES_URL, "POSTGRES_URL is not set");
assert(process.env.POSTGRES_USER, "POSTGRES_USER is not set");
assert(process.env.POSTGRES_PASSWORD, "POSTGRES_PASSWORD is not set");
assert(process.env.POSTGRES_DATABASE, "POSTGRES_DATABASE is not set");
assert(Bun.env.API_KEY, "API_KEY is not set");

await sql`
  CREATE TABLE IF NOT EXISTS groups (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    data TEXT
  );
`;

interface Group {
  id: string;
  created_at: string;
  updated_at: string;
  data: string;
}

const putSchema = z.object({
  id: z.string(),
  data: z.string(),
  apiKey: z.string(),
});

const postSchema = z.object({
  id: z.string(),
  apiKey: z.string(),
});

serve({
  // @ts-ignore
  routes: {
    "/api/groups": {
      GET: async (req: Request) => {
        const url = new URL(req.url);
        const apiKey = url.searchParams.get("api-key");
        const id = url.searchParams.get("id");

        if (apiKey !== Bun.env.API_KEY) {
          return new Response("Unauthorized", { status: 401 });
        }

        let data: Group | Group[];
        if (id) {
          const result = await sql`SELECT * FROM groups WHERE id = ${id}`;
          data = result.rows[0];
        } else {
          const result = await sql`SELECT * FROM groups`;
          data = result.rows;
        }

        return Response.json(data, { status: 200 });
      },

      PUT: async (req: Request) => {
        const body = putSchema.parse(await req.json());

        if (body.apiKey !== Bun.env.API_KEY) {
          return new Response("Unauthorized", { status: 401 });
        }

        const now = new Date().toISOString();

        await sql`
          INSERT INTO groups (id, data, created_at, updated_at)
          VALUES (${body.id}, ${body.data}, ${now}, ${now})
        `;

        const result = await sql`SELECT * FROM groups WHERE id = ${body.id}`;
        const group = result.rows[0];

        return Response.json(group, { status: 201 });
      },

      POST: async (req: Request) => {
        const body = postSchema.parse(await req.json());

        if (body.apiKey !== Bun.env.API_KEY) {
          return new Response("Unauthorized", { status: 401 });
        }

        const now = new Date().toISOString();

        await sql`
          INSERT INTO groups (id, created_at, updated_at)
          VALUES (${body.id}, ${now}, ${now})
        `;

        const result = await sql`SELECT * FROM groups WHERE id = ${body.id}`;
        const group = result.rows[0];

        return Response.json(group, { status: 201 });
      },
    },
    "/api/groups/:id": {
      GET: async (req: Request) => {
        const id = (req as any).params.id as string;

        const result = await sql`SELECT * FROM groups WHERE id = ${id}`;
        const group = result.rows[0];

        if (!group) return new Response("Not Found", { status: 404 });
        return Response.json(group);
      },
    },

    "/:id": app,
  },

  fetch() {
    return new Response("Not Found", { status: 404 });
  },
});
