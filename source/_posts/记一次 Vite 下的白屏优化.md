---
title: 记一次 Vite 下的白屏优化
date: 2025-07-09 16:23:53
tags: ['Vite','H5']
cover: https://i.pinimg.com/originals/be/6d/ed/be6ded46b365626b0812a41b75875d59.gif
---

## 起因

前几天，测试找我反馈说，我们有一个付费用户打不开我们网站了，我反手灵魂三问：
- 你复现出来了吗？
- 是用的 Google 吗？
- 我电脑上没问题啊？ 

大家沉默了三秒后，我意识到，应该是网络问题导致的资源加载慢。简单，咱给他加个 loading~

## 开干

这是咱的初始版本
```html
<!doctype html>
<html lang="en">
  <head>
     ....
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
```
请求网站时会先请求到 html 资源，然后加载完 js 文件后，再把元素渲染到 root 根节点。那么白屏的产生就是在网站加载 js 这一阶段。如果初始时在 root 节点里写一段 loading 动画，那么就会取代加载静态资源这一段的白屏了。

说干就干，打开 deepseek 开搜，很快代码就写好了
```html
    <div id="root">
      <style>
        html {
          background-color: #f0f2f5;
        }

        html[data-theme='dark'] .app-loading .app-loading-title {
          color: rgb(255 255 255 / 85%);
        }

        .app-loading {
          display: flex;
          width: 100%;
          height: 100%;
          justify-content: center;
          align-items: center;
          flex-direction: column;
        }

        .app-loading .app-loading-wrap {
          position: absolute;
          top: 50%;
          left: 50%;
          display: flex;
          transform: translate3d(-50%, -50%, 0);
          justify-content: center;
          align-items: center;
          flex-direction: column;
        }

        .app-loading .dots {
          display: flex;
          padding: 98px;
          justify-content: center;
          align-items: center;
        }
        .dot {
          position: relative;
          display: inline-block;
          width: 48px;
          height: 48px;
          margin-top: 30px;
          font-size: 32px;
          transform: rotate(45deg);
          box-sizing: border-box;
          animation: antRotate 1.2s infinite linear;
        }

        .dot i {
          position: absolute;
          display: block;
          width: 20px;
          height: 20px;
          background-color: #f92500;
          border-radius: 100%;
          opacity: 30%;
          transform: scale(0.75);
          animation: antSpinMove 1s infinite linear alternate;
          transform-origin: 50% 50%;
        }

        .dot i:nth-child(1) {
          top: 0;
          left: 0;
        }

        .dot i:nth-child(2) {
          top: 0;
          right: 0;
          animation-delay: 0.4s;
        }

        .dot i:nth-child(3) {
          right: 0;
          bottom: 0;
          animation-delay: 0.8s;
        }

        .dot i:nth-child(4) {
          bottom: 0;
          left: 0;
          animation-delay: 1.2s;
        }

        @keyframes antRotate {
          to {
            transform: rotate(405deg);
          }
        }

        @keyframes antRotate {
          to {
            transform: rotate(405deg);
          }
        }

        @keyframes antSpinMove {
          to {
            opacity: 100%;
          }
        }

        @keyframes antSpinMove {
          to {
            opacity: 100%;
          }
        }
      </style>
      <div class="app-loading">
        <div class="app-loading-wrap">
          <div class="app-loading-dots">
            <span class="dot dot-spin">
              <i></i>
              <i></i>
              <i></i>
              <i></i>
            </span>
          </div>
        </div>
      </div>
    </div>
```
完美。直接上线，明天给测试个惊喜~

## 反转

因为本地网络都很好，加上静态资源我们都有 CDN 处理，大家谁也没发现我的改动点，直到过了几天，测试又一次反馈这个用户打不开网站，而且从用户截图上看，也没有我新加的 loading~

我说怎么可能啊，测试从日志里爬出用户的访问链接，在自己电脑上某个不知名的浏览器上打开，真就白屏。

我调出 F12 定眼一看，代码最新，root 节点下面也有 loading 元素，继续查找才发现问题：
- css 资源给我请求了十几秒才加载出来。

我才发现，**css 也能阻塞渲染吗？**

## 调研

我在网上搜了一波【阻塞渲染】，结果显示 css 还真能阻塞，这咋和我十年前学 css 时说的不一样呢~

[MDN 阻塞渲染](https://developer.mozilla.org/zh-CN/docs/Glossary/Render_blocking)给出的解释是：


**阻塞渲染**指的是加载网站时阻止用户界面渲染的任何部分。阻塞渲染对网站性能不利，因为它增加了用户与网站交互的时间，例如查看内容或与控件交互的时间。

最常见的阻塞渲染原因是初始加载的 CSS 或 JavaScript 文件。

```html
<!-- 加载和解析 styles.css 会阻塞渲染 -->
<link rel="stylesheet" href="styles.css" />

<!-- 加载和解析 print.css 不会阻塞渲染 -->
<link rel="stylesheet" href="print.css" media="print" />

<!-- 在大屏幕上，加载和解析 mobile.css 不会阻塞渲染 -->
<link
  rel="stylesheet"
  href="mobile.css"
  media="screen and (max-width: 480px)" />
```

我通过浏览器扩展  URL Throttler 限制了测试环境中的 css 资源链接的请求速度，发现白屏确实硬控了我 10s,直到 css 加载成功。简简单单的白屏问题又背刺了我一刀，我又陷入了沉思。

我登录服务器，把打包后的 html 资源中的 css 链接加上 media="print"  属性，发现 css 确实不会阻塞渲染了，但是页面样式全没了，即使后面 css 加载完成，样式也没有恢复。我终于明白了 css 阻塞渲染的必要性。

看来是无法绕开阻塞渲染的方案了。

## 破局

试了多种方案后，我想到可以把 css 资源放在 body 后去加载，页面会不会先把 body 的 loading 渲染出来呢？

我在打包生成的 html 中，把 css 从 head 里提出来，扔到 body 后面，期待的一幕终于出现了。页面如期出现了我们的 loading。有了解题思路，剩下的就交给 deepseek.

问：帮我把 Vite 打包后生成的 css 放到 body 后面。
答：好的主人，以下是我为你生成的代码：
```js
# 在 vite 中的自定义插件
export default defineConfig({
  plugins: [
    {
      name: 'move-css-to-body',
      transformIndexHtml(html) {
        // 1. 提取 CSS 链接
        const cssLink = html.match(/<link rel="stylesheet" href="(.*?)">/)?.[0] || '';
        // 2. 移除原 head 中的 CSS
        html = html.replace(/<link rel="stylesheet" href="(.*?)">/, '');
        // 3. 在 body 末尾插入 CSS
        return html.replace('</body>', `${cssLink}</body>`);
      },
    },
  ],
});
```
一顿梭哈，上线~

# The end~

