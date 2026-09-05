import test from "node:test";
import assert from "node:assert/strict";

import {
  normalizeCommentContent,
  normalizePagePath,
  normalizeReturnTo,
  onRequest,
  parseCookies,
} from "../functions/api/[[path]].js";

test("article paths are restricted to canonical post paths", () => {
  assert.equal(normalizePagePath("/posts/welcome/"), "/posts/welcome/");
  assert.equal(normalizePagePath("/about/"), null);
  assert.equal(normalizePagePath("//evil.example/posts/test/"), null);
  assert.equal(normalizePagePath("/posts/../about/"), null);
  assert.equal(normalizePagePath("/posts/test/?draft=1"), null);
});

test("OAuth return targets remain on the same origin", () => {
  assert.equal(normalizeReturnTo("/posts/welcome/?from=login"), "/posts/welcome/?from=login");
  assert.equal(normalizeReturnTo("https://evil.example/"), "/");
  assert.equal(normalizeReturnTo("//evil.example/"), "/");
});

test("comment content is normalized and bounded", () => {
  assert.equal(normalizeCommentContent("  hello\r\nworld  "), "hello\nworld");
  assert.equal(normalizeCommentContent("   "), null);
  assert.equal(normalizeCommentContent("a".repeat(4001)), null);
  assert.equal(normalizeCommentContent("bad\u0000text"), null);
});

test("cookie parsing handles encoded values", () => {
  assert.deepEqual(parseCookies("one=hello%20world; two=value"), {
    one: "hello world",
    two: "value",
  });
});

test("an unconfigured deployment reports a disabled login", async () => {
  const response = await onRequest({
    request: new Request("https://example.com/api/auth/session"),
    params: { path: ["auth", "session"] },
    env: {},
  });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { configured: false, user: null });
});

test("unsafe mutation origins are rejected", async () => {
  const response = await onRequest({
    request: new Request("https://example.com/api/auth/logout", {
      method: "POST",
      headers: { Origin: "https://evil.example" },
    }),
    params: { path: ["auth", "logout"] },
    env: {},
  });
  assert.equal(response.status, 403);
});

test("public comments are serialized without HTML rendering", async () => {
  const database = {
    prepare() {
      return {
        bind() {
          return {
            async all() {
              return {
                results: [{
                  id: 7,
                  body: "<script>alert(1)</script>",
                  status: "visible",
                  created_at: 1_700_000_000,
                  updated_at: 1_700_000_000,
                  github_id: 42,
                  login: "visitor",
                }],
              };
            },
          };
        },
      };
    },
  };
  const response = await onRequest({
    request: new Request("https://example.com/api/comments?page=%2Fposts%2Fwelcome%2F"),
    params: { path: ["comments"] },
    env: { BLOG_DB: database, ADMIN_GITHUB_ID: "150793176" },
  });
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.comments[0].content, "<script>alert(1)</script>");
  assert.equal(body.comments[0].author.role, "visitor");
});

function authenticatedDatabase({ githubId = 42, login = "visitor", existingAuthor = githubId } = {}) {
  const writes = [];
  return {
    writes,
    prepare(sql) {
      return {
        bind(...values) {
          return {
            async first() {
              if (sql.includes("FROM sessions AS s")) return { github_id: githubId, login };
              if (sql.includes("COUNT(*) AS count")) return { count: 0 };
              if (sql.includes("body = ?3")) return null;
              if (sql.includes("SELECT id, github_id, status")) {
                return { id: values[0], github_id: existingAuthor, status: "visible" };
              }
              return null;
            },
            async run() {
              writes.push({ sql, values });
              return { meta: { last_row_id: 11 } };
            },
          };
        },
      };
    },
  };
}

test("an authenticated visitor can post a bounded plain-text comment", async () => {
  const database = authenticatedDatabase();
  const response = await onRequest({
    request: new Request("https://example.com/api/comments", {
      method: "POST",
      headers: {
        Origin: "https://example.com",
        "Content-Type": "application/json",
        Cookie: `hx_blog_session=${"x".repeat(43)}`,
      },
      body: JSON.stringify({ page: "/posts/welcome/", content: "A useful comment." }),
    }),
    params: { path: ["comments"] },
    env: { BLOG_DB: database, ADMIN_GITHUB_ID: "150793176" },
  });
  assert.equal(response.status, 201);
  assert.equal((await response.json()).id, 11);
  assert.ok(database.writes.some(({ sql }) => sql.includes("INSERT INTO comments")));
});

test("a visitor cannot moderate another user's comment", async () => {
  const database = authenticatedDatabase({ githubId: 42, existingAuthor: 99 });
  const response = await onRequest({
    request: new Request("https://example.com/api/comments/7", {
      method: "PATCH",
      headers: {
        Origin: "https://example.com",
        "Content-Type": "application/json",
        Cookie: `hx_blog_session=${"x".repeat(43)}`,
      },
      body: JSON.stringify({ status: "hidden" }),
    }),
    params: { path: ["comments", "7"] },
    env: { BLOG_DB: database, ADMIN_GITHUB_ID: "150793176" },
  });
  assert.equal(response.status, 403);
});

test("the configured administrator can hide another user's comment", async () => {
  const database = authenticatedDatabase({ githubId: 150793176, login: "superxhc", existingAuthor: 99 });
  const response = await onRequest({
    request: new Request("https://example.com/api/comments/7", {
      method: "PATCH",
      headers: {
        Origin: "https://example.com",
        "Content-Type": "application/json",
        Cookie: `hx_blog_session=${"x".repeat(43)}`,
      },
      body: JSON.stringify({ status: "hidden" }),
    }),
    params: { path: ["comments", "7"] },
    env: { BLOG_DB: database, ADMIN_GITHUB_ID: "150793176" },
  });
  assert.equal(response.status, 200);
  assert.ok(database.writes.some(({ sql, values }) => sql.includes("UPDATE comments SET status") && values[0] === "hidden"));
});
