---
title: 手机端远程接管 Codex，并走中转站额度
date: 2026-05-18 17:50:11
tags: ['codex','ChatGPT','AI']
---

<p align="center"><img src="https://p0-xtjj-private.juejin.cn/tos-cn-i-73owjymdk6/410f657abee7405db58b107f015a79f3~tplv-73owjymdk6-jj-mark-v1:0:0:0:0:5o6Y6YeR5oqA5pyv56S-5Yy6IEAg5oiR6KaB6K6p5YWo5LiW55WM55-l6YGT5oiR5b6I5L2O6LCD:q75.awebp?policy=eyJ2bSI6MywidWlkIjoiNDAwMTg3ODA1NjY0NjU4OSJ9&rk3s=f64ab15b&x-orig-authkey=f32326d3454f2ac7e96d3d06cdbb035152127018&x-orig-expires=1779702474&x-orig-sign=paTEPcxm2i3WWP5pjVLkLlrpPQ4%3D" alt="已生成图像 1.png"></p>

上周，手机端 ChatGPT 的 Codex 操控电脑端的功能陆陆续续放开，大家逐步可以将战场在手机上拉开了。打开 Codex 能看到以下图的，就证明你已经在灰度内了，没有的可以换个账号试试。

<p align="center"><img src="https://p0-xtjj-private.juejin.cn/tos-cn-i-73owjymdk6/bbf020dbd3474928924c330e1e8a9a63~tplv-73owjymdk6-jj-mark-v1:0:0:0:0:5o6Y6YeR5oqA5pyv56S-5Yy6IEAg5oiR6KaB6K6p5YWo5LiW55WM55-l6YGT5oiR5b6I5L2O6LCD:q75.awebp?policy=eyJ2bSI6MywidWlkIjoiNDAwMTg3ODA1NjY0NjU4OSJ9&rk3s=f64ab15b&x-orig-authkey=f32326d3454f2ac7e96d3d06cdbb035152127018&x-orig-expires=1779702474&x-orig-sign=dtniOQZ%2BIbEutlSOQZXPHY1GY68%3D" alt="20260518-162203.jpg" width="30%"></p>

Codex 进入 ChatGPT 手机端后，最实用的变化不是“手机也能用 Codex”，而是你可以在外面远程接管本机正在运行的 Codex 任务。

不用公网 IP，不用内网穿透，也不用第三方远程 App。电脑上跑着 Codex，手机上的 ChatGPT App 直接连进来，权限确认、方案选择、任务回复，都能在手机上处理。

那问题来了：如果桌面端平时用的是中转站额度，手机端还能不能一起用？

答案是：可以。

关键在于理解 Codex 的两层结构：

- **Auth 层**：负责 ChatGPT 登录状态、移动端入口、MFA 验证、插件权限和连接授权。
- **Model 层**：负责实际模型请求，也就是请求到底发给哪个 provider。

所以思路很明确：

> 登录继续走 ChatGPT，保证手机端能连上；模型请求改走支持 Responses API 的中转站，让实际消耗落在中转站额度里。

## 一、先完成手机端连接

不要一上来就改配置。正确顺序是先把官方登录链路跑通。

你需要准备：

