// Homebase shared backend — a small REST API in front of a D1 database.
// Lets the Homebase site, other devices, and a chat assistant all read/write
// the same family data instead of each browser keeping its own local copy.

function corsHeaders(env) {
  return {
    "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN || "*",
    "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

function json(data, init, env) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { "Content-Type": "application/json", ...corsHeaders(env), ...(init && init.headers) },
  });
}

function uid() {
  return crypto.randomUUID();
}

async function requireAuth(request, env) {
  const auth = request.headers.get("Authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "");
  return token && env.TOKEN && token === env.TOKEN;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    if (method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders(env) });
    }

    if (!path.startsWith("/api/")) {
      return json({ error: "not found" }, { status: 404 }, env);
    }

    if (!(await requireAuth(request, env))) {
      return json({ error: "unauthorized" }, { status: 401 }, env);
    }

    const db = env.DB;

    try {
      // ---- Full state ----
      if (path === "/api/state" && method === "GET") {
        const [people, subjects, assignments, events, settingsRow] = await Promise.all([
          db.prepare("SELECT id, name, color FROM people").all(),
          db.prepare("SELECT id, name, color FROM subjects").all(),
          db.prepare("SELECT id, person_id as personId, subject_id as subjectId, title, due, notes, done FROM assignments").all(),
          db.prepare("SELECT id, person_id as personId, title, start, end FROM events").all(),
          db.prepare("SELECT value FROM settings WHERE key = 'googleSync'").first(),
        ]);
        let googleSync = { calendarId: "", assignmentsCalendarId: "", apiKey: "" };
        if (settingsRow && settingsRow.value) {
          try { googleSync = { ...googleSync, ...JSON.parse(settingsRow.value) }; } catch (e) {}
        }
        return json({
          people: people.results,
          subjects: subjects.results,
          assignments: assignments.results.map(a => ({ ...a, done: !!a.done })),
          events: events.results,
          googleSync,
        }, {}, env);
      }

      // ---- Settings (shared config like Google Calendar sync) ----
      if (path === "/api/settings/googlesync" && (method === "POST" || method === "PUT")) {
        const body = await request.json();
        const value = JSON.stringify({
          calendarId: body.calendarId || "",
          assignmentsCalendarId: body.assignmentsCalendarId || "",
          apiKey: body.apiKey || "",
        });
        await db.prepare(
          "INSERT INTO settings (key, value) VALUES ('googleSync', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
        ).bind(value).run();
        return json({ ok: true }, {}, env);
      }

      // ---- People ----
      if (path === "/api/people" && method === "POST") {
        const body = await request.json();
        const id = uid();
        await db.prepare("INSERT INTO people (id, name, color) VALUES (?, ?, ?)")
          .bind(id, body.name, body.color || "#2dd4bf").run();
        return json({ id }, { status: 201 }, env);
      }

      let m = path.match(/^\/api\/people\/([^/]+)$/);
      if (m && method === "DELETE") {
        await db.prepare("DELETE FROM people WHERE id = ?").bind(m[1]).run();
        return json({ ok: true }, {}, env);
      }

      // ---- Subjects ----
      if (path === "/api/subjects" && method === "POST") {
        const body = await request.json();
        const id = body.id || uid();
        await db.prepare("INSERT OR IGNORE INTO subjects (id, name, color) VALUES (?, ?, ?)")
          .bind(id, body.name, body.color || "#64748b").run();
        return json({ id }, { status: 201 }, env);
      }

      m = path.match(/^\/api\/subjects\/([^/]+)$/);
      if (m && method === "DELETE") {
        await db.prepare("DELETE FROM subjects WHERE id = ?").bind(m[1]).run();
        return json({ ok: true }, {}, env);
      }

      // ---- Assignments ----
      if (path === "/api/assignments" && method === "POST") {
        const body = await request.json();
        const id = body.id || uid();
        await db.prepare(
          "INSERT OR IGNORE INTO assignments (id, person_id, subject_id, title, due, notes, done) VALUES (?, ?, ?, ?, ?, ?, 0)"
        ).bind(id, body.personId, body.subjectId || null, body.title, body.due, body.notes || "").run();
        return json({ id }, { status: 201 }, env);
      }

      m = path.match(/^\/api\/assignments\/([^/]+)$/);
      if (m && method === "PATCH") {
        const body = await request.json();
        const fields = [];
        const values = [];
        if (typeof body.done === "boolean") { fields.push("done = ?"); values.push(body.done ? 1 : 0); }
        if (typeof body.title === "string") { fields.push("title = ?"); values.push(body.title); }
        if (typeof body.due === "string") { fields.push("due = ?"); values.push(body.due); }
        if (typeof body.notes === "string") { fields.push("notes = ?"); values.push(body.notes); }
        if (typeof body.personId === "string") { fields.push("person_id = ?"); values.push(body.personId); }
        if (typeof body.subjectId === "string") { fields.push("subject_id = ?"); values.push(body.subjectId); }
        if (fields.length === 0) return json({ error: "nothing to update" }, { status: 400 }, env);
        values.push(m[1]);
        await db.prepare(`UPDATE assignments SET ${fields.join(", ")} WHERE id = ?`).bind(...values).run();
        return json({ ok: true }, {}, env);
      }
      if (m && method === "DELETE") {
        await db.prepare("DELETE FROM assignments WHERE id = ?").bind(m[1]).run();
        return json({ ok: true }, {}, env);
      }

      // ---- Events ----
      if (path === "/api/events" && method === "POST") {
        const body = await request.json();
        const id = uid();
        await db.prepare(
          "INSERT INTO events (id, person_id, title, start, end) VALUES (?, ?, ?, ?, ?)"
        ).bind(id, body.personId, body.title, body.start, body.end || body.start).run();
        return json({ id }, { status: 201 }, env);
      }

      m = path.match(/^\/api\/events\/([^/]+)$/);
      if (m && method === "DELETE") {
        await db.prepare("DELETE FROM events WHERE id = ?").bind(m[1]).run();
        return json({ ok: true }, {}, env);
      }

      return json({ error: "not found" }, { status: 404 }, env);
    } catch (err) {
      return json({ error: String(err && err.message || err) }, { status: 500 }, env);
    }
  },
};
