---
title: AI 加持下，你的反爬技术还撑得住吗？
date: 2026-07-09 19:40:00
tags: ['AI','反爬','前端安全','Chrome DevTools']
---

<p align="center"><img src="/image/anti-crawler-ai/cover.png" alt="AI 加持下的前端反爬分析封面"></p>

这次我们拿 ReelShort 的线上页面做了一次完整排查。

一开始只是想看一个播放接口的返回数据，结果页面一打开 F12 就被 `debugger` 卡住；接口返回也不是标准 JSON，而是一段很长的加密字符串；再往后看，关键播放信息也不是直接明文返回。

这类前端反爬以前确实能拖慢人工分析：你要先处理 `debugger`，再找接口，再追混淆后的打包代码，最后判断数据是在哪里被还原的。

但现在 AI 介入以后，只要关键逻辑还在前端，定位成本会被迅速压低。

闲话不多说，我们直接进入实战。

# Chrome 的 Override content

先看一个很关键的调试工具：Chrome DevTools 的 `Override content`。

在 `Network` 面板中，右键某个请求，就可以看到这个菜单。

<p align="center"><img src="/image/anti-crawler-ai/override-content.png" alt="Chrome DevTools Override content 菜单"></p>

它的核心作用是：在你本地覆盖远程资源的响应内容。

比如你要临时修改某个线上 JS，不用等服务端发版，也不用真的改线上代码。Chrome 会在本地保存一份覆盖文件，刷新页面时优先使用你本地改过的版本。

基本流程：

1.  打开 DevTools 的 `Network`
2.  找到目标 JS 请求
3.  右键目标请求，选择 `Override content`
4.  按提示选择一个本地目录
5.  Chrome 会开启 Local overrides
6.  在本地覆盖文件里修改资源内容
7.  刷新页面验证效果

这一点在调试线上反爬逻辑时非常关键。

因为你不需要真正改线上代码，也不影响其他用户。整个修改只发生在自己的浏览器里。

# F12 打开控制台，全是 debugger 怎么办？

这个站点打开 DevTools 后，页面会直接暂停。

<p align="center"><img src="/image/anti-crawler-ai/paused-debugger.png" alt="页面被 debugger 暂停"></p>

DevTools 里看到的是一个匿名脚本：

```js
(function anonymous() {
  debugger
})
```

很多人看到这里会直接懵，因为它不是正常源文件，而是 `VMxxx` 这种动态生成的脚本。

但这个时候不要盯着 `VMxxx` 看。它只是运行结果，不是源头。

这里可以分两种情况处理。

## 方案 1、最直接

如果只是被 `debugger` 语句断住，最直接的办法是关掉 DevTools 右上角的断点暂停按钮。

<p align="center"><img src="/image/anti-crawler-ai/disable-debugger-pause.png" alt="Chrome DevTools 禁用 debugger 暂停按钮"></p>

关掉这个按钮后刷新页面，就不会再因为普通 `debugger` 语句停住。这个方式适合先把页面跑起来，继续看请求、变量和调用链。

## 方案 2、最权威

如果限制不只是普通 `debugger` 暂停，而是通过其他逻辑反复检测开发者工具，那就要回到源代码层面处理。可以参考前面的 `Override content`，把触发逻辑改掉。

在 `Sources` 里全局搜索 `debug` 相关字眼。

<p align="center"><img src="/image/anti-crawler-ai/source-overrides.png" alt="Chrome DevTools Sources Local overrides"></p>

最后我们在 `_app` 的打包文件里找到了触发位置，主要限制内容就在下面这个 JS 文件里。

<p align="center"><img src="/image/anti-crawler-ai/debugger-location.png" alt="定位到 Function debugger 触发位置"></p>

核心逻辑大概是这种形式：

```js
setInterval(function () {
  Function("debugger")()
}, 1000)
```

这类代码的目的很简单：只要你开着 DevTools，就不断触发断点，让你没法正常看请求、看变量、看调用栈。

处理方式也很直接：用 `Override content` 保存本地覆盖文件，然后把触发断点的逻辑改成空逻辑。

