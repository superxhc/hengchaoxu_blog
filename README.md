# Hengchao Xu 学术博客

这是 Hengchao Xu 的个人学术博客源代码，使用 Hugo 和固定版本的 PaperMod 主题。正式域名计划为 <https://hengchaoxu.online/>；Cloudflare Pages 尚未接入，域名也尚未在本次工作中切换。

日常发布只需要编辑 Markdown、添加图片并推送 Git。站点会自动生成首页列表、Notes、Archives、Categories、Tags、Search、RSS、sitemap 和 404 页面，不需要手工维护文章清单。

## 快速开始

首次克隆后初始化固定版本的主题：

```powershell
git clone --recurse-submodules https://github.com/superxhc/hengchaoxu_blog.git
cd hengchaoxu_blog
git submodule update --init --recursive
```

本项目固定使用 Hugo `0.165.0` extended。确认版本并启动包含草稿的本地预览：

```powershell
hugo version
hugo server --buildDrafts --disableFastRender
```

访问终端显示的本地地址，通常是 <http://localhost:1313/>。开发预览自动使用 `noindex`，资源地址不依赖正式域名。

发布前执行一次干净的生产构建：

```powershell
hugo --gc --minify --cleanDestinationDir
```

输出位于 `public/`，该目录是生成物并被 Git 忽略。

## 新建与发布文章

文章采用 leaf bundle（文章资源包），Markdown 和图片放在同一目录：

```text
content/posts/my-stable-english-slug/
├── index.md
└── figure.png
```

创建文章：

```powershell
hugo new content posts/my-stable-english-slug/index.md
```

命令会应用 `archetypes/default.md`。创建后修改标题、简介、标签和分类；目录名使用稳定、简短的英文 slug。统一的 front matter 示例：

```yaml
---
title: "A clear post title"
date: 2026-09-05T20:00:00+08:00
draft: true
description: "One or two sentences for lists, search, RSS, and metadata."
tags:
  - llms
  - evaluation
categories:
  - Research notes
math: false
---
```

日期必须包含明确时区；香港时间使用 `+08:00`。写作期间保持 `draft: true`。准备公开时把它改为 `draft: false`，再运行生产构建检查。Hugo 会自动把发布文章加入首页、Notes、Archives、Categories、Tags、Search、RSS 和 sitemap。

常用 Markdown：

```markdown
## Section title

> A quotation.

- A list item
- Another item

![说明图片内容的替代文字](figure.png "可选标题")

[Link text](https://example.com/)
```

图片使用相对路径即可，不需要 HTML 或 shortcode。务必填写有意义的替代文字；纯装饰图片使用空替代文字 `![](decoration.png)`。代码围栏、表格、长公式会在各自区域横向滚动，不会撑宽整页。

## 数学公式

需要公式的文章把 `math` 设为 `true`。站点支持下列定界符：

- 行内公式：`$x_i^2$` 或 `\(x_i^2\)`
- 独立公式：`$$...$$` 或 `\[...\]`
- KaTeX 支持的常见环境，例如 `aligned`、`matrix`、`bmatrix`

示例：

```latex
Inline: $\text{loss}_i = -\log p_i$.

$$
\begin{aligned}
L(\theta) &= \sum_i \ell_i \\
R(\theta) &= L(\theta) + \lambda\lVert\theta\rVert_2^2
\end{aligned}
$$
```

由于 `$...$` 已启用，正文中的普通美元符号请在 Markdown 源文件里写成双反斜线，例如 `\\$20`。代码块和行内代码中的美元符号不需要处理。这里使用的是 KaTeX 0.18.1，并不宣称兼容完整 LaTeX；遇到复杂宏时先查 [KaTeX 支持表](https://katex.org/docs/support_table.html) 并在草稿预览中核对。

KaTeX 的 CSS、JavaScript 和字体固定在 `static/vendor/katex/0.18.1/`，只在 `math: true` 的页面加载。许可证保存在同一目录的 `LICENSE.txt`。

## 更新页面内容

以下页面都是普通 Markdown，可直接编辑：

- `content/about.md`
- `content/research.md`
- `content/publications.md`

Archives、Categories、Tags、Search 和 RSS 由内容自动生成，不要手工添加文章链接。顶栏项目由 `hugo.toml` 管理，日常发文无需修改它。

## 提交并触发更新

确认生产构建通过后：

```powershell
git status
git add content
git add static
git commit -m "Add new note"
git push origin main
```

只改文章时通常不需要 `git add static`；文章包内的图片会随 `git add content` 一起加入。推送到 `main` 后，已连接的 Cloudflare Pages 才会自动构建。首次部署仍需按 `docs/deployment.md` 手动连接仓库和域名。

公开仓库中的 `draft: true` 只阻止 Hugo 发布网页，并不会阻止 GitHub 展示源文件。因此草稿目录不适合存放未公开研究、审稿材料、个人数据、密钥或任何敏感信息。

## 谨慎更新 PaperMod

主题是 Git submodule，目前固定在提交 `d3768854d00ad003b0a8dbdba254ce9224377a01`。不要直接编辑 `themes/PaperMod/` 内的文件。更新前先建立单独分支并阅读上游变更：

```powershell
git switch -c chore/update-papermod
git -C themes/PaperMod fetch --tags origin
git -C themes/PaperMod checkout <reviewed-tag-or-commit>
git add themes/PaperMod
hugo --gc --minify --cleanDestinationDir
```

随后检查首页、文章页、搜索、深浅色和手机布局，再提交 submodule 指针。若更新已经提交，用 `git revert <theme-update-commit>` 回退最清楚；若尚未提交，回到原分支后运行 `git submodule update --init --recursive`，即可恢复该分支记录的主题版本。

站点级扩展集中在 `layouts/` 和 `assets/css/extended/academic.css`，这能避免维护主题分支；主题升级时重点检查这些覆盖仍与上游模板接口一致。

## 更多文档

- [完整学术写作手册：公式、定理、编号、图表与参考文献](docs/writing.md)
- [Cloudflare Pages 部署与域名接入](docs/deployment.md)
- [GitHub 账号与评论系统配置](docs/comments.md)
- [Hugo 数学公式文档](https://gohugo.io/content-management/mathematics/)
- [PaperMod 官方文档](https://github.com/adityatelange/hugo-PaperMod/wiki)
