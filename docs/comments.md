# GitHub 账号与评论系统

状态：**代码已准备，但尚未创建或连接 Cloudflare D1、GitHub OAuth App，也尚未上线。**

博客正文仍然由 Hugo 静态生成。只有 `/api/*` 请求交给 Cloudflare Pages Functions；评论保存在 Cloudflare D1 中。日常发布文章仍然只需要编辑 Markdown、添加图片并推送 Git。

## 功能与角色

- 使用 GitHub OAuth 登录，本站不接收或保存密码、邮箱和 GitHub access token。
- GitHub 用户 ID `150793176`（`superxhc`）通过环境变量识别为管理员。
- 其他成功登录的 GitHub 用户均为 Visitor。
- Visitor 可以发表、修改和删除自己的评论。
- Administrator 可以隐藏、恢复或永久删除任意评论，但不能冒充作者修改别人的文字。
- 评论以纯文本显示；浏览器端使用 `textContent`，不执行评论中的 HTML 或脚本。
- 会话使用随机 HttpOnly Cookie；D1 中只保存令牌的 SHA-256 哈希。
- 修改请求检查同源 `Origin`；每个账号每分钟最多发表 3 条评论，并拦截一分钟内的重复提交。
- 可选接入 Cloudflare Turnstile；如果启用，服务端会验证每一次新评论的 token。

相关实现：

- `functions/api/[[path]].js`：OAuth、会话、评论和管理员 API。
- `migrations/0001_comments.sql`：D1 数据结构。
- `layouts/_partials/comments.html`：文章页评论容器。
- `assets/js/comments.js`：无框架、渐进增强的评论界面。
- `static/_routes.json`：只有 `/api/*` 调用 Pages Functions，静态页面不经过 Function。

## 1. 创建 GitHub OAuth App

打开 GitHub：**Settings → Developer settings → OAuth Apps → New OAuth App**，填写：

```text
Application name: Hengchao Xu Blog Comments
Homepage URL: https://hengchaoxu.online/
Authorization callback URL: https://hengchaoxu.online/api/auth/callback
```

创建后记录 Client ID，并生成 Client Secret。Client Secret 只能放在 Cloudflare 加密变量中，不能写进仓库、Markdown、截图或聊天记录。

本站登录不请求额外 OAuth scope，只读取 GitHub 提供的账号 ID 和用户名。GitHub OAuth 网页流程参见：<https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps>。

## 2. 创建并初始化 D1

在 Cloudflare Dashboard 中进入 **Workers & Pages → D1 SQL database → Create database**，例如命名为：

```text
hengchaoxu-blog-comments
```

在该数据库的 Console 中执行仓库里的完整文件：

```text
migrations/0001_comments.sql
```

也可以在安装 Wrangler 后执行：

```powershell
npx wrangler d1 execute hengchaoxu-blog-comments --remote --file=migrations/0001_comments.sql
```

然后进入 Pages 项目的 **Settings → Bindings → Add → D1 database**：

```text
Variable name: BLOG_DB
D1 database: hengchaoxu-blog-comments
```

生产环境和需要测试评论的 Preview 环境必须分别检查绑定。D1 绑定方式参见：<https://developers.cloudflare.com/pages/functions/bindings/#d1-databases>。

## 3. 配置生产环境变量

进入 Pages 项目的 **Settings → Variables and Secrets**。至少设置：

```text
GITHUB_CLIENT_ID=<GitHub OAuth Client ID>
GITHUB_CLIENT_SECRET=<GitHub OAuth Client Secret，必须选择 Encrypt>
GITHUB_CALLBACK_URL=https://hengchaoxu.online/api/auth/callback
ADMIN_GITHUB_ID=150793176
```

这些变量是 Pages Function 的运行时配置，不是 Hugo 构建变量。设置或修改后需要重新部署。

不要把 `.dev.vars`、`.env`、Client Secret 或真实 Turnstile Secret 提交到 Git。仓库已经忽略这些文件，并只提供可公开的 `.dev.vars.example`。

## 4. 可选启用 Turnstile

GitHub 登录和频率限制已经提供基础保护。需要进一步防止自动化提交时，在 Cloudflare Turnstile 中创建 widget，并把正式域名加入允许列表。

把公开 Site Key 写入 `hugo.toml`：

```toml
commentsTurnstileSiteKey = '公开的-site-key'
```

再在 Pages 加密变量中设置：

```text
TURNSTILE_SECRET_KEY=<必须 Encrypt 的 Secret Key>
TURNSTILE_HOSTNAME=hengchaoxu.online
```

Site Key 与 Secret Key 必须同时配置。只添加浏览器组件而不做服务端验证是不安全的；本项目的 API 会调用 Cloudflare Siteverify。官方说明：<https://developers.cloudflare.com/turnstile/get-started/server-side-validation/>。

未配置 Site Key 时，不加载 Turnstile 脚本，也不增加第三方前端请求。

## 5. 本地测试

只检查 Hugo 页面和评论的降级状态时，原命令不变：

```powershell
hugo server --buildDrafts --disableFastRender
```

普通 Hugo Server 不运行 Pages Functions，因此评论区会诚实显示“本地或尚未配置”，正文、搜索、数学和导航仍正常。

要测试真实登录和本地 D1，需要额外安装当前 Node.js LTS 和 Wrangler，并为本地地址创建一个单独的 GitHub OAuth App，其 callback 为：

```text
http://127.0.0.1:8788/api/auth/callback
```

准备配置：

```powershell
Copy-Item .dev.vars.example .dev.vars
npx wrangler d1 execute hengchaoxu-blog-comments --local --file=migrations/0001_comments.sql
hugo --buildDrafts --environment development --baseURL http://127.0.0.1:8788/ --destination public
npx wrangler pages dev public --port 8788 --d1 BLOG_DB=<D1_DATABASE_ID>
```

随后访问 <http://127.0.0.1:8788/>。`.dev.vars` 中必须使用本地 OAuth App 的 Client ID/Secret，不能把生产 Secret 复制到公开文件。

当前机器没有可从 PowerShell 调用的 Node.js/npm，因此本轮没有实际运行 Wrangler；后端纯函数和路由测试通过了隔离的 JavaScript 运行时检查，云端 D1/OAuth 联调仍需完成上述配置后验证。

## 6. 预览环境策略

建议生产环境使用正式 OAuth App 和正式 D1；Cloudflare Preview 环境默认不设置 GitHub OAuth Secret，评论区会只读或显示未配置。不要让任意临时 Preview 域名复用正式 callback。

如果确实需要在 Preview 测试登录，请创建独立 OAuth App、独立 D1，并在 Preview Variables 中使用该 Preview 的固定地址。GitHub OAuth callback 的 host 必须与 OAuth App 配置匹配。

## 7. 管理与维护

管理员登录后，每条评论旁会显示：

- **Hide**：隐藏评论，数据仍保留，之后可 Restore。
- **Restore**：恢复隐藏评论。
- **Delete**：永久删除，浏览器会再次确认；删除后只能通过 D1 备份恢复。

Visitor 只会看到自己评论的 Edit 和 Delete。

需要关闭某篇文章的评论时，在该文章 front matter 中加入：

```yaml
comments: false
```

需要全站临时关闭评论时，把 `hugo.toml` 中的：

```toml
comments = true
```

改为 `false`。这只隐藏前端入口；如果希望同时关闭写入，应移除 Pages 中的 OAuth Secret 或暂停对应 Function。

建议定期导出 D1，并在删除争议评论前优先使用 Hide。评论可能包含公开个人信息，管理员需要制定简短的评论与删除政策。
