---
title: 来聊聊 Codex 高效编程的正确姿势
date: 2026-04-12 14:00:00
tags: ['Nuxt','codex']
---


<p align="center"><img src="https://p9-xtjj-sign.byteimg.com/tos-cn-i-73owjymdk6/b2deba3614024be8ac8da6e7c51910a6~tplv-73owjymdk6-jj-mark-v1:0:0:0:0:5o6Y6YeR5oqA5pyv56S-5Yy6IEAg5oiR6KaB6K6p5YWo5LiW55WM55-l6YGT5oiR5b6I5L2O6LCD:q75.awebp?rk3s=f64ab15b&x-expires=1777787607&x-signature=ZJEbDGDZshaA24XW0pNlCoKnmjg%3D" alt="HFJYHg2bYAAZYIf.jpeg"></p>

# 前言

继 Cursor 拉跨，Claude Code 渠道匮乏之后，Codex 成为了我的新宠。最近纯 AI 编程了一个前端工程项目后，对他的“驯服”，深有领悟，今日与众道友分享一番。

# 项目简介

先说下我这次项目的基本情况哈，以便后续让大家了解 Codex 帮我完成了哪些工作。

面向 C 端用户的一个 H5 短剧播放网站，内容涵盖搜索，充值，视频播放等功能。技术栈为 Nuxt4、Ts、Tailwindcss、Vant-ui、Scss 等。

# 规范约束

对于一个前端项目而言，Codex 做起来还是相对简单的，我们只需要约束好工程规范，剩下的就是需求喂给他就行。

Codex 在读取项目目录的时候，首先都会先去找 **AGENTS.md** 文件，这是项目里的入口约定，告诉 Codex 进入这个仓库要遵守什么、先读哪个 skill。例如去约定哪些文件不能动，创建文件时的命名规则等。

适合放在 AGENTS.md 里的内容：

*   这个仓库做代码任务时必须先读哪个 skill
*   项目通用原则，比如“不要过度抽象”“不要擅自改翻译文件”
*   特殊目录说明，比如 app/、api/、stores/ 怎么组织
*   提交、测试、构建的默认要求
*   哪些文件不能随便动
*   多人协作规则，比如不要回滚用户改动

至于 skill,就是具体执行细则，也就是真正的工作流和编码规范。

适合放在 SKILL.md 里的内容：

*   具体编码风格，比如优先简单直接、逻辑直白、少做兜底处理
*   注释规则，比如超过五行的业务逻辑方法加中文注释
*   API 使用规则，比如按接口字段类型直接用，不兼容旧结构
*   页面初始化规则，比如首屏逻辑放后面，用显式 initXxxPage()
*   UI 规则，比如 Tailwind 优先用 mt-\[16px] 这种像素写法,不要写 mt-6 这种 spacing scale 写法
*   i18n 规则，比如不直接使用文案，采用 t('xxx') 的写法，旁边备注好中文
*   验证规则，比如普通改动跑 pnpm lint，路由/构建相关再跑 pnpm build，校验时走 playwright 打开页面自测功能
*   提交规则，比如 commit 前缀、提交后是否推送

可以说 AGENTS.md 和 SKILL.md 文件就是我们对 AI 的完全约束，不让他天马行空的去帮我们完成新需求。我碰到过多次 AI，做接口联调时，不信任接口数据，每一次都要做判断兜底，生成了很多无用的代码，然后让他完全信任接口数据和返回格式，并生成对应 skill 后，代码清爽了很多。

包括很多 UI 规范，如果搞一些自己的项目，没有 UI 设计，可以直接用现成的 [design.md](https://github.com/VoltAgent/awesome-design-md) 做规范喂给 AI，做出来的界面也会更舒服一些。

所以，对 AI 的驯服，主要就是在于 skill 文档的描述，写的越详细，他的代码就越目标化。

# MCP 和技能的使用

现在很多第三方的服务平台，都有自己的 MCP 服务 或 Plugin 暴漏给 AI 提供服务，使它能更好的为我们完成工作。对前端而言，有几个很棒的工具。

### Apifox MCP

前后端联调很重要的一点就是接口文档了，我们项目文档集成在 Apifox 上，只要接口文档上对字段描述清晰，传参的类型变量定义完整，就可以直接复制文档的 id,让 AI 根据项目文档完成功能联调。

尤其在做一些管理后台的增删改查需求时，把接口 id 和原型图发给他，再加上一些需求描述，就可以直接帮你完成项目功能。

使用限制：需开通编辑者权限，每个项目都要配一个 MCP 服务。

详见[文档](https://docs.apifox.com/6327888m0)

### Figma  MCP

Figma  MCP 可以直接帮我们绘制好界面上的 UI 图，但是一些切图处理的不好，有些静态图是 UI 做了多层图层后生成的，需要我们自己切下来，告诉他引用位置，之后他会对照这个图把其他元素渲染好。使用过程中，我发现 AI 很爱做 reactive 定位处理，这个也要在 skill 里对他做限制，尽量使用 flex 布局。

使用限制：需开通编辑者权限，企业版的账号开一个编辑者，需要每个月大几百的支出，建议大家可以自己搞个教育版账号，将图复制过来一份开发调用。

详见[文档](https://help.figma.com/hc/en-us/articles/35281350665623-Figma-MCP-collection-How-to-set-up-the-Figma-remote-MCP-server-preferred#h_01KMDZ40NENYMHTWFPWS7AFPQZ)

### Playwright

可以调用浏览器的服务，非常适合做一些回归测试。可以搭配 Figma MCP 对 UI稿完成校验，也适合做项目报错时的走查。

我目前只用到这三个 MCP，当把他们组合起来之后，你就会发现真的是解放双手啊。

例如：对于列表页，你可以说

> 根据 UI 地址：xxx。完成页面绘制，注意顶部标题栏要做吸顶处理。列表数据调接口取值，参考接口 id:xxx。空数据时，引用空图文件 xxx.png。整体页面完成后，调用 playwright 打开浏览器的 H5 模式，对照一遍 UI 完成校验

# 结尾

以上就是我近期的一些使用感悟，大家一定要多拥抱 AI 去做开发，可能很多朋友用起来会觉得：

「嗯，是很不错，但感觉他也就只能帮我做个小模块而已，做多了就瞎改起来了」

但，请相信 AI 的强大，丰富好你的 skill 文件，每一次对他的”调教“，都会让它下一次的编程，离你想象中更进一步。

<p align="center"><img src="https://p9-xtjj-sign.byteimg.com/tos-cn-i-73owjymdk6/b5b4c02ebc024d6fa653f6de292e8ff1~tplv-73owjymdk6-jj-mark-v1:0:0:0:0:5o6Y6YeR5oqA5pyv56S-5Yy6IEAg5oiR6KaB6K6p5YWo5LiW55WM55-l6YGT5oiR5b6I5L2O6LCD:q75.awebp?rk3s=f64ab15b&x-expires=1777787607&x-signature=pprzo33NBJp%2BeaBEEoPISHBTyHw%3D" alt="20210324105052601.gif"></p>
