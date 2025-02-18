import { serve } from "bun";
import { z } from "zod";
import { Database } from "bun:sqlite";

const db = new Database("groups.db");
db.exec(`
  CREATE TABLE IF NOT EXISTS groups (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL
    updated_at TEXT NOT NULL
    data TEXT
  )
`);

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
      GET: (req: Request) => {
        const url = new URL(req.url);
        const apiKey = url.searchParams.get("api-key");
        const id = url.searchParams.get("id");
        if (apiKey !== Bun.env.API_KEY) {
          return new Response("Unauthorized", { status: 401 });
        }
        const data = id
          ? db.query("SELECT * FROM groups WHERE id = ?").get(id)
          : db.query("SELECT * FROM groups").all();
        return Response.json(data, { status: 201 });
      },

      PUT: async (req: Request) => {
        const body = putSchema.parse(await req.json());
        if (body.apiKey !== Bun.env.API_KEY) {
          return new Response("Unauthorized", { status: 401 });
        }
        db.query(
          `INSERT INTO groups (id, data, created_at, updated_at)
           VALUES (?, ?, ?, ?)`,
        ).run(
          body.id,
          body.data,
          new Date().toISOString(),
          new Date().toISOString(),
        );
        const group = db
          .query("SELECT * FROM groups WHERE id = ?")
          .get(body.id);
        return Response.json(group, { status: 201 });
      },

      POST: async (req: Request) => {
        const body = postSchema.parse(await req.json());
        if (body.apiKey !== Bun.env.API_KEY) {
          return new Response("Unauthorized", { status: 401 });
        }
        db.query(
          `INSERT INTO groups (id, created_at, updated_at)
           VALUES (?, ?, ?)`,
        ).run(body.id, new Date().toISOString(), new Date().toISOString());
        const group = db
          .query("SELECT * FROM groups WHERE id = ?")
          .get(body.id);
        return Response.json(group, { status: 201 });
      },
    },
    "/:id": {
      GET: (req: Request) => {
        const id = (req as any).params.id as string;
        const group = db.query("SELECT * FROM groups WHERE id = ?").get(id);
        if (!group) return new Response("Not Found", { status: 404 });
        return Response.json(group); // TODO serve page
      },
    },
  },

  fetch(req) {
    return new Response("Not Found", { status: 404 });
  },
});
