import { serve, sql } from "bun";
import { z } from "zod";
import assert from "assert";
import app from "./index.html";

assert(process.env.POSTGRES_URL, "POSTGRES_URL is not set");
assert(process.env.API_KEY, "API_KEY is not set");

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
  apikey: z.string(),
});

const postSchema = z.object({
  id: z.string(),
  apikey: z.string(),
});

const deleteSchema = z.object({
  id: z.string(),
  apikey: z.string(),
});

// take this object and handle it dynamically in the fetch
const routes = {
  "/api/groups": {
    GET: async (req: Request) => {
      const url = new URL(req.url);
      const apikey = url.searchParams.get("apikey");
      const id = url.searchParams.get("id");

      if (apikey !== process.env.API_KEY) {
        return new Response("Unauthorized", { status: 401 });
      }

      let data: Group | Group[];
      if (id) {
        const result = await sql`SELECT * FROM groups WHERE id = ${id}`;
        data = result[0];
      } else {
        data = await sql`SELECT * FROM groups`;
      }

      return Response.json(data, { status: 200 });
    },

    PUT: async (req: Request) => {
      const body = putSchema.parse(await req.json());

      if (body.apikey !== process.env.API_KEY) {
        return new Response("Unauthorized", { status: 401 });
      }

      const now = new Date().toISOString();

      await sql`
        UPDATE groups
        SET data = ${body.data}, updated_at = ${now}
        WHERE id = ${body.id}
      `;

      const result = await sql`SELECT * FROM groups WHERE id = ${body.id}`;
      const group = result[0];

      return Response.json(group, { status: 201 });
    },

    POST: async (req: Request) => {
      const body = postSchema.parse(await req.json());

      if (body.apikey !== process.env.API_KEY) {
        return new Response("Unauthorized", { status: 401 });
      }

      const now = new Date().toISOString();

      await sql`
          INSERT INTO groups (id, created_at, updated_at)
          VALUES (${body.id}, ${now}, ${now})
        `;

      const result = await sql`SELECT * FROM groups WHERE id = ${body.id}`;
      const group = result[0];

      return Response.json(group, { status: 201 });
    },

    DELETE: async (req: Request) => {
      const body = deleteSchema.parse(await req.json());

      if (body.apikey !== process.env.API_KEY) {
        return new Response("Unauthorized", { status: 401 });
      }

      await sql`
        DELETE FROM groups WHERE id = ${body.id}
      `;

      return new Response(null, { status: 204 });
    },
  },
  "/api/groups/:id": {
    GET: async (req: Request) => {
      const urlParts = req.url.split("/");
      const id = urlParts[urlParts.length - 1];

      const result = await sql`SELECT * FROM groups WHERE id = ${id}`;
      const group = result[0];

      if (!group) return new Response("Not Found", { status: 404 });
      return Response.json(group);
    },
  },
};

serve({
  static: {
    "/:id": app,
  },

  async fetch(req: Request): Promise<Response> {
    assert(req != null);

    const url = new URL(req.url);
    const path = url.pathname;
    assert(path != null);

    for (const routePath in routes) {
      if (matchRoute(path, routePath)) {
        const handlers = routes[routePath];
        const handler = handlers[req.method as keyof typeof handlers];
        if (handler) {
          try {
            return await handler(req);
          } catch (error: any) {
            return new Response(error.message || "Internal Server Error", {
              status: 500,
            });
          }
        } else {
          return new Response("Method Not Allowed", { status: 405 });
        }
      }
    }

    return new Response("Not Found", { status: 404 });
  },
});

function matchRoute(path: string, routePath: string): boolean {
  assert(path != null);
  assert(routePath != null);

  const routeParts = routePath.split("/");
  const pathParts = path.split("/");

  if (routeParts.length !== pathParts.length) {
    return false;
  }

  for (let i = 0; i < routeParts.length; i++) {
    const routePart = routeParts[i];
    const pathPart = pathParts[i];

    if (routePart.startsWith(":")) {
      continue; // This is a parameter, so it always matches
    }

    if (routePart !== pathPart) {
      return false;
    }
  }

  return true;
}