1. ChatGPT 手机 App，并且侧边栏里已经出现 Codex 入口。
2. Codex 桌面端。
3. ChatGPT 账号开启 MFA 多因素验证。
4. 一个支持 OpenAI Responses API 的中转站（我用的 [CPA](https://help.router-for.me/cn/introduction/quick-start)）。
5. 中转站生成的 API Key。

手机端第一次进入 Codex 时，通常会要求完成桌面端验证。如果账号还没开 MFA，可以去 ChatGPT 网页端的个人中心里找到安全设置，开启 Authenticator App。

推荐使用：

- Google Authenticator
- Microsoft Authenticator

完成 MFA 后，回到 ChatGPT App 继续走 Codex 连接流程，桌面端点击允许即可。

这一步很关键：先让 Codex 确认你是正常登录的 ChatGPT 用户，再去改模型 provider。

## 二、修改 auth.json

打开配置文件：

```bash
~/.codex/auth.json
```

只调整下面两个字段，其他内容不要动：

```json
{
  "auth_mode": "chatgpt",
  "OPENAI_API_KEY": null
}
```

含义如下：

- `auth_mode = "chatgpt"`：登录鉴权继续走 ChatGPT 账号。
- `OPENAI_API_KEY = null`：避免 Codex 优先使用官方 API Key 请求 OpenAI 官方接口。

## 三、修改 config.toml

继续打开：

```bash
~/.codex/config.toml
```

在文件末尾追加类似配置：

```toml
model = "你的中转站模型名"
model_provider = "cliproxyapi"
personality = "pragmatic"

[model_providers.cliproxyapi]
name = "cliproxyapi"
base_url = "http://127.0.0.1:8317/v1"
wire_api = "responses"
experimental_bearer_token = "你的中转站 API Key"
requires_openai_auth = true
```

需要注意几个字段：

- `model_provider` 要和下面 `[model_providers.xxx]` 的名称一致。
- `model` 要写中转站要求的完整模型名。
- `base_url` 填中转站提供的 API 地址。
- `wire_api = "responses"` 很关键，Codex 当前走的是 OpenAI Responses API。
- `experimental_bearer_token` 填你的中转站 API Key。
- `requires_openai_auth = true` 用来保持 Codex 的 ChatGPT 登录体系。

进行下一步之前，大家先参考 [CPA](https://help.router-for.me/cn/introduction/quick-start) 的文档，配置好服务，如果使用其他中转商的话，更改下配置里中转商的名字，下面步骤都一样。

![image.png](https://p0-xtjj-private.juejin.cn/tos-cn-i-73owjymdk6/378879a4b4b14f8999f6f332181b516b~tplv-73owjymdk6-jj-mark-v1:0:0:0:0:5o6Y6YeR5oqA5pyv56S-5Yy6IEAg5oiR6KaB6K6p5YWo5LiW55WM55-l6YGT5oiR5b6I5L2O6LCD:q75.awebp?policy=eyJ2bSI6MywidWlkIjoiNDAwMTg3ODA1NjY0NjU4OSJ9&rk3s=f64ab15b&x-orig-authkey=f32326d3454f2ac7e96d3d06cdbb035152127018&x-orig-expires=1779702474&x-orig-sign=haHuUVtg%2FjdphqMW%2F5BeD84vc24%3D)

## 四、重启 Codex 并验证

保存两个文件后，完全退出 Codex，再重新打开。

先在桌面端发一条测试消息。如果能正常回复，再去中转站后台查看用量记录。

如果后台出现了这次请求的消耗，就说明模型层已经切到中转站。

这时再打开 ChatGPT 手机 App 里的 Codex，手机端和桌面端会保持同一个任务入口。手机负责远程接管，实际模型消耗走你配置好的中转站额度。

## 五、常见问题

### 1. 顺序不能反

先登录 ChatGPT，先完成手机端和桌面端绑定，再修改配置。

如果先改配置再登录，可能导致 Auth 层异常。

### 2. 电脑不能休眠

手机端连接的是本机 Codex。电脑一旦休眠，手机端自然连不上。

建议关闭休眠。必要时可以使用 HDMI 显示器欺骗器，让主机保持工作状态。

### 3. 手机后台要保活

安卓用户尤其要注意后台权限、通知权限和电池管理策略。

如果 ChatGPT App 被系统杀后台，长任务提醒可能会中断。

### 4. 历史对话可能消失

切换 provider 后，之前的历史对话可能看不到。

这是 Codex 的机制问题，会话和 provider 有绑定关系，切换后相当于进入新的工作区。

## 六、这套方案适合谁

这套方案适合已经在桌面端使用 Codex，并且希望用手机远程接管长任务的人。

比如：

- 出门后继续审批 Codex 的权限请求。
- 在手机上回复任务分支选择。
- 远程查看长任务进度。
- 桌面端保持中转站额度，手机端只负责接管交互。

它的本质不是让手机端直接调用中转站，而是：

> 手机端继续使用 ChatGPT 的 Codex 入口，桌面端负责把模型请求转发到你配置好的 provider。

也就是说，ChatGPT 负责证明你是谁，中转站负责实际模型消耗。
