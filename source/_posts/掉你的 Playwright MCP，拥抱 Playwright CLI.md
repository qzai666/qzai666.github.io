---
title: 掉你的 Playwright MCP，拥抱 Playwright CLI
date: 2026-04-30 13:41:38
tags:
---
![Playwright CLI 调试页](/image/05.png)
记得在上篇帖子我有推荐 Codex 安装 Playwright Mcp 去做自动化测试，但是最近我在本地调试前端项目时，被 Playwright MCP 折腾了一圈。

我的需求其实很简单：\
让 AI 接管我当前已经打开的 Chrome，打开本地项目页面、点几个按钮、看一下 DOM、截个图。

结果一开始走 MCP，问题一个接一个：

*   经常新开一个独立浏览器
*   登录态和我当前 Chrome 不共享
*   想复用当前浏览器页签很麻烦
*   截图还可能截到另一个屏幕
*   每个项目调试状态不一致

后来我发现，很多场景下根本不需要 MCP。直接用 `playwright-cli`，反而更清晰、更可控。

## MCP 的问题

Playwright MCP 的体验看起来很智能，但它有一个很明显的问题：它通常运行在自己的浏览器上下文里。

这意味着你当前 Chrome 里已经登录好的状态，它未必能用。

比如你本地项目已经登录了页面

```text
http://localhost:8080
```

但 MCP 可能还是会打开一个新浏览器，然后跳到登录页。\
这对后台系统调试非常难受，因为后台项目往往依赖 SSO、cookie、localStorage、权限状态。

这类问题不是业务问题，而是调试工具本身带来的复杂度。

## Playwright CLI 更直接

`playwright-cli` 最直接的好处是，它可以接受你的当前页签。一般我们的登录信息都存在于浏览器缓存中，那我们还在一个浏览器内，我们的登录状态就不会丢失，完美解决了我们遇到的问题。整个配置也很简单，你可以参考它的 [Github地址](https://github.com/microsoft/playwright-cli).

在 Node.js 18 及以上安装

```bash
npm install -g @playwright/cli@latest
playwright-cli --help
```

安装他的 skills 方便 AI 调用

```bash
playwright-cli install --skills
```

新建 output 文件存放你的截图信息，你可以放在自己项目根目录下，我是放在 codex 根目录下统一管理

```bash
mkdir -p "$HOME/.codex/playwright-cli"

cat > "$HOME/.codex/playwright-cli/chrome.config.json" <<'EOF'
{
  "extension": true,
  "outputDir": "$HOME/.codex/playwright-cli/output",
  "browser": {
    "browserName": "chromium",
    "launchOptions": {
      "channel": "chrome"
    }
  }
}
EOF

```

在浏览器安装拓展程序 Playwright Extension 赋予它全部权限

所有的准备环节就结束了

## 我的推荐用法

对于本地前端项目，我现在更推荐这套方式：

先在浏览器打开你要调试的页面，然后终端输入

```bash
cd ~/.codex/playwright-cli

playwright-cli attach \
  --config chrome.config.json \
  --extension=chrome \
```

浏览器会打开 playwright 的调试页面，选中你要调试的页面，赋予权限

![Playwright CLI 页面选择](/image/04.jpg)

打开页面：

```bash
playwright-cli --session my-current-chrome goto "http://localhost:8080"
```

查看 DOM：

```bash
playwright-cli --session my-current-chrome snapshot
```

截图：

```bash
playwright-cli --session my-current-chrome screenshot
```

如果只是快速打开页面，不需要 DOM 操作，也可以直接用系统 Chrome：

```bash
open -a "Google Chrome" "http://localhost:9528/#/en/memberMange/index"
```

当然这些功能可以直接让 Codex 帮你实现，因为我们已经全局安装了它的 Skills, 可以直接操控 Ai 帮你执行这些命令。

例如在 Codex 中输入，帮我打开 X 路由，帮我测试按钮点击是否有反应，帮我执行搜索功能等一系列操作。甚至你可以搭配 Codex 的定时任务，让他全天帮你操作浏览器干任何事情，随你所想。

## 总结

Playwright MCP 不是不能用，但它更像是一层封装。\
当你需要稳定、可控、可复现地调试本地项目时，`playwright-cli` 更直接。

尤其是这些场景：

*   本地后台项目
*   已登录 Chrome
*   多项目切换
*   需要截图
*   需要 AI 帮你点页面、看 DOM、查状态
*   不想每次重新登录

我的结论是：

> 如果你只是想让 AI 可靠地操作浏览器，别急着上 MCP。\
> 先试试 Playwright CLI。它更简单，也更接近你真正想控制的东西。
