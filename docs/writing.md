# 学术博客完整写作手册

本手册适用于本站当前固定环境：Hugo 0.165.0 extended、PaperMod 固定提交、Goldmark 和本地 KaTeX 0.18.1。日常写作只需要编辑 Markdown、YAML 文献数据和文章包内的图片，不需要修改 HTML、CSS 或 JavaScript。

本站提供的是适合网页发布的学术写作层，不是完整 LaTeX 编译器。它能可靠处理数学公式、定理与证明、编号对象、交叉引用、参考文献、图表、算法、代码和脚注，但不负责期刊模板、BibTeX/CSL 自动排版、TikZ、复杂 LaTeX 宏包或 PDF 投稿文件。

## 1. 两种文章类型

### 普通研究笔记

```powershell
hugo new content posts/my-stable-slug/index.md
```

使用 `archetypes/default.md`，适合不需要定理和参考文献的普通博客文章。

### 论文型长文

```powershell
hugo new content --kind paper posts/my-paper-slug/index.md
```

使用 `archetypes/paper.md`，默认开启数学和学术编号功能。

目录名应使用稳定、简短的英文 slug：

```text
content/posts/my-paper-slug/
├── index.md
├── references.yaml
├── overview.png
└── results.svg
```

文章、图片和文献文件放在同一个目录中。移动或重命名目录会改变文章 URL，发布后应谨慎操作。

## 2. Front matter

论文型文章开头示例：

```yaml
---
title: "A Clear and Stable Title"
date: 2026-09-06T10:00:00+08:00
draft: true
description: "One or two sentences for lists, search, RSS, and metadata."
tags:
  - llms
  - evaluation
categories:
  - Research notes
math: true
scholarly: true
mathMacros:
  '\risk': '\mathcal{R}'
references: []
---
```

字段说明：

| 字段 | 用途 | 建议 |
|:--|:--|:--|
| `title` | 页面标题和搜索标题 | 必填 |
| `date` | 发布时间 | 必须包含时区；香港时间使用 `+08:00` |
| `draft` | 是否为草稿 | 写作时 `true`，发布时 `false` |
| `description` | 首页摘要、搜索、RSS 和 SEO 描述 | 用一到两句完整陈述 |
| `tags` | 具体主题 | 可多个，保持拼写稳定 |
| `categories` | 较宽泛的文章类别 | 通常一到两个 |
| `math` | 加载本地 KaTeX | 有公式时设为 `true` |
| `scholarly` | 加载编号与交叉引用增强 | 使用本手册的学术对象时设为 `true` |
| `mathMacros` | 当前文章的自定义数学宏 | 可选 |
| `references` | 内嵌参考文献列表 | 短文可用；长文推荐 `references.yaml` |

不要把密码、令牌、未公开数据或审稿材料写入 front matter。公开 GitHub 仓库中的 `draft: true` 文件仍能被别人看到。

## 3. 推荐的论文型结构

```markdown
{{< abstract >}}
用一段话说明问题、方法、主要发现和适用范围。
{{< /abstract >}}

{{< keywords >}}
large language models; affective computing; evaluation
{{< /keywords >}}

## Introduction

## Related work

## Method

## Experiments

## Discussion

## Limitations

## Conclusion

## Acknowledgements

## Data and code availability

{{< bibliography >}}
```

这些章节不是强制模板。只保留与你文章实际内容相符的部分，不要为了形式完整添加空洞章节。

## 4. 普通 Markdown

```markdown
## Second-level heading

### Third-level heading

正文可以使用 **粗体**、*斜体* 和 `inline code`。

> 引用内容。

- 无序列表
- 第二项

1. 有序列表
2. 第二项

[链接文字](https://example.com/)
```

文章标题已经由 front matter 生成，正文通常从 `##` 开始，不要再写一个重复的一级标题。

## 5. 数学公式

包含公式的文章必须设置：

```yaml
math: true
```

### 行内公式

```markdown
The loss is $L(\theta)=-\log p_\theta(y\mid x)$.
```

也支持：

```markdown
The loss is \(L(\theta)=-\log p_\theta(y\mid x)\).
```

### 独立公式

```markdown
$$
L(\theta)=\frac{1}{n}\sum_{i=1}^{n}\ell_i.
$$
```

或者：

```markdown
\[
L(\theta)=\frac{1}{n}\sum_{i=1}^{n}\ell_i.
\]
```

### 多行公式

