const SESSION_COOKIE = "hx_blog_session";
const OAUTH_STATE_COOKIE = "hx_oauth_state";
const OAUTH_RETURN_COOKIE = "hx_oauth_return";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;
const OAUTH_TTL_SECONDS = 10 * 60;
const MAX_COMMENT_LENGTH = 4000;
const MAX_COMMENTS_PER_MINUTE = 3;

const encoder = new TextEncoder();

export function jsonResponse(data, status = 200, cacheControl = "no-store") {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": cacheControl,
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex",
    },
  });
}

function errorResponse(message, status = 400) {
  return jsonResponse({ error: message }, status);
}

export function parseCookies(header = "") {
  const cookies = {};
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index < 1) continue;
    const name = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    try {
      cookies[name] = decodeURIComponent(value);
    } catch {
      cookies[name] = value;
    }
  }
  return cookies;
}

function serializeCookie(name, value, request, options = {}) {
  const secure = new URL(request.url).protocol === "https:";
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    `Path=${options.path || "/"}`,
    `Max-Age=${options.maxAge ?? SESSION_TTL_SECONDS}`,
    "HttpOnly",
    "SameSite=Lax",
  ];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

function clearCookie(name, request, path = "/") {
  return serializeCookie(name, "", request, { path, maxAge: 0 });
}

function bytesToBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function randomToken(size = 32) {
  const bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes);
  return bytesToBase64Url(bytes);
}

async function sha256(value) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(left, right) {
  if (typeof left !== "string" || typeof right !== "string" || left.length !== right.length) return false;
  let result = 0;
  for (let index = 0; index < left.length; index += 1) {
    result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return result === 0;
}

export function normalizePagePath(value) {
  if (typeof value !== "string") return null;
  const path = value.trim();
  if (path.length < 9 || path.length > 300 || !path.startsWith("/posts/") || !path.endsWith("/")) return null;
  if (path.includes("?") || path.includes("#") || path.includes("\\") || path.includes("//")) return null;
  try {
    const parsed = new URL(path, "https://blog.invalid");
    if (parsed.origin !== "https://blog.invalid" || parsed.pathname !== path) return null;
    return parsed.pathname;
  } catch {
    return null;
  }
}

export function normalizeReturnTo(value) {
  if (typeof value !== "string" || value.length > 500) return "/";
  const target = value.trim();
  if (!target.startsWith("/") || target.startsWith("//") || target.includes("\\")) return "/";
  try {
    const parsed = new URL(target, "https://blog.invalid");
    if (parsed.origin !== "https://blog.invalid") return "/";
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return "/";
  }
}

export function normalizeCommentContent(value) {
  if (typeof value !== "string") return null;
  const content = value.replace(/\r\n?/g, "\n").trim();
  if (!content || Array.from(content).length > MAX_COMMENT_LENGTH) return null;
  if (content.split("\n").length > 80) return null;
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/u.test(content)) return null;
  return content;
}

function parseCommentId(value) {
  if (typeof value !== "string" || !/^[1-9]\d{0,15}$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) ? id : null;
}

function isAdmin(env, githubId) {
  return Boolean(env.ADMIN_GITHUB_ID) && String(githubId) === String(env.ADMIN_GITHUB_ID).trim();
}

function publicUser(env, row) {
  return {
    id: String(row.github_id),
    login: row.login,
    profileUrl: `https://github.com/${encodeURIComponent(row.login)}`,
    role: isAdmin(env, row.github_id) ? "admin" : "visitor",
  };
}

function hasDatabase(env) {
  return Boolean(env.BLOG_DB && typeof env.BLOG_DB.prepare === "function");
}

function hasAuthConfiguration(env) {
  return Boolean(
    hasDatabase(env) &&
    env.GITHUB_CLIENT_ID &&
    env.GITHUB_CLIENT_SECRET &&
    env.GITHUB_CALLBACK_URL &&
    env.ADMIN_GITHUB_ID
  );
}

function requireSameOrigin(request) {
  const origin = request.headers.get("Origin");
  return Boolean(origin) && origin === new URL(request.url).origin;
}

