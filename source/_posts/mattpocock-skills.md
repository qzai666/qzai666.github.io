---
title: 读懂 grill-me：让 AI 先把需求问清楚
date: 2026-10-22 15:00:00
updated: 2026-10-23 09:00:00
tags: ['AI','Codex','Skills','Vibe Coding']
---

给 AI 一句“做个会员系统”，它很快就能写出登录页和购买按钮。但会员什么时候到期，提前购买怎么算，退款后还有没有权益，这些问题可能一个都没解决。

我本地在用 [mattpocock/skills](https://github.com/mattpocock/skills)。这次想分享其中的 `grill-me`：它让 AI 在写代码之前，先把会影响实现的决定拿出来讨论。沿着源码看，它对提问顺序的安排比“有问题先问我”具体得多。

<!-- more -->

## 顺着 grill-me，找到 grilling

[grill-me/SKILL.md](https://github.com/mattpocock/skills/blob/main/skills/productivity/grill-me/SKILL.md?plain=1) 是调用入口：

```yaml
---
name: grill-me
description: A relentless interview to sharpen a plan or design.
disable-model-invocation: true
---

Call the Skill tool with "grilling".
```

`disable-model-invocation: true` 把这个入口留给用户主动调用，正文则要求加载 `grilling`。完整的访谈规则写在后者，理解这套 Skill 要把两份文件连起来读。

```text
grill-me/SKILL.md → grilling/
                   ├── SKILL.md           提问和调查规则
                   └── agents/openai.yaml 界面显示配置
```

[openai.yaml](https://github.com/mattpocock/skills/blob/main/skills/productivity/grilling/agents/openai.yaml) 只有展示名称和简介：

```yaml
interface:
  display_name: "Grilling"
  short_description: "Stress-test thinking a round of questions at a time"
```

真正值得读的是约 2 KB 的 [grilling/SKILL.md](https://github.com/mattpocock/skills/blob/main/skills/productivity/grilling/SKILL.md?plain=1)。这些文件提供指令，加载和子代理等能力由客户端提供；调用语法与元数据支持也以客户端为准。

## 它怎样安排一场需求讨论

### 先找决定之间的依赖

> Map this as a **design tree**: every decision branches into the decisions that hang off it.

作者要求把讨论组织成一棵决策树。以会员系统为例：

```text
会员如何获得？
├─ 管理员免费授予 → 谁能授予、何时撤销
└─ 付费购买
   └─ 本次是否包含购买流程？
      ├─ 不包含 → 从哪里同步会员状态
      └─ 包含 → 有效期、续费方式、支付后怎样生效
```

选择管理员授予，支付重试就不必继续讨论。收费还没确定就问“接哪家支付”，等于替需求方提前选了一条路。

这棵树由模型根据讨论维护，源码没有内置一份会员系统问卷。

### 当前能问的一起问，答案变了就调整

源码把“前提已明确、现在能讨论的问题”叫作 `frontier`，并要求：

> Ask the whole frontier in one round: number each question and give your recommended answer. Then wait for the user's answers before the next round.

一轮问完当前有条件讨论的问题，每题编号并给建议，然后等待回答。有先后依赖的问题留到下一轮。比如没确认自动续费，就先别问扣款失败重试几次。

问题还要写成回答“是”就能接受建议的形式：

> Word each question so "yes" accepts your recommended answer.

这能降低回答成本，但推荐仍要经过确认。每轮收到回答后，AI 还要重新判断下一步：

> Recompute the frontier and ask the next round.

需求方取消提前续费，后面就不再追问有效期叠加，转而确认未到期时是否禁止再次购买。问题会跟着答案变化。

### 项目事实自己查，业务选择交给人

> Finding _facts_ is your job, never the user's.

有没有用户表、支付回调在哪里、导出接口怎样校验权限，这些应该查代码。到期后能不能下载历史文件、退款是否撤销权益，则需要明确的业务约定。

源码要求派子代理调查环境事实。调查支付回调时，主代理可以继续问历史报表权限；依赖回调结果的实现选择，等结果回来再定。已有文档能回答的，也先读文档。

我很认可这一点：Agent 能读仓库，就不该把需求访谈变成让我口述项目结构。

### 所有分支处理完，再确认共同理解

> The session is done when the frontier is empty: every branch of the design tree visited, nothing left silently assumed. Do not act on it until the user confirms you have reached a shared understanding.

结束条件包含两件事：相关分支都处理完，没有默默留下的假设；需求方确认双方理解一致，才开始实施。

如果剩余问题都在等调查，暂时没什么可问，也还没结束。“不能新建导出”说清楚了，“旧文件能否下载”仍可能是一个未决项。

## 一句“续费先别做”，后面就得跟着变

用一段假设对话串起这些规则。前提是已经确认：沿用现有登录，做付费会员，只有一个等级，包含站内购买。以下只摘录关键问题。

```text
AI：
Q1：首期是否只提供固定 30 天的会员？
建议：先用固定 30 天，不按自然月计算。

Q2：是否只支持用户主动购买续费？
建议：先主动续费，不做自动扣款。

需求方：
30 天可以。续费先别做，第一版只允许到期后重新购买。

AI 下一轮：
Q1：未到期时，页面和服务端是否都禁止再次购买？
建议：都禁止，避免绕过页面重复下单。

Q2：到期后重新购买，是否从本次支付成功时计算 30 天？
建议：是，不沿用已过期的结束时间。
```

`Recompute` 就体现在这里。“提前购买怎样累计”从讨论中移除了，“未到期能不能下单”成了新的边界。这个回答会同时影响购买入口、服务端限制和验收条件。

如果 AI 只是聊天时答应缩减范围，写代码时仍然保留提前续费，访谈就没有起作用。退款、重复支付通知等尚未确认的事项，也应继续留在待办里。

## 我会再加一句交付要求

`grilling` 没有轮数上限，也没有固定的任务说明模板。“是否问全”仍由模型判断，可能漏问题，也可能问得过细。

我会补一句：

> 只追问会改变实现方向的问题。最后整理用户流程、不做的范围、可检查的验收条件和未决事项，让我确认后再开始实现。

这是对原流程的调整。我要留下的是一份能交接的任务说明：哪些已经决定，哪些明确不做，还有什么没定。下一位开发者接手时，不必重新猜一遍“会员系统”指的是什么。

## 其他 Skills，各自能做什么

同仓库的其他工具，按任务挑选即可：

| Skill | 能做什么 |
| --- | --- |
| [grill-with-docs](https://github.com/mattpocock/skills/blob/main/skills/engineering/grill-with-docs/SKILL.md) | 在访谈时同时澄清业务术语，记录词汇和必要的架构决策。 |
| [handoff](https://github.com/mattpocock/skills/blob/main/skills/productivity/handoff/SKILL.md) | 把当前对话压成交接文档，方便换会话或换 Agent。 |
| [to-spec](https://github.com/mattpocock/skills/blob/main/skills/engineering/to-spec/SKILL.md) / [to-tickets](https://github.com/mattpocock/skills/blob/main/skills/engineering/to-tickets/SKILL.md) | 把讨论整理成规格，再拆成有依赖关系、可独立验证的任务。 |
| [implement](https://github.com/mattpocock/skills/blob/main/skills/engineering/implement/SKILL.md) | 按规格实现、检查、调用审查，最后提交代码。 |
| [code-review](https://github.com/mattpocock/skills/blob/main/skills/engineering/code-review/SKILL.md) | 分两路检查：是否符合仓库规范，是否实现原始需求。 |
| [diagnosing-bugs](https://github.com/mattpocock/skills/blob/main/skills/engineering/diagnosing-bugs/SKILL.md) | 建立能失败的检查，复现、取证，再修复和回归。 |
| [tdd](https://github.com/mattpocock/skills/blob/main/skills/engineering/tdd/SKILL.md) | 用一条失败测试带出最小实现，逐个验证行为。 |
| [prototype](https://github.com/mattpocock/skills/blob/main/skills/engineering/prototype/SKILL.md) | 做可点击的逻辑演示，或生成几种 UI 布局供比较。 |
| [pr](https://github.com/mattpocock/skills/blob/main/skills/engineering/pr/SKILL.md) | 用前后证据、影响范围和回滚说明写 PR 正文。 |
| [wait-what](https://github.com/mattpocock/skills/blob/main/skills/productivity/wait-what/SKILL.md) | 补背景、沿用项目术语，用简化技术英语重新解释；中文需另加要求。 |
| [writing-for-agents](https://github.com/mattpocock/skills/blob/main/skills/productivity/writing-for-agents/SKILL.md) | 把 Skill、AGENTS.md 的触发条件和完成标准写清楚。 |

源码版本：2026-10-23 核对的 [`5beb35b`](https://github.com/mattpocock/skills/tree/5beb35b040e3de97e54fa9e386d7e42d15c295c2)。本文的会员对话用于讲解规则；表格按用途整理，不代表使用量排名。