```markdown
$$
\begin{aligned}
L(\theta) &= \sum_{i=1}^{n}\ell_i, \\
R(\theta) &= L(\theta)+\lambda\lVert\theta\rVert_2^2.
\end{aligned}
$$
```

### 矩阵和分段函数

```markdown
$$
A=\begin{bmatrix}
1 & 0 \\
0 & 1
\end{bmatrix},
\qquad
f(x)=\begin{cases}
x^2, & x\ge 0, \\
-x, & x<0.
\end{cases}
$$
```

### 化学式与单位

本站本地加载 KaTeX `mhchem` 扩展：

```markdown
$\ce{CO2 + C -> 2CO}$
```

### 普通美元符号

因为 `$...$` 被用作行内公式，正文金额使用双反斜线：

```markdown
The registration fee is \\$20.
```

代码块和行内代码中的 `$` 不需要转义。

### 默认数学宏

以下宏已经全站提供：

| 宏 | 含义 |
|:--|:--|
| `\RR`、`\CC`、`\NN`、`\ZZ`、`\QQ` | 常用数集 |
| `\EE`、`\PP` | 期望和概率 |
| `\Var`、`\Cov` | 方差和协方差 |
| `\argmin`、`\argmax` | 优化算子 |
| `\KL` | KL 散度符号 |
| `\softmax` | softmax 算子 |
| `\ind` | 指示函数符号 |
| `\abs{x}` | 自适应绝对值 |
| `\norm{x}` | 自适应范数 |

示例：

```markdown
$x\in\RR^d$ and $\theta^*=\argmin_\theta \risk(\theta)$.
```

### 文章级自定义宏

在 front matter 中添加：

```yaml
mathMacros:
  '\risk': '\mathcal{R}'
  '\model': '\mathrm{Model}'
```

然后正文可写 `$\risk(\theta)$`。宏只作用于当前文章。KaTeX 支持最多九个参数的宏，但不是完整 TeX 宏处理器。

### 数学复制和无障碍

本站本地加载 KaTeX Copy-TeX。访问者复制渲染公式时会得到更适合粘贴的 LaTeX 源码。KaTeX 默认同时生成视觉 HTML 与 MathML，屏幕阅读器仍有可读取的数学表示。

## 6. 定理、定义和其他数学陈述

可用环境：

- `theorem`
- `lemma`
- `proposition`
- `corollary`
- `definition`
- `axiom`
- `assumption`
- `conjecture`
- `claim`
- `example`
- `remark`

基本写法：

```markdown
{{< definition id="def-contraction" title="Contraction map" >}}
A map $T:X\to X$ is a contraction if there exists $q\in[0,1)$ such that
$d(Tx,Ty)\le qd(x,y)$ for all $x,y\in X$.
{{< /definition >}}

{{< theorem id="thm-fixed-point" title="Fixed-point uniqueness" >}}
A contraction has at most one fixed point.
{{< /theorem >}}
```

`id` 用于链接和交叉引用，只使用英文小写字母、数字和连字符。`title` 可省略。

界面标签可以改成中文：

```markdown
{{< theorem id="thm-main" label="定理" title="主要结论" >}}
定理内容。
{{< /theorem >}}
```

定理、引理、命题、推论、猜想和 claim 的正文使用论文惯例的斜体；定义、公理、假设、例子和备注使用正体。

## 7. 证明

```markdown
{{< proof >}}
Suppose $x$ and $y$ are fixed points. Then ...
{{< /proof >}}
```

末尾会自动显示 `□`。自定义标题：

```markdown
{{< proof title="Sketch" >}}
Proof sketch here.
{{< /proof >}}
```

不需要方块时：

```markdown
{{< proof qed="false" >}}
Argument here.
{{< /proof >}}
```

中文标签：

```markdown
{{< proof label="证明" >}}
证明内容。
{{< /proof >}}
```

## 8. 编号规则

默认行为：

- 所有 theorem-like 环境共享一组 `Statement` 编号。
- Equation、Figure、Table、Listing 和 Algorithm 各自独立编号。
- 每篇文章从 1 重新开始。
- 编号只与当前文章中的对象顺序有关。

显式指定稳定编号：

```markdown
{{< theorem id="thm-generalization" number="2.1" >}}
...
{{< /theorem >}}
```

取消某个对象的编号：

```markdown
{{< remark number="none" >}}
This remark is intentionally unnumbered.
{{< /remark >}}
```

