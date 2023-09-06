import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "Qzai 的博客",
  description: "A VitePress Site",
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Home', link: '/' },
    ],

    sidebar: [
      {
        text: '列表',
        items: [
          { text: 'VitePress-打造自己的博客网站', link: '/bold' },
          { text: '利用 Verdaccio 搭建自己的 npm 私有库', link: '/verdaccio' }
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/qzai666' }
    ]
  },
  ignoreDeadLinks: true
})
