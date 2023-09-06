---
theme: mk-cute
---

<p align="center"><img src="https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/3ac0717481384f17a3ac7a90e3f1c61f~tplv-k3u1fbpfcp-watermark.image?" alt="image.png"></p>

## 写在前面

前段时间自己研究了下 npm 私有库这块知识，先在本地电脑试了一下，觉得挺简单的。顺手在公司的测试服务器上搭建成功。特此做一些分享。

**npm 私有库的必要性：**

1.安全性：把公用组件放到私有 npm 库中，只有内网可以访问，这样可以避免敏感代码泄露；

2.下载速度：使用内部的地址，能够在开发下载 npm 包的同时，将包和其依赖包缓存到 npm 私有仓库服务器中，从而使后续的下载速度更快；

## 搭建过程

详情参考 Verdaccio 的[官网链接](https://verdaccio.org/zh-CN/docs/what-is-verdaccio)，我今天安装的是5.24.1版本。

### 安装

```shell
 # npm
 npm install --location=global verdaccio
 # yarn （我自己用的 yarn）
 yarn global add verdaccio

```

### 本地使用

项目创建好之后终端输入 verdaccio 回车，就会自动在本地为你起一个服务。

![image.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/f59faa00358a4e94ac161599770933e8~tplv-k3u1fbpfcp-watermark.image?)

图中两个红框分别对应项目的配置目录和服务的启动地址
打开配置文件 config.yaml，在最后一行加上配置 `listen: 0.0.0.0:4873` 这样能保证其他本地域名的运行。

打开链接 <http://localhost:4873/> 就可以看到 UI 界面。

![image.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/7d92a994424543769ee236f458753755~tplv-k3u1fbpfcp-watermark.image?)

按照界面的内容就可以实现创建用户和发布功能。

### 服务器上使用

如果要实现在服务器上部署 Verdaccio，按照上面的介绍先安装 Verdaccio 并更改配置的 listen后，可以使用服务器域名 + 端口进行访问。如果端口被限制或想要更改域名，可以通过 Nginx 做一层代理。

```shell
server {
    listen 80;
    # 域名配置
    server_name verdaccio.com;
    client_max_body_size 20m;

    access_log /var/log/nginx/verdaccio-access.log main;
    error_log /var/log/nginx/verdaccio-error.log;

    location / {
    	proxy_set_header Host              $host:$server_port;
    	proxy_set_header X-Forwarded-For   $remote_addr;
    	proxy_set_header X-Forwarded-Proto $scheme; 
        proxy_pass                         http://127.0.0.1:4873;
    }
}
```

为了实现服务的持久化，官网推荐使用 forever 去做服务的持久运行。这里也可以使用 pm2 去做服务的进程管理。

```shell
    # 启用服务
    pm2 start verdaccio
    # 重启服务（更改配置文件后需要执行重启操作）
    pm2 restart verdaccio
    # 终止服务
    pm2 stop verdaccio
    
```

### 权限

Verdaccio 的默认配置文件中，对用户的权限是很宽松的。如下图配置，对待@打头的包文件，access 代表访问权限，publish 代表发布文件权限，unpublish 代表卸载文件权限。用户角色有三种，$all 所有用户，$authenticated 认证用户，\$anonymous 匿名用户。

所以在默认配置中 A 用户发布的包，是可以被 B 用户随意删除的，再加上任何人都可以通过 npm adduser 完成用户的注册，所以这样在实际工作中是不合理的。

```shell
packages:
  '@*/*':
    # scoped packages
    access: $all
    publish: $authenticated
    unpublish: $authenticated
    proxy: npmjs

  '**':
    # and three keywords: "$all", "$anonymous", "$authenticated"
    access: $all
    publish: $authenticated
    unpublish: $authenticated
    proxy: npmjs
```

再投入正式项目中，我们应根据实际情况做一些自定义的权限配置。根据官网文档，我们可以把自己更改配置文件如下所示。

```shell
packages:
  '@overseas/*':
    # scoped packages
    access: [qzai]
    publish: [qzai]
    unpublish: [qzai]
    proxy: npmjs

  'my-org/*':
    # 匹配 my-org 下的所有包
    access: $all
    publish: my-level
    unpublish: my-level

  '**':
    # three keywords: "$all", "$anonymous", "$authenticated"
    access: $all
    publish: $authenticated
    unpublish: $authenticated
    proxy: npmjs
permissions:
  my-level:
    who:
      - user1
      - user2
    access: read-only

  my-other-level:
    who:
      - user3
      - user4
    access: read-write

  admin:
    who:
      - qzai
    access: unrestricted
```

在 packages 中，我创建了以 @overseas 为前缀的包组织，并设置了所有权限都只有 qzai 本人。这样配置后，@overseas 这个组织的包别人是访问不到的。

我还创建了一个 my-org 组织的包配置，publish 和 unpublish 的权限都是 my-level 这个组织，这个自定义组织是在 permissions 项中做的配置，可以把不同的用户分配到自定义的权限组里。

## 实践

我做了一个简单的包，通过 npm init -y 生成 package.json 配置文件，剃掉无用的 scripts 脚本。

```json
{
  "name": "test",
  "version": "1.0.0",
  "description": "",
  "main": "index.js",
  "keywords": [],
  "author": "",
  "license": "ISC"
}


```

```js
// index.js

export function testFun(){
    console.log('hello world~')
}

```

创建.npmrc 文件，设置默认的 npm 仓库地址

```shell
registry=http://verdaccio-test.joyread.cc/

```

登陆完成后就可以执行发布操作了，发布成功后刷新你的 Verdaccio UI页面，就可以看到你的发布信息。如果想删除，可以执行 npm unpublish <pkg> --force 删除包文件

```shell
# 登陆
npm login
# 发布
npm publish

```

在项目文件中也创建.npmrc文件设置默认的 npm 仓库地址，下载包后引到你的项目中。试试看效果吧~
    