如果文章需要长期稳定的交叉引用，建议为所有被引用对象显式写 `number`。同一编号族中不要混用自动编号和章节式手工编号，例如不要把自动 `1`、手工 `2.1` 和自动 `2` 混在一起。

## 9. 交叉引用

自动引用目标的标签和编号：

```markdown
As shown in {{< xref id="thm-fixed-point" label="Theorem" >}}, ...
```

页面加载后显示为 `Theorem 2` 等实际编号。`label` 是 JavaScript 关闭时的可读后备文本。

固定引用文字：

```markdown
As shown in {{< xref id="thm-fixed-point" text="Theorem 2.1" >}}, ...
```

固定文字适合需要在 RSS、打印或 JavaScript 关闭时仍完整显示编号的正式长文。

短引用也可以直接使用标准 Markdown：

```markdown
[Theorem 2.1](#thm-fixed-point)
```

## 10. 编号公式

`equation` 会自动添加独立公式定界符，不要在内部再写 `$$`：

```markdown
{{< equation id="eq-objective" >}}
\begin{aligned}
L(\theta) &= \frac{1}{n}\sum_{i=1}^{n}\ell_i \\
&\quad + \lambda\norm{\theta}_2^2.
\end{aligned}
{{< /equation >}}
```

稳定编号：

```markdown
{{< equation id="eq-objective" number="3" >}}
L(\theta)=\sum_i \ell_i.
{{< /equation >}}
```

引用：

```markdown
See {{< xref id="eq-objective" label="Equation" >}}.
```

如果公式不需要编号，直接使用普通 `$$...$$`，不要套 `equation`。

## 11. 图片与图注

### 普通图片

不需要图注或编号时使用标准 Markdown：

```markdown
![说明图片内容的替代文字](overview.png)
```

### 学术 Figure

```markdown
{{< figure
  src="overview.png"
  alt="Overview of the three-stage evaluation pipeline."
  caption="Overview of the proposed evaluation pipeline."
  id="fig-overview"
>}}
```

参数：

- `src`：文章包内图片文件名；必填。
- `alt`：供屏幕阅读器和图片加载失败时使用；必须准确描述图片。
- `caption`：图注。
- `id`：交叉引用标识。
- `number`：可选稳定编号，或使用 `none` 取消编号。
- `label`：默认 `Figure`，可改为 `图`。
- `wide="true"`：保留给确实需要较宽展示的图片；手机仍不会撑出页面。

引用：

```markdown
See {{< xref id="fig-overview" label="Figure" >}}.
```

不要只在正文写“上图”或“下图”，因为响应式布局和后续编辑可能改变位置。

## 12. 表格

普通表格：

```markdown
| Model | Accuracy |
|:--|--:|
| Baseline | 82.1% |
| Proposed | 86.4% |
```

带编号和题注：

```markdown
{{< table id="tab-results" caption="Evaluation results on the test set." >}}
| Model | Accuracy | F1 |
|:--|--:|--:|
| Baseline | 82.1 | 80.4 |
| Proposed | 86.4 | 85.7 |
{{< /table >}}
```

宽表格会在自身区域横向滚动，不会撑宽整页。表头必须准确，数值列建议右对齐。

## 13. 代码与 Listing

普通代码块：

````markdown
```python
def mean(values: list[float]) -> float:
    return sum(values) / len(values)
```
````

带编号的代码清单：

`````markdown
{{< listing id="lst-mean" caption="A typed arithmetic-mean function." >}}
```python
def mean(values: list[float]) -> float:
    return sum(values) / len(values)
```
{{< /listing >}}
`````

代码块仍支持 PaperMod 的复制按钮和 Hugo 语法高亮。

## 14. Algorithm

使用有序列表写伪代码：

```markdown
{{< algorithm id="alg-training" caption="Training procedure." >}}
1. Initialize parameters $\theta$.
2. Sample a minibatch $B$.
3. Compute $L_B(\theta)$.
4. Update $\theta$ and repeat until convergence.
{{< /algorithm >}}
```

也可以在内部使用代码块。复杂伪代码不会自动理解 LaTeX 的 `algorithm2e` 或 `algorithmicx` 命令；应使用 Markdown 列表或代码。

## 15. 引用与参考文献

长文推荐在文章目录新建 `references.yaml`：

