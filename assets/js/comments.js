(() => {
  "use strict";

  const root = document.querySelector("[data-comments-root]");
  if (!root) return;

  const statusElement = root.querySelector("[data-comments-status]");
  const accountElement = root.querySelector("[data-comments-account]");
  const listElement = root.querySelector("[data-comments-list]");
  const formElement = root.querySelector("[data-comments-form]");
  const textareaElement = formElement.querySelector("textarea");
  const countElement = formElement.querySelector("[data-comment-count]");
  const submitElement = formElement.querySelector("button[type='submit']");
  const turnstileElement = formElement.querySelector("[data-comment-turnstile]");

  const pagePath = root.dataset.pagePath;
  const apiBase = root.dataset.apiBase.replace(/\/$/, "");
  const turnstileSiteKey = root.dataset.turnstileSiteKey;
  const state = {
    configured: false,
    user: null,
    comments: [],
    turnstileToken: "",
    turnstileWidgetId: null,
  };

  function endpoint(path) {
    return `${apiBase}/${path.replace(/^\//, "")}`;
  }

  async function apiRequest(path, options = {}) {
    const headers = new Headers(options.headers || {});
    headers.set("Accept", "application/json");
    if (options.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
    const response = await fetch(endpoint(path), {
      ...options,
      credentials: "same-origin",
      headers,
    });
    let data = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }
    if (!response.ok) throw new Error(data?.error || `Request failed (${response.status}).`);
    return data;
  }

  function setStatus(message, kind = "") {
    statusElement.textContent = message;
    statusElement.dataset.kind = kind;
  }

  function clearElement(element) {
    while (element.firstChild) element.firstChild.remove();
  }

  function appendText(parent, text) {
    parent.appendChild(document.createTextNode(text));
  }

  function makeButton(label, action, className = "comment-action") {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.textContent = label;
    button.addEventListener("click", action);
    return button;
  }

  function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  }

  function renderAccount() {
    clearElement(accountElement);
    if (!state.configured) {
      const message = document.createElement("p");
      message.textContent = "GitHub sign-in has not been configured for this deployment.";
      accountElement.appendChild(message);
      formElement.hidden = true;
      return;
    }

    if (!state.user) {
      const login = document.createElement("a");
      login.className = "comment-login";
      login.href = `${endpoint("auth/login")}?return_to=${encodeURIComponent(location.pathname)}`;
      login.textContent = "Sign in with GitHub";
      accountElement.appendChild(login);
      formElement.hidden = true;
      return;
    }

    const identity = document.createElement("p");
    appendText(identity, "Signed in as ");
    const profile = document.createElement("a");
    profile.href = state.user.profileUrl;
    profile.rel = "noopener";
    profile.textContent = `@${state.user.login}`;
    identity.appendChild(profile);
    appendText(identity, state.user.role === "admin" ? " (Administrator)" : " (Visitor)");
    accountElement.appendChild(identity);
    accountElement.appendChild(makeButton("Sign out", async () => {
      try {
        await apiRequest("auth/logout", { method: "POST" });
        state.user = null;
        renderAccount();
        await loadComments();
        setStatus("Signed out.");
      } catch (error) {
        setStatus(error.message, "error");
      }
    }, "comment-signout"));
    formElement.hidden = false;
    prepareTurnstile();
  }

  async function updateComment(id, payload) {
    await apiRequest(`comments/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    await loadComments();
  }

  function beginEdit(comment, contentElement, actionsElement) {
    const editor = document.createElement("textarea");
    editor.className = "comment-inline-editor";
    editor.rows = 5;
    editor.maxLength = 4000;
    editor.value = comment.content;
    contentElement.replaceWith(editor);
    actionsElement.hidden = true;

    const editorActions = document.createElement("div");
    editorActions.className = "comment-actions";
    const save = makeButton("Save", async () => {
      save.disabled = true;
      try {
        await updateComment(comment.id, { content: editor.value });
        setStatus("Comment updated.");
      } catch (error) {
        save.disabled = false;
        setStatus(error.message, "error");
      }
    });
    const cancel = makeButton("Cancel", () => renderComments());
    editorActions.append(save, cancel);
    editor.after(editorActions);
    editor.focus();
  }

  async function deleteComment(comment) {
    if (!window.confirm("Permanently delete this comment?")) return;
    try {
      await apiRequest(`comments/${comment.id}`, { method: "DELETE" });
      await loadComments();
      setStatus("Comment deleted.");
    } catch (error) {
      setStatus(error.message, "error");
    }
  }

  function renderComment(comment) {
    const item = document.createElement("li");
    item.className = "comment-item";
    if (comment.status === "hidden") item.classList.add("is-hidden");

    const article = document.createElement("article");
    const header = document.createElement("header");
    header.className = "comment-meta";
    const author = document.createElement("a");
    author.className = "comment-author";
    author.href = comment.author.profileUrl;
    author.rel = "noopener";
    author.textContent = `@${comment.author.login}`;
    header.appendChild(author);
    if (comment.author.role === "admin") {
      const role = document.createElement("span");
      role.className = "comment-role";
      role.textContent = "Administrator";
      header.appendChild(role);
    }
    const time = document.createElement("time");
    time.dateTime = comment.createdAt;
    time.textContent = formatDate(comment.createdAt);
    header.appendChild(time);
    if (comment.updatedAt !== comment.createdAt) {
      const edited = document.createElement("span");
      edited.textContent = "edited";
      edited.title = `Updated ${formatDate(comment.updatedAt)}`;
      header.appendChild(edited);
    }
    if (comment.status === "hidden") {
      const hidden = document.createElement("span");
      hidden.className = "comment-hidden-label";
      hidden.textContent = "Hidden";
      header.appendChild(hidden);
    }

    const content = document.createElement("p");
    content.className = "comment-content";
    content.textContent = comment.content;
    article.append(header, content);

    const ownsComment = state.user && state.user.id === comment.author.id;
    const isAdministrator = state.user?.role === "admin";
    if (ownsComment || isAdministrator) {
      const actions = document.createElement("div");
      actions.className = "comment-actions";
      if (ownsComment && comment.status === "visible") {
        actions.appendChild(makeButton("Edit", () => beginEdit(comment, content, actions)));
      }
      if (isAdministrator) {
        const nextStatus = comment.status === "hidden" ? "visible" : "hidden";
        actions.appendChild(makeButton(nextStatus === "hidden" ? "Hide" : "Restore", async () => {
          try {
            await updateComment(comment.id, { status: nextStatus });
            setStatus(nextStatus === "hidden" ? "Comment hidden." : "Comment restored.");
          } catch (error) {
            setStatus(error.message, "error");
          }
        }));
      }
      actions.appendChild(makeButton("Delete", () => deleteComment(comment)));
      article.appendChild(actions);
    }

    item.appendChild(article);
    return item;
  }

  function renderComments() {
    clearElement(listElement);
    for (const comment of state.comments) listElement.appendChild(renderComment(comment));
  }

  async function loadComments() {
    const includeHidden = state.user?.role === "admin" ? "&include_hidden=1" : "";
    const data = await apiRequest(`comments?page=${encodeURIComponent(pagePath)}${includeHidden}`);
    state.comments = Array.isArray(data.comments) ? data.comments : [];
    renderComments();
    setStatus(state.comments.length === 1 ? "1 comment" : `${state.comments.length} comments`);
  }

  function resetTurnstile() {
    state.turnstileToken = "";
    if (state.turnstileWidgetId !== null && window.turnstile) {
      window.turnstile.reset(state.turnstileWidgetId);
    }
  }

  function renderTurnstile() {
    if (!window.turnstile || state.turnstileWidgetId !== null) return;
    turnstileElement.hidden = false;
    state.turnstileWidgetId = window.turnstile.render(turnstileElement, {
      sitekey: turnstileSiteKey,
      theme: "auto",
      action: "comment",
      callback(token) {
        state.turnstileToken = token;
      },
      "expired-callback"() {
        state.turnstileToken = "";
      },
      "error-callback"() {
        state.turnstileToken = "";
        setStatus("Human verification could not load.", "error");
      },
    });
  }

  function prepareTurnstile() {
    if (!turnstileSiteKey || !state.user) return;
    if (window.turnstile) {
      renderTurnstile();
      return;
    }
    if (document.querySelector("script[data-comments-turnstile]")) return;
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.dataset.commentsTurnstile = "";
    script.addEventListener("load", renderTurnstile);
    script.addEventListener("error", () => setStatus("Human verification could not load.", "error"));
    document.head.appendChild(script);
  }

  textareaElement.addEventListener("input", () => {
    countElement.textContent = `${Array.from(textareaElement.value).length} / 4000`;
  });

  formElement.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!state.user) return;
    if (turnstileSiteKey && !state.turnstileToken) {
      setStatus("Complete the human verification before posting.", "error");
      return;
    }
    submitElement.disabled = true;
    try {
      await apiRequest("comments", {
        method: "POST",
        body: JSON.stringify({
          page: pagePath,
          content: textareaElement.value,
          turnstileToken: state.turnstileToken,
        }),
      });
      textareaElement.value = "";
      countElement.textContent = "0 / 4000";
      resetTurnstile();
      await loadComments();
      setStatus("Comment posted.");
    } catch (error) {
      resetTurnstile();
      setStatus(error.message, "error");
    } finally {
      submitElement.disabled = false;
    }
  });

  async function initialize() {
    const authResult = new URLSearchParams(location.search).get("comments_auth");
    if (authResult) {
      const cleanUrl = new URL(location.href);
      cleanUrl.searchParams.delete("comments_auth");
      history.replaceState(null, "", `${cleanUrl.pathname}${cleanUrl.search}${cleanUrl.hash}`);
    }

    try {
      const session = await apiRequest("auth/session");
      state.configured = Boolean(session.configured);
      state.user = session.user || null;
      renderAccount();
      await loadComments();
      if (authResult === "failed") setStatus("GitHub sign-in failed. Please try again.", "error");
    } catch (error) {
      state.configured = false;
      state.user = null;
      renderAccount();
      clearElement(listElement);
      setStatus("Comments are unavailable in this local or unconfigured preview.");
    }
  }

  initialize();
})();