async function parseJson(request) {
  if (!request.headers.get("Content-Type")?.toLowerCase().includes("application/json")) return null;
  const declaredLength = Number(request.headers.get("Content-Length") || 0);
  if (Number.isFinite(declaredLength) && declaredLength > 12_000) return null;
  try {
    const text = await request.text();
    if (text.length > 12_000) return null;
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function getCurrentUser(context) {
  if (!hasDatabase(context.env)) return null;
  const token = parseCookies(context.request.headers.get("Cookie") || "")[SESSION_COOKIE];
  if (!token || token.length < 32 || token.length > 200) return null;
  const tokenHash = await sha256(token);
  const now = Math.floor(Date.now() / 1000);
  const row = await context.env.BLOG_DB.prepare(
    `SELECT u.github_id, u.login
       FROM sessions AS s
       JOIN users AS u ON u.github_id = s.github_id
      WHERE s.token_hash = ?1 AND s.expires_at > ?2`
  ).bind(tokenHash, now).first();
  return row ? publicUser(context.env, row) : null;
}

function callbackUrl(env) {
  try {
    const parsed = new URL(env.GITHUB_CALLBACK_URL || "");
    if (parsed.protocol !== "https:" && !(parsed.protocol === "http:" && ["localhost", "127.0.0.1"].includes(parsed.hostname))) {
      return null;
    }
    if (parsed.pathname !== "/api/auth/callback") return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function redirectResponse(location, cookies = []) {
  const headers = new Headers({
    Location: location,
    "Cache-Control": "no-store",
    "Referrer-Policy": "no-referrer",
    "X-Robots-Tag": "noindex",
  });
  for (const cookie of cookies) headers.append("Set-Cookie", cookie);
  return new Response(null, { status: 302, headers });
}

function authFailureRedirect(request, returnTo) {
  const destination = new URL(normalizeReturnTo(returnTo), new URL(request.url).origin);
  destination.searchParams.set("comments_auth", "failed");
  destination.hash = "comments";
  return redirectResponse(`${destination.pathname}${destination.search}${destination.hash}`, [
    clearCookie(OAUTH_STATE_COOKIE, request, "/api/auth/callback"),
    clearCookie(OAUTH_RETURN_COOKIE, request, "/api/auth/callback"),
  ]);
}

async function handleLogin(context) {
  if (!hasAuthConfiguration(context.env)) return errorResponse("Comment login is not configured.", 503);
  const redirectUri = callbackUrl(context.env);
  if (!redirectUri) return errorResponse("The OAuth callback URL is not configured correctly.", 503);

  const requestUrl = new URL(context.request.url);
  const state = randomToken(24);
  const returnTo = normalizeReturnTo(requestUrl.searchParams.get("return_to") || "/");
  const githubUrl = new URL("https://github.com/login/oauth/authorize");
  githubUrl.searchParams.set("client_id", context.env.GITHUB_CLIENT_ID);
  githubUrl.searchParams.set("redirect_uri", redirectUri);
  githubUrl.searchParams.set("state", state);

  return redirectResponse(githubUrl.toString(), [
    serializeCookie(OAUTH_STATE_COOKIE, state, context.request, {
      path: "/api/auth/callback",
      maxAge: OAUTH_TTL_SECONDS,
    }),
    serializeCookie(OAUTH_RETURN_COOKIE, returnTo, context.request, {
      path: "/api/auth/callback",
      maxAge: OAUTH_TTL_SECONDS,
    }),
  ]);
}

async function handleCallback(context) {
  const cookies = parseCookies(context.request.headers.get("Cookie") || "");
  const returnTo = normalizeReturnTo(cookies[OAUTH_RETURN_COOKIE] || "/");
  if (!hasAuthConfiguration(context.env)) return authFailureRedirect(context.request, returnTo);
  const redirectUri = callbackUrl(context.env);
  if (!redirectUri) return authFailureRedirect(context.request, returnTo);

  const requestUrl = new URL(context.request.url);
  const code = requestUrl.searchParams.get("code");
  const state = requestUrl.searchParams.get("state");
  if (!code || code.length > 500 || !constantTimeEqual(state, cookies[OAUTH_STATE_COOKIE])) {
    return authFailureRedirect(context.request, returnTo);
  }

  const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "User-Agent": "hengchaoxu-blog-comments",
    },
    body: JSON.stringify({
      client_id: context.env.GITHUB_CLIENT_ID,
      client_secret: context.env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: redirectUri,
    }),
  });
  if (!tokenResponse.ok) return authFailureRedirect(context.request, returnTo);
  const tokenData = await tokenResponse.json();
  if (!tokenData.access_token) return authFailureRedirect(context.request, returnTo);

  const userResponse = await fetch("https://api.github.com/user", {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${tokenData.access_token}`,
      "User-Agent": "hengchaoxu-blog-comments",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (!userResponse.ok) return authFailureRedirect(context.request, returnTo);
  const githubUser = await userResponse.json();
  if (!Number.isSafeInteger(githubUser.id) || typeof githubUser.login !== "string" || !githubUser.login) {
    return authFailureRedirect(context.request, returnTo);
  }

  const now = Math.floor(Date.now() / 1000);
  await context.env.BLOG_DB.prepare("DELETE FROM sessions WHERE expires_at <= ?1").bind(now).run();
  await context.env.BLOG_DB.prepare(
    `INSERT INTO users (github_id, login, created_at, updated_at)
     VALUES (?1, ?2, ?3, ?3)
     ON CONFLICT(github_id) DO UPDATE SET login = excluded.login, updated_at = excluded.updated_at`
  ).bind(githubUser.id, githubUser.login, now).run();

  const sessionToken = randomToken(32);
  const tokenHash = await sha256(sessionToken);
  await context.env.BLOG_DB.prepare(
    `INSERT INTO sessions (token_hash, github_id, expires_at, created_at)
     VALUES (?1, ?2, ?3, ?4)`
  ).bind(tokenHash, githubUser.id, now + SESSION_TTL_SECONDS, now).run();
  await context.env.BLOG_DB.prepare(
    `DELETE FROM sessions
      WHERE github_id = ?1
        AND token_hash NOT IN (
          SELECT token_hash FROM sessions WHERE github_id = ?1 ORDER BY created_at DESC LIMIT 5
        )`
  ).bind(githubUser.id).run();

  const destination = new URL(returnTo, new URL(context.request.url).origin);
  destination.hash = "comments";
  return redirectResponse(`${destination.pathname}${destination.search}${destination.hash}`, [
    serializeCookie(SESSION_COOKIE, sessionToken, context.request),
    clearCookie(OAUTH_STATE_COOKIE, context.request, "/api/auth/callback"),
    clearCookie(OAUTH_RETURN_COOKIE, context.request, "/api/auth/callback"),
  ]);
}

async function handleSession(context) {
  const user = await getCurrentUser(context);
  return jsonResponse({ configured: hasAuthConfiguration(context.env), user });
}

async function handleLogout(context) {
  if (!requireSameOrigin(context.request)) return errorResponse("Invalid request origin.", 403);
  if (hasDatabase(context.env)) {
    const token = parseCookies(context.request.headers.get("Cookie") || "")[SESSION_COOKIE];
    if (token) {
      const tokenHash = await sha256(token);
      await context.env.BLOG_DB.prepare("DELETE FROM sessions WHERE token_hash = ?1").bind(tokenHash).run();
    }
  }
  const response = jsonResponse({ ok: true });
  response.headers.append("Set-Cookie", clearCookie(SESSION_COOKIE, context.request));
  return response;
}

async function verifyTurnstile(context, token) {
  if (!context.env.TURNSTILE_SECRET_KEY) return true;
  if (typeof token !== "string" || !token || token.length > 2048) return false;
  const form = new FormData();
  form.set("secret", context.env.TURNSTILE_SECRET_KEY);
  form.set("response", token);
  const remoteIp = context.request.headers.get("CF-Connecting-IP");
  if (remoteIp) form.set("remoteip", remoteIp);
  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: form,
  });
  if (!response.ok) return false;
  const result = await response.json();
  if (!result.success) return false;
  if (result.action && result.action !== "comment") return false;
  if (context.env.TURNSTILE_HOSTNAME && result.hostname !== context.env.TURNSTILE_HOSTNAME) return false;
  return true;
}

function commentFromRow(env, row) {
  return {
    id: row.id,
    content: row.body,
    status: row.status,
    createdAt: new Date(row.created_at * 1000).toISOString(),
    updatedAt: new Date(row.updated_at * 1000).toISOString(),
    author: publicUser(env, row),
  };
}

async function handleListComments(context) {
  if (!hasDatabase(context.env)) return errorResponse("Comments are not configured.", 503);
  const requestUrl = new URL(context.request.url);
  const pagePath = normalizePagePath(requestUrl.searchParams.get("page"));
  if (!pagePath) return errorResponse("Invalid article path.");

  const includeHiddenRequested = requestUrl.searchParams.get("include_hidden") === "1";
  const viewer = includeHiddenRequested ? await getCurrentUser(context) : null;
  const includeHidden = Boolean(viewer && viewer.role === "admin");
  const statusClause = includeHidden ? "" : "AND c.status = 'visible'";
  const result = await context.env.BLOG_DB.prepare(
    `SELECT c.id, c.body, c.status, c.created_at, c.updated_at, u.github_id, u.login
       FROM comments AS c
       JOIN users AS u ON u.github_id = c.github_id
      WHERE c.page_path = ?1 ${statusClause}
      ORDER BY c.created_at ASC, c.id ASC
      LIMIT 500`
  ).bind(pagePath).all();
  const comments = (result.results || []).map((row) => commentFromRow(context.env, row));
  return jsonResponse({ comments });
}

async function handleCreateComment(context) {
  if (!requireSameOrigin(context.request)) return errorResponse("Invalid request origin.", 403);
  if (!hasDatabase(context.env)) return errorResponse("Comments are not configured.", 503);
  const user = await getCurrentUser(context);
  if (!user) return errorResponse("Sign in with GitHub before commenting.", 401);
  const payload = await parseJson(context.request);
  if (!payload) return errorResponse("A JSON request body is required.");
  const pagePath = normalizePagePath(payload.page);
  const content = normalizeCommentContent(payload.content);
  if (!pagePath) return errorResponse("Invalid article path.");
  if (!content) return errorResponse(`Comments must contain 1-${MAX_COMMENT_LENGTH} characters and at most 80 lines.`);
  if (!(await verifyTurnstile(context, payload.turnstileToken))) {
    return errorResponse("Human verification failed. Please try again.", 403);
  }

  const now = Math.floor(Date.now() / 1000);
  const recent = await context.env.BLOG_DB.prepare(
    "SELECT COUNT(*) AS count FROM comments WHERE github_id = ?1 AND created_at >= ?2"
  ).bind(user.id, now - 60).first();
  if (Number(recent?.count || 0) >= MAX_COMMENTS_PER_MINUTE) {
    return errorResponse("Please wait before posting another comment.", 429);
  }
  const duplicate = await context.env.BLOG_DB.prepare(
    "SELECT id FROM comments WHERE github_id = ?1 AND page_path = ?2 AND body = ?3 AND created_at >= ?4 LIMIT 1"
  ).bind(user.id, pagePath, content, now - 60).first();
  if (duplicate) return errorResponse("This comment was already submitted.", 409);

  const result = await context.env.BLOG_DB.prepare(
    `INSERT INTO comments (page_path, github_id, body, status, created_at, updated_at)
     VALUES (?1, ?2, ?3, 'visible', ?4, ?4)`
  ).bind(pagePath, user.id, content, now).run();
  return jsonResponse({ ok: true, id: result.meta?.last_row_id }, 201);
}

async function getComment(context, id) {
  return context.env.BLOG_DB.prepare(
    "SELECT id, github_id, status FROM comments WHERE id = ?1"
  ).bind(id).first();
}

async function handleUpdateComment(context, idValue) {
  if (!requireSameOrigin(context.request)) return errorResponse("Invalid request origin.", 403);
  if (!hasDatabase(context.env)) return errorResponse("Comments are not configured.", 503);
  const id = parseCommentId(idValue);
  if (!id) return errorResponse("Invalid comment id.");
  const user = await getCurrentUser(context);
  if (!user) return errorResponse("Sign in with GitHub first.", 401);
  const existing = await getComment(context, id);
  if (!existing) return errorResponse("Comment not found.", 404);
  const payload = await parseJson(context.request);
  if (!payload) return errorResponse("A JSON request body is required.");
  const now = Math.floor(Date.now() / 1000);

  if (Object.prototype.hasOwnProperty.call(payload, "status")) {
    if (user.role !== "admin") return errorResponse("Administrator access is required.", 403);
    if (!["visible", "hidden"].includes(payload.status)) return errorResponse("Invalid comment status.");
    await context.env.BLOG_DB.prepare(
      "UPDATE comments SET status = ?1, updated_at = ?2 WHERE id = ?3"
    ).bind(payload.status, now, id).run();
    return jsonResponse({ ok: true });
  }

  if (String(existing.github_id) !== user.id) return errorResponse("You can only edit your own comments.", 403);
  if (existing.status !== "visible") return errorResponse("Hidden comments cannot be edited.", 409);
  const content = normalizeCommentContent(payload.content);
  if (!content) return errorResponse(`Comments must contain 1-${MAX_COMMENT_LENGTH} characters and at most 80 lines.`);
  await context.env.BLOG_DB.prepare(
    "UPDATE comments SET body = ?1, updated_at = ?2 WHERE id = ?3"
  ).bind(content, now, id).run();
  return jsonResponse({ ok: true });
}

async function handleDeleteComment(context, idValue) {
  if (!requireSameOrigin(context.request)) return errorResponse("Invalid request origin.", 403);
  if (!hasDatabase(context.env)) return errorResponse("Comments are not configured.", 503);
  const id = parseCommentId(idValue);
  if (!id) return errorResponse("Invalid comment id.");
  const user = await getCurrentUser(context);
  if (!user) return errorResponse("Sign in with GitHub first.", 401);
  const existing = await getComment(context, id);
  if (!existing) return errorResponse("Comment not found.", 404);
  if (String(existing.github_id) !== user.id && user.role !== "admin") {
    return errorResponse("You cannot delete this comment.", 403);
  }
  await context.env.BLOG_DB.prepare("DELETE FROM comments WHERE id = ?1").bind(id).run();
  return jsonResponse({ ok: true });
}

function methodNotAllowed(methods) {
  const response = errorResponse("Method not allowed.", 405);
  response.headers.set("Allow", methods.join(", "));
  return response;
}

export async function onRequest(context) {
  const parts = Array.isArray(context.params.path)
    ? context.params.path
    : context.params.path
      ? [context.params.path]
      : [];
  const route = parts.join("/");
  const method = context.request.method.toUpperCase();

  try {
    if (route === "auth/login") return method === "GET" ? handleLogin(context) : methodNotAllowed(["GET"]);
    if (route === "auth/callback") return method === "GET" ? handleCallback(context) : methodNotAllowed(["GET"]);
    if (route === "auth/session") return method === "GET" ? handleSession(context) : methodNotAllowed(["GET"]);
    if (route === "auth/logout") return method === "POST" ? handleLogout(context) : methodNotAllowed(["POST"]);
    if (route === "comments") {
      if (method === "GET") return handleListComments(context);
      if (method === "POST") return handleCreateComment(context);
      return methodNotAllowed(["GET", "POST"]);
    }
    if (parts.length === 2 && parts[0] === "comments") {
      if (method === "PATCH") return handleUpdateComment(context, parts[1]);
      if (method === "DELETE") return handleDeleteComment(context, parts[1]);
      return methodNotAllowed(["PATCH", "DELETE"]);
    }
    return errorResponse("API route not found.", 404);
  } catch (error) {
    console.error("Comments API error", error);
    return errorResponse("The comments service encountered an error.", 500);
  }
}
