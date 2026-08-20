---
title: Nuxt H5 接入 Sentry：安装、报错修复和必要性
date: 2026-08-20 15:30:00
tags: ['Sentry','Nuxt','前端监控','线上排查','H5']
---

# 写在开头

这次给一个 Nuxt H5 项目接入 Sentry，过程不只是跑一个安装命令。

真正需要想清楚的是：

- Sentry 到底怎么捕获错误；
- 哪些配置会影响上报量；
- source map、服务端启动、CDN 发版要怎么配；
- 监控到的错误里，哪些是业务失败，哪些才是真正需要修的异常。

# Sentry 的运行原理

Sentry 不是简单地“拿 console 的值”。

它主要通过几类入口捕获异常。

第一类是浏览器全局错误：

```ts
window.onerror
```

比如页面里直接抛：

```ts
throw new Error('Nuxt Button Error')
```

如果没有被 `try/catch` 接住，Sentry 就能捕获。

第二类是未处理 Promise：

```ts
window.onunhandledrejection
```

比如：

```ts
function loadEpisode() {
  return Promise.reject(new Error('load episode failed'))
}

loadEpisode()
```

这里不是同步抛错，而是返回了一个 rejected Promise。

调用方没有 `await` / `.catch()` 收口时，它就会变成 unhandled rejection。

第三类是框架集成。Nuxt / Vue 接入 Sentry 后，组件渲染、生命周期、事件回调里的错误，也会进入 Sentry 的错误处理链路。

第四类是手动上报：

```ts
Sentry.captureException(error)
Sentry.captureMessage('something happened')
```

# Nuxt 接入指南

Nuxt 项目可以直接用官方 wizard：

```bash
npx @sentry/wizard@latest -i nuxt --saas --org joyread --project reels-h5-front
```

它会帮你做这些事：

- 安装 `@sentry/nuxt`；
- 生成 `sentry.client.config.ts`；
- 生成 `sentry.server.config.ts`；
- 修改 `nuxt.config.ts`；
- 生成 source map 上传相关配置；
- 可能调整 `package.json` 的 `start` 命令。

如果 wizard 报：

```text
Client network socket disconnected before secure TLS connection was established
```

一般是本机到 Sentry wizard 接口的网络问题，不是项目代码问题。重试或者手动按文档配置即可。

## 客户端配置

客户端配置负责浏览器里的 JS 错误、Vue 错误、未处理 Promise、面包屑和前端性能数据：

```ts
import * as Sentry from '@sentry/nuxt'

const runtimeConfig = useRuntimeConfig()

Sentry.init({
  dsn: 'https://xxx@xxx.ingest.us.sentry.io/xxx',
  environment: runtimeConfig.public.APP_ENV,
  sampleRate: 0.2,
  tracesSampleRate: 0.1,
  beforeSend(event) {
    const isHostError =
      /postMessage|webkit/i.test(event.message ?? '') ||
      event.exception?.values?.some(exception =>
        /postMessage|webkit/i.test(exception.value ?? ''),
      )

    return isHostError ? null : event
  },
})
```

几个配置项要分清：

- `dsn`：错误发到哪个 Sentry 项目；
- `environment`：环境标识，例如 `production`、`test`、`development`；
- `sampleRate`：错误事件采样，这次项目用 `0.2`，也就是错误只上报 20%；
- `tracesSampleRate`：性能数据采样，例如页面加载、路由跳转、接口耗时，这次用 `0.1`；
- `beforeSend`：事件真正发送前的最后一道过滤，可以丢弃确定没价值的噪音。

这里特别容易搞错：`tracesSampleRate: 0.1` 不是“错误只上报 10%”。错误采样看的是 `sampleRate`。

## 服务端配置

Nuxt 有浏览器端，也有 Node 服务端。所以服务端也要配：

```ts
import * as Sentry from '@sentry/nuxt'

Sentry.init({
  dsn: 'https://xxx@xxx.ingest.us.sentry.io/xxx',
  environment: process.env.NUXT_PUBLIC_APP_ENV,
  sampleRate: 0.2,
  tracesSampleRate: 0.1,
})
```

服务端配置主要覆盖 SSR、Nitro、Node 进程里的异常。

## DSN、Token 和 source map

