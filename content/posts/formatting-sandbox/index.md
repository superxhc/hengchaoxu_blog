---
title: "Formatting sandbox: 中英文、公式与代码"
date: 2026-09-05T13:00:00+08:00
draft: true
description: "A draft-only page used to check bilingual text, mathematics, code, figures, tables, and footnotes."
tags:
  - formatting
  - 中文
categories:
  - Site notes
math: true
scholarly: true
mathMacros:
  '\risk': '\mathcal{R}'
---

This draft checks the elements commonly used in a research note. 它只在带草稿参数的本地预览中出现，不会进入正式构建。

{{< abstract >}}
This draft-only abstract verifies the compact paper-style front matter, mathematical notation, numbered environments, cross-references, and citations.
{{< /abstract >}}

{{< keywords >}}
academic writing; bilingual typesetting; mathematical notes
{{< /keywords >}}

## Text, quotation, and lists

> A restrained layout should keep attention on the argument, not on decoration.

- English and 中文 can appear in the same paragraph.
- A long link should wrap inside the reading column: <https://example.com/a/very/long/path/that/is/only/here/to/check/how-the-layout-handles-unbroken-looking-links>.
- Literal currency uses a double-escaped dollar sign in the Markdown source: \\$20 and \\$35.

## Mathematics

Inline mathematics supports subscripts, superscripts, and backslashes: $\text{loss}_i = -\log p(y_i\mid x_i)$.

A displayed aligned expression:

$$
\begin{aligned}
L(\theta) &= \sum_{i=1}^{n} \ell(f_\theta(x_i), y_i) \\
R(\theta) &= L(\theta) + \lambda \lVert\theta\rVert_2^2
\end{aligned}
$$

A matrix:

$$
A = \begin{bmatrix}
1 & 0 & \alpha \\
0 & 1 & \beta
\end{bmatrix}.
$$

The page-level macro is available as $\risk(f)$, and the bundled mhchem extension can render $\ce{CO2 + C -> 2CO}$ when scientific notation requires it.

## Definitions, results, and proofs

{{< definition id="def-contraction" title="Contraction map" >}}
A map $T:X\to X$ is a contraction if there is a constant $q\in[0,1)$ such that
$d(Tx,Ty)\le qd(x,y)$ for every $x,y\in X$.
{{< /definition >}}

{{< theorem id="thm-unique-fixed-point" title="Uniqueness of a fixed point" >}}
A contraction has at most one fixed point.
{{< /theorem >}}

{{< proof >}}
Suppose that $x$ and $y$ are fixed points. By {{< xref id="def-contraction" label="Definition" >}},
$d(x,y)=d(Tx,Ty)\le qd(x,y)$. Since $q<1$, this implies $d(x,y)=0$, so $x=y$.
{{< /proof >}}

Other available statement names are `lemma`, `proposition`, `corollary`, `axiom`, `assumption`, `conjecture`, `claim`, `example`, and `remark`.

## Numbered equation and cross-reference

{{< equation id="eq-regularized-risk" >}}
\risk(\theta)
= \frac{1}{n}\sum_{i=1}^{n}\ell(f_\theta(x_i),y_i)
+ \lambda\norm{\theta}_2^2.
{{< /equation >}}

The objective is defined in {{< xref id="eq-regularized-risk" label="Equation" >}}. Numbering is automatic on scholarly pages and can be made stable with an explicit `number` parameter.

## Code

```python
def mean(values: list[float]) -> float:
    """Return the arithmetic mean of a non-empty sequence."""
    return sum(values) / len(values)
```

## Figure

![A simple blue line rising across three labelled observations.](figure.svg "A layout-test figure stored beside this Markdown file")

{{< figure src="figure.svg" alt="A simple blue line rising across three labelled observations." caption="A numbered figure loaded from the same page bundle." id="fig-trend" >}}

## Table

| Setting | Purpose | Deliberately long value used to verify local horizontal scrolling |
|:--|:--|:--|
| `draft: true` | Keep work out of production | `this-is-a-long-unbroken-table-value-that-must-not-expand-the-whole-page-beyond-the-viewport` |
| `math: true` | Load the local math renderer | KaTeX is loaded only on pages that request it. |

{{< table id="tab-capabilities" caption="Examples of automatically numbered scholarly objects." >}}
| Object | Number family | Cross-reference |
|:--|:--|:--|
| Theorem-like environments | Statement | `xref` |
| Displayed equation | Equation | `xref` |
| Figure and table | Separate | `xref` |
{{< /table >}}

## Listing and algorithm

{{< listing id="lst-mean" caption="A typed Python function." >}}
```python
def mean(values: list[float]) -> float:
    return sum(values) / len(values)
```
{{< /listing >}}

{{< algorithm id="alg-average" caption="Compute an arithmetic mean." >}}
1. Set $s\leftarrow 0$.
2. Add each observation to $s$.
3. Return $s/n$.
{{< /algorithm >}}

The abbreviation helper produces {{< abbr short="LLM" long="large language model" >}}, and {{< smallcaps text="small caps" >}} is available for conventional academic typography.

## Footnote

Footnotes are useful for qualifications that would interrupt the main argument.[^scope]

[^scope]: This is a formatting example, not a claim about any research result.

## Citations

The implementation follows Hugo's shortcode and page-resource model {{< cite keys="hugo-shortcodes" >}} and KaTeX's documented auto-render behavior {{< cite keys="katex-auto-render" locator="delimiters and macros" >}}.

{{< bibliography >}}
