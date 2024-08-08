---
title: vue3-h5-template 简易版搭建过程
date: 2024-07-03 20:28:53
tags: 框架
cover: https://i.pinimg.com/originals/79/75/55/797555922a719c6a4082158d3f1a51f4.gif
---

# 写在开头
因为项目频繁创建，搭建一个公用的模板方便使用。采用的是 vue3+vite5+vant+tailwind+pinia+vue_i18n 作为基础模板。
[项目地址](https://github.com/qzai666/vue3-h5-template)


# vue3+vite
这个直接照着官网的步骤开敲就行，ts 看大家需要了。如果项目要长期维护，就加上一下。强制自己痛一痛也就会了。
[官网地址](https://cn.vuejs.org/guide/quick-start.html) 默认是用 vite 去下载的。建议大家用pnpm安装。

# vant
[vant](https://vant-ui.github.io/vant/#/zh-CN/quickstart) 建议采用按需引入的方式去配置。
Tips：
我在按照按需引入配置时，发现导入不成功，现在用的是全量引入方式；
我看了 这个插件的 [Issues](https://github.com/unplugin/unplugin-vue-components/issues) 也有很多人在0.27版本提出问题。
后期看下如果新版修复了这个问题 还是建议采用按需引入。


# tailwind 
参照[官网](https://tailwindcss.com/docs/installation/using-postcss)配置。【Installation】选择第二种 【Using PostCSS】这种是兼容 vite 的。 

# 多语言
多语言用的是 vue i18n. 搭配 pinia 来做语言的切换和存储。
main.ts 文件
```ts
import './assets/style/main.scss'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import i18n from './lang'

import { Button, Toast, Field, Popover } from 'vant'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(i18n)
app.use(Button)
app.use(Toast)
app.use(Field)
app.use(Popover)

app.mount('#app')
```
i18n.ts 文件
```ts
import { createI18n } from 'vue-i18n'
import { createPinia } from 'pinia'
import { createApp } from 'vue'
import App from '../App.vue'

const pinia = createPinia()
const app = createApp(App)
app.use(pinia)

import { useSystemStore } from '@/stores/system'

const useSystem = useSystemStore()

import zh_Hans from './zh_Hans.js'
import en from './en.js'

import { Locale } from 'vant'
import enUS from 'vant/lib/locale/lang/en-US'

Locale.use('en-US', enUS)

const i18n = createI18n({
  locale: useSystem.lang,
  legacy: false,
  messages: {
    en,
    zh_Hans
  }
})

export default i18n
```
pinia 中 system.ts 设置系统语言
```ts
import { defineStore, acceptHMRUpdate } from 'pinia'

interface State {
  state_lang: string
}

export const useSystemStore = defineStore({
  id: 'system',
  state: () =>
    <State>{
      state_lang: localStorage.getItem('lang') ? localStorage.getItem('lang') : 'en'
    },
  getters: {
    // 系统语言
    lang: (state): string => {
      return state.state_lang
    }
  },
  actions: {
    changeLang(lang: string) {
      this.state_lang = lang
      localStorage.setItem('lang', lang)
    }
  }
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useSystemStore, import.meta.hot))
}
```

vue 文件中去引用和切换语言
```vue
<script setup lang="ts">
import { ref, reactive, toRefs } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSystemStore } from '@/stores/system';

const { locale } = useI18n()
const useSystem = useSystemStore()
const showPopover = ref(false);

// 通过 actions 属性来定义菜单选项
const actions = [
    { text: '中文', lang: 'zh_Hans' },
    { text: 'English', lang: 'en' }
];

const onSelect = (action: any) => {
    changeLang(action.lang)
};


const changeLang = (lang: string) => {
    locale.value = lang
    useSystem.changeLang(lang)
}


</script>

<template>
    <div class="page p-[20px]">
        <div class="h-[40px]  w-full">
            {{ $t('hello') }}
        </div>
        <div class="h-[40px]  w-full">
            {{ $t('welcome', { x: 'Q仔' }) }}
        </div>
        
        <van-popover v-model:show="showPopover" :actions="actions" @select="onSelect">
            <template #reference>
                <van-button type="primary">{{ $t('change') }}</van-button>
            </template>
        </van-popover>



    </div>
</template>
```

# 关于移动端适配
在 index.html 文件中加入这段 js 代码即可
将设计图按照宽度 375px 进行适配。所有元素采用 px 去画图。
已完美兼容 tailwindcss。 例如一个宽 200px 的元素 即为 w-[200px]  
```html
 <script>
      ;(function audoWidth() {
        var e = 375
        if (screen.width !== e) {
          var i = document.querySelector("meta[name='viewport']"),
            t = screen.width,
            n = 1
          if (screen.width === 1080) {
            t = 360
          }
          if (/Android\s4\.3.*UCBrowser\/11\.1\.0\.870.*/.test(window.navigator.userAgent)) {
            t = 360
          }
          n = t / e
          i.content =
            'width=' + e + ',initial-scale=' + n + ',maximum-scale=' + n + ',minimum-scale=' + n
        }
      })()
    </script>
 ```   

 # 格式化
 vite5 安装时我选择了 prettier + eslint 所以直接创建文件即可。
 eslint 咱在已经迭代到 9.x 版本了 新版本用的是eslint.config.js 文件。但我看了下插件的支持不是很好。而且vite 安装给我们的是8.x版本。
 所以我们还是依照8.x版本配置。

新建 .eslintrc.cjs 和 .prettierrc 文件 依照仓库去复制内容即可。

这里关于 eslint 和 prettier 的冲突问题已经是老生长谈了 下载 [eslint-config-prettier](https://github.com/prettier/eslint-config-prettier#installation)这个包完美解决。关于配置后的文件 直接看 .eslintrc.cjs 文件

格式化后的自动保存可以通过vscode 的设置来实现。切记要引入 .vscode 目录 这样不会影响其他的项目。

我还下载了 [vite-plugin-checker](https://github.com/fi3ework/vite-plugin-checker) 插件来完成试试文件保存时的监听。配置参考vite.config.ts

当然，如果有太多的报错，可以搭配 lint 命令一键修复。如果有些可以忽略的，自行在eslint 中对增加新的rule.

# The end~