DSN 会被打包进前端产物里，它不是严格意义上的密钥。它的作用是告诉 SDK：事件要发到哪个项目。

`SENTRY_AUTH_TOKEN` 不一样。它是构建阶段上传 source map 用的，不应该进浏览器端，也不要命名成 `NUXT_PUBLIC_XXX`。

source map 的作用是把这种压缩堆栈：

```text
eNjEH1pB.js:4:17183
```

还原到源码位置。

但上传 source map 也意味着把可还原源码交给 Sentry，所以要看团队权限。生产构建里可以这样加载 token：

```bash
set -a
source /opt/deploy/reels-h5/sentry-build.env
set +a

pnpm run build

unset SENTRY_AUTH_TOKEN
```

## Replay 先关掉

Session Replay 对排查问题有帮助，但它也会带来额外性能、流量和隐私成本。

如果当前目标只是先接错误监控，可以先关掉：

```ts
Sentry.init({
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
})
```

# 服务端和发布脚本接入

wizard 可能会把 `package.json` 的 `start` 改成：

```json
{
  "start": "node --import ./.output/server/sentry.server.config.mjs .output/server/index.mjs"
}
```

这个 `--import` 的作用是：在 Nuxt 服务端入口执行前，先加载 Sentry 服务端配置。

但线上如果用 PM2 直接启动：

```bash
pm2 start server/index.mjs --name reels-h5
```

那 `package.json` 的 `start` 根本不会执行。

所以 PM2 脚本也要带上：

```bash
SENTRY_NODE_ARGS="--import=./server/sentry.server.config.mjs"

PORT=$PORT HOST=0.0.0.0 pm2 restart "$APP_NAME" \
  --node-args="$SENTRY_NODE_ARGS" \
  --update-env
```

`--update-env` 表示重启时使用当前 shell 里的最新环境变量。

# 监控到的两个错误

## 错误一：catch 里再次请求失败

播放页里有一个流程：剧集详情接口失败后，会刷新目录和订阅状态。

问题是：原始错误已经进入 catch 了，但 catch 里又请求了一次。如果这次刷新也失败，新的错误还是会抛出去。

最小处理：

```ts
async function handleEpisodeDetailRequestError(error: unknown) {
  // 剧集详情接口报错后，先刷新目录和订阅状态，页面再按最新状态决定后续行为。
  try {
    await refreshPlayCatalogAndSubscription()
  } catch (refreshError) {
    console.error('[play] refresh catalog after episode error failed', refreshError)
  }

  const errorCode = resolveRequestErrorCode(error)

  if (errorCode === 500001) {
    currentEpisodeErrorCode.value = 500001
    currentEpisodeState.value = null
    return 'show-unlock'
  }

  return 'idle'
}
```

这里不是要吞掉所有错误，只是避免“补同步失败”打断原来的业务错误处理。

## 错误二：播放器 switchURL 未处理 Promise

播放器切流是异步的：

```ts
await player.switchURL(props.src, {
  seamless: false,
  startTime: 0,
})
```

如果 watcher 里直接调用：

```ts
syncPlayer()
```

一旦 `switchURL()` reject，就会变成 unhandled rejection。

处理方式很小：

```ts
void syncPlayer().catch(error => {
  console.error('[short-player] sync player failed', error)
  finishPlayerLoading()
  pendingSourceSwitchComplete = false
})
```

这个改动的目标不是“修好播放器所有失败场景”，而是先把异步错误收口，避免它作为未处理 Promise 污染 Sentry。

# 最后

这次接入后，我对 Sentry 的定位更明确了：

它不是用来统计所有失败的。

余额不足、订阅不足、用户取消支付、后端明确返回的业务错误码，更适合走业务提示或埋点。

Sentry 应该盯住的是那些没有被预期处理、会打断用户流程、需要工程侧修复的问题。

# 参考资料

- [Sentry Nuxt 文档](https://docs.sentry.io/platforms/javascript/guides/nuxt/)
- [Sentry Nuxt Source Maps](https://docs.sentry.io/platforms/javascript/guides/nuxt/sourcemaps/)
- [Sentry JavaScript Session Replay](https://docs.sentry.io/platforms/javascript/session-replay/)
- [Sentry Wizard](https://docs.sentry.io/product/sentry-basics/integrate-frontend/create-new-project/#wizard)
