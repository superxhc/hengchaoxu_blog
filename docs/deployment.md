# Cloudflare Pages 部署说明

状态：**待手动操作，尚未接入 Cloudflare Pages，也未切换正式域名。** 本次代码修改没有变更阿里云 DNS、没有解绑现有服务，也没有执行 `git push`。

以下设置依据 Cloudflare Pages 当前的 [Hugo 指南](https://developers.cloudflare.com/pages/framework-guides/deploy-a-hugo-site/)、[构建配置](https://developers.cloudflare.com/pages/configuration/build-configuration/) 和 [自定义域名说明](https://developers.cloudflare.com/pages/configuration/custom-domains/) 整理。

## 1. 连接仓库

在 Cloudflare Dashboard 的 **Workers & Pages** 中创建 Pages 项目并选择 Git 集成：

- Git provider：GitHub
- Repository：`superxhc/hengchaoxu_blog`
- Production branch：`main`
- Root directory：仓库根目录（留空）
- Build command：`bash scripts/build.sh`
- Build output directory：`public`

构建脚本会先执行 `git submodule update --init --recursive`，因此干净检出也会取得固定提交的 PaperMod，不依赖本机主题目录或缓存。

在项目的生产和预览环境都添加：

```text
HUGO_VERSION=0.165.0
```

主题要求 Hugo 0.146.0 或更高；这里固定为本站本地已验证的 0.165.0 extended，不跟随 Cloudflare 构建镜像的默认版本漂移。Cloudflare 官方支持用 `HUGO_VERSION` 选择 Hugo 版本。首次云端构建仍应在日志中核对版本字符串包含 `v0.165.0` 和 `+extended`；在尚未实际部署前，不把本地验证等同于云端验证。

## 2. 生产与预览地址

`scripts/build.sh` 根据 Cloudflare 自动提供的环境变量处理地址和索引策略：

- `CF_PAGES_BRANCH=main`：使用 `https://hengchaoxu.online/` 作为 `baseURL`，并以 `production` 环境构建。canonical、RSS 和 sitemap 使用正式域名，robots 允许索引。
- 其他分支：使用 `CF_PAGES_URL` 作为 `baseURL`，并以 `preview` 环境构建。页面输出 `noindex, nofollow`，`robots.txt` 为 `Disallow: /`。

这样预览页面的资源使用实际预览地址，不依赖正式域名；预览的 noindex 设置也不会进入 `main` 的正式构建。

首次部署后先在 `*.pages.dev` 地址检查导航、搜索、RSS、404、深浅色和手机布局，再进行域名操作。

## 3. 根域名与 www 的区别

目标根域名是 `hengchaoxu.online`。Cloudflare Pages 对根域名和普通子域名的要求不同，不能把根域名迁移简化为“在阿里云增加一条 CNAME”。

### 使用根域名 `hengchaoxu.online`

Cloudflare 官方要求把该域名作为 Cloudflare zone，并把域名注册商处的权威 nameserver 改为 Cloudflare 分配的 nameserver。完成 zone 与 nameserver 接管后，再在 Pages 项目的 **Custom domains** 中添加 `hengchaoxu.online`；Cloudflare 会处理对应记录和证书。

这会影响整个域名的 DNS 托管。操作前必须完整盘点并迁移现有 A、AAAA、CNAME、MX、TXT 等记录，特别是邮件和其他子域名记录，确认 TTL 和回退方案。本项目不会自动执行这些步骤。

### 只使用 `www.hengchaoxu.online`

如果暂时不迁移权威 nameserver，可以只在 Pages 的 **Custom domains** 中先添加 `www.hengchaoxu.online`，再到当前 DNS 服务商添加：

```text
Type: CNAME
Name: www
Target: <your-pages-project>.pages.dev
```

必须先在 Pages 项目中关联这个自定义子域名，再配置 CNAME；仅手工增加指向 `pages.dev` 的记录可能无法正常提供服务。此方案只接入 `www`，不会自动让根域名生效。若最终决定以 `www` 为规范域名，还需把 `hugo.toml` 和生产构建脚本中的规范地址一并改成 `https://www.hengchaoxu.online/`，并另行设计根域名跳转；当前代码仍以无 `www` 的正式域名为准。

## 4. 上线前核对

- GitHub `main` 已包含全部源文件和 submodule 指针。
- Cloudflare 生产与预览环境都设置 `HUGO_VERSION=0.165.0`。
- 生产构建日志显示 PaperMod submodule 初始化成功，构建输出目录为 `public`。
- `*.pages.dev` 预览中没有草稿泄露，页面为 noindex。
- 正式构建的 canonical、RSS、sitemap 和 robots 指向 `https://hengchaoxu.online/`。
- 域名切换前已记录现有 DNS，明确根域名迁移或仅 `www` 接入的方案。

连接完成后，每次向 `main` 推送 Markdown 和图片，Cloudflare Pages 就会自动重新构建并更新站点。

## 5. 账号与评论功能

仓库现在包含 Pages Functions 与 D1 评论功能。它不会改变 Hugo 的构建命令，但正式启用前还必须手动创建 GitHub OAuth App、D1 数据库、`BLOG_DB` binding 和加密环境变量。完整步骤见 [GitHub 账号与评论系统配置](comments.md)。

`static/_routes.json` 将 Function 调用限制在 `/api/*`；文章、图片、CSS、JavaScript、RSS 和其他静态页面不经过 Function。不要把 GitHub Client Secret 或 `.dev.vars` 提交到仓库。