1.  在 `Network` 找到对应的 `_app-xxx.js`
2.  右键 `Override content`
3.  允许 Chrome 创建本地覆盖文件
4.  搜 `Function("debugger")`
5.  把它替换成空逻辑

例如：

```js
setInterval(function () {}, 1000)
```

或者更小改动：

```js
Function("")()
```

保存后刷新页面，这个反调试逻辑就在你的本机失效了。

# 接口返回加密，怎么还原？

这次重点看的接口是：

```text
/api/video/book/getChapterContent
```

Network 里复制出来的 curl 参数很多，包含 `apiversion`、`channelid`、`clientver`、`devid`、`session`、`sign`、`ts`、`uid` 等字段。

但接口返回不是标准 JSON，而是一段长字符串，看起来还套了一层 base64 形式的编码处理。

<p align="center"><img src="/image/anti-crawler-ai/base64-response.png" alt="接口返回 base64 加密长字符串"></p>

这种情况基本可以判断：前端拿到 response 以后，会在本地通过某段解码逻辑，把这段字符串还原成自己能用的 JSON。

这时没必要先硬猜算法。我们可以直接把目标交给 AI：去 `Sources` 里的源码中定位 response 的解密逻辑。

<p align="center"><img src="/image/anti-crawler-ai/ai-decode-location.png" alt="AI 定位前端解密逻辑"></p>

可以看到，AI 很快就帮我们定位到了加密方式和解码位置。我们甚至不需要先完全读懂它是怎么实现的，可以继续让 AI 根据这段逻辑写一个解析脚本，把接口数据直接展示出来。

到这里，调试链路就基本打通了：`debugger` 能处理掉，加密响应也能被还原成可读数据。

# AI 在这里改变了什么？

如果纯人工分析，流程大概是：

*   打开 DevTools
*   被 debugger 卡住
*   手动找 chunk
*   手动搜接口
*   手动格式化混淆 JS
*   手动追 webpack module
*   手动判断解密链路
*   手动写脚本验证

这个过程很费时间。

但 AI 加进来以后，很多步骤会变成半自动化：

*   帮你从 HTML 里提取当前页面加载的 chunk
*   帮你批量搜索 `debugger`、接口名和解密函数
*   帮你抽出 webpack module
*   帮你把 minified 代码翻译成可读流程
*   帮你定位浏览器端解码逻辑
*   帮你对比接口返回和页面实际播放行为

以前反爬的目标是“让人看不懂、找得慢”。

现在的问题是，AI 很擅长做重复搜索、符号追踪和代码归纳。只要核心逻辑还在前端，AI 就能帮人更快找到它。

# 反爬还应该怎么做？

前端混淆、debugger trap、响应加密都不是完全没用。

它们能挡住低成本脚本，也能拦住一部分只会复制 curl 的人。

但它们不能承担核心安全职责。

真正关键的保护，还是应该放在服务端：

*   播放地址做短 TTL
*   m3u8 和 ts 分片都做权限校验
*   URL 与账号、设备、区域、时间窗口绑定
*   对异常播放路径做行为分析
*   对高价值内容加 DRM 或动态水印
*   对批量请求做风控，而不是只检查入口接口
*   客户端密钥不要长期固定在 bundle 里

如果你的核心保护逻辑是：

```text
前端生成 sign
前端保存 key
前端解密响应
前端拿到真实播放地址
```

那它最多只能算“混淆”，不能算“安全”。

# 总结

这次链路很典型：

```text
Override content / Local overrides
-> 绕过前端 debugger
-> 找接口调用点
-> 借助 AI 定位前端解密逻辑
-> 确认接口响应会在浏览器端还原成业务数据
```

AI 没有让反爬失效，但它显著降低了分析门槛。

过去你可以指望混淆、动态 `debugger`、接口加密拖住对方半天。现在只要对方有清晰目标，再加一个能读代码、能跑脚本、能总结调用链的 AI 助手，这些成本会被压得很低。

所以问题不是“还要不要做前端反爬”。

问题是：你有没有把前端反爬误当成真正的安全边界。