```yaml
- id: example2026
  authors: A. Author and B. Author
  title: A Real Publication Title
  container: Journal or Conference Name
  year: 2026
  volume: "12"
  issue: "3"
  pages: 100–120
  doi: 10.0000/example
  url: https://example.com/project
  note: Optional note.
```

`id` 必须唯一、稳定，并只使用英文小写字母、数字和连字符。不要编造 DOI、作者、录用状态或链接。

支持字段：

| 字段 | 用途 |
|:--|:--|
| `id` | 引用键，必填 |
| `authors` | 按希望展示的顺序填写作者 |
| `title` | 文献标题，必填 |
| `container` | 期刊、会议、书名或文档站点 |
| `publisher` | 出版机构 |
| `year` | 年份 |
| `volume`、`issue`、`pages` | 卷、期、页码 |
| `doi` | DOI 原始值，不要加 `https://doi.org/` |
| `url` | 论文、项目或官方文档链接 |
| `note` | 预印本状态、访问日期等真实备注 |

正文引用：

```markdown
The method follows prior work {{< cite keys="example2026" >}}.
```

多篇合并引用：

```markdown
Several studies report this pattern {{< cite keys="example2024,example2026" >}}.
```

页码或章节定位：

```markdown
{{< cite keys="example2026" locator="p. 12" >}}
```

文章末尾输出参考文献：

```markdown
{{< bibliography >}}
```

参考文献顺序就是 `references.yaml` 中的顺序，正文数字引用会与之对应。未知引用键、缺失 `id` 或缺失标题会让 Hugo 构建失败，防止带坏引用上线。

短文也可以把同样的列表直接放在 front matter 的 `references:` 下，但文献较多时独立 YAML 更容易维护。

当前引用系统是稳定、无依赖的数字格式，不解析 `.bib`，也不自动执行 APA、Chicago 或特定期刊 CSL 样式。正式投稿仍应由 Zotero、BibTeX 或期刊模板管理最终文献格式。

## 16. 脚注

```markdown
This conclusion requires an important qualification.[^scope]

[^scope]: Explain the qualification here.
```

脚注键只需在当前文章内唯一。不要用脚注代替应写进正文的重要论证。

## 17. 缩略词与 small caps

首次出现缩略词：

```markdown
{{< abbr short="LLM" long="large language model" >}}
```

浏览器悬停会显示全称，辅助技术也能读取解释。正文仍建议首次写出全称，例如 “large language model (LLM)”。

小型大写：

```markdown
{{< smallcaps text="small caps" >}}
```

不要大面积使用，以免影响可读性。

## 18. 附录、致谢和声明

这些内容使用普通 Markdown 标题即可：

```markdown
## Appendix A: Additional proofs

## Acknowledgements

## Data and code availability

## Ethics statement

## Author contributions

## Conflicts of interest
```

只添加与你公开内容实际相关的声明。网页不会替你验证研究伦理、利益冲突或数据许可。

## 19. 在文章中展示 shortcode 源码

Hugo 即使在代码围栏中也可能识别 shortcode。需要在文章里把 shortcode 当示例展示时，用注释转义：

```text
{{</* theorem */>}}
example
{{</* /theorem */>}}
```

页面显示时，`/*` 和 `*/` 不会出现。

## 20. 可信 HTML 与安全边界

为允许 theorem/proof 内嵌 `xref` 和其他学术 shortcode，Goldmark 已对仓库内 Markdown 开启 raw HTML。只有仓库作者可以写入这些文件，因此可以安全使用受信任的少量 HTML。

不要从不可信网页复制 `<script>`、iframe 或未知 HTML 后直接提交。审查外部 pull request 时必须检查 Markdown 中的 HTML。评论系统不使用 Goldmark，访客评论仍强制以纯文本输出，不能执行 HTML 或脚本。

## 21. 本地预览

包含草稿：

```powershell
hugo server --buildDrafts --disableFastRender
```

访问终端显示的地址，通常是 <http://localhost:1313/>。重点检查：

- 浏览器控制台是否出现 KaTeX 错误。
- 所有引用链接是否跳到正确对象。
- 图片替代文字、图注和表头是否完整。
- 长公式、代码和表格是否只在自身区域滚动。
- 深色和浅色模式是否可读。
- 手机宽度是否没有整页横向滚动。

草稿测试文章位于：

```text
content/posts/formatting-sandbox/index.md
```

它覆盖所有核心格式，并保持 `draft: true`。

## 22. 发布前构建

将文章改为：

```yaml
draft: false
```

然后运行：

```powershell
hugo --gc --minify --cleanDestinationDir
```

如果引用键错误、图片资源不存在或 shortcode 缺少必要参数，构建会失败并指出源文件位置。先修复错误再推送。

提交：

```powershell
git status
git add content/posts/my-paper-slug
git commit -m "Add research note"
git push origin main
```

Cloudflare Pages 会自动更新首页、Notes、Archives、Categories、Tags、Search、RSS 和 sitemap。

## 23. 发布检查清单

- 标题、日期、时区和 description 正确。
- `draft` 已按意图设置。
- 没有未公开研究、隐私数据或密钥。
- 摘要没有夸大结论。
- 每个 Figure 都有准确 `alt` 和 caption。
- 表格包含表头和单位。
- 每个 `id` 唯一，每个 xref 都能跳转。
- 关键编号使用显式 `number`，或确认自动编号顺序稳定。
- `references.yaml` 中的作者、标题、年份、DOI 和状态真实。
- 公式在本地没有 KaTeX 警告。
- 普通美元符号已转义。
- 代码和数据链接可公开访问。
- 深浅色、桌面和手机布局已检查。
- 干净生产构建成功，且草稿不在 `public/` 中。

## 24. 常见错误

### 页面显示原始公式

确认 front matter 中有：

```yaml
math: true
```

并检查定界符是否成对出现。

### 页面显示原始编号或 xref 只有标签

确认有：

```yaml
scholarly: true
```

核心内容在 JavaScript 关闭时仍可读；自动 xref 文本需要本地 `scholarly.js` 增强。要求完全静态时给 `xref` 写固定 `text`。

### 引用导致构建失败

检查 `cite keys="..."` 是否与 `references.yaml` 的 `id` 完全一致，以及每项是否包含 `id` 和 `title`。

### Figure 导致构建失败

检查图片是否和 `index.md` 位于同一文章包，文件名和大小写是否一致。站点会主动阻止缺失的相对图片资源上线。

### 编号跳动

自动编号随对象顺序变化。长期文章请给被引用对象显式设置 `number`，并避免在同一编号族混用自动编号与章节式手工编号。

### KaTeX 不支持某个命令

KaTeX 不是完整 LaTeX。先查 KaTeX 支持表；复杂 TikZ、宏包或期刊专用命令应改为普通公式、SVG/PDF 图片，或在外部 LaTeX 工程中维护。

## 25. 依赖与维护

当前学术写作功能仅依赖：

- Hugo 0.165.0 extended：Markdown、shortcode、页面资源和构建校验。
- PaperMod 固定提交：页面框架、搜索和基础导航。
- KaTeX 0.18.1：本地数学渲染及字体。
- KaTeX auto-render：识别 `$...$`、`$$...$$`、`\(...\)` 和 `\[...\]`。
- KaTeX Copy-TeX：复制公式时保留 LaTeX 源码。
- KaTeX mhchem：化学式语法。
- 本站 `scholarly.js`：自动编号和 xref 文本，仅几行原生 JavaScript。
- Hugo 自定义 shortcodes：所有学术结构和文献输出。

没有 npm 运行时依赖、数据库依赖、外部字体、CDN、MathJax、Pandoc 或客户端引用服务。KaTeX 文件与许可证均位于 `static/vendor/katex/0.18.1/`，干净检出后即可离线构建。

不要直接修改 `themes/PaperMod/`。学术模板位于 `layouts/_shortcodes/` 和 `layouts/_partials/scholarly/`，样式集中在 `assets/css/extended/academic.css`。

## 26. 明确的能力边界

本站适合发布研究笔记、技术长文、课程讲义和网页论文，但不等价于投稿级 LaTeX：

- 不自动生成期刊或会议 PDF。
- 不执行 BibTeX、Biber 或 CSL。
- 不支持任意 LaTeX 宏包。
- 不渲染 TikZ、PGFPlots、algorithm2e 或 minted。
- 不自动生成章节式定理编号；可手工指定 `number="2.1"`。
- 不自动核验 DOI、论文状态、统计结论或参考文献真实性。
- 网页公式以 KaTeX 支持范围为准。

如果一篇文章同时需要网页版本和正式投稿 PDF，建议以独立 LaTeX 仓库维护投稿源文件，并把适合公开阅读的版本改写成本站 Markdown；不要试图让一份源文件无损覆盖两种排版系统。
