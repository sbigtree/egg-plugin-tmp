## 模块功能项目目标

## 使用

1. 拉取代码

```shell
 git clone https://github.com/sbigtree/egg-plugin-tmp.git
```

2. 修改项目名字  
   目录egg-plugin-tmp 改名为具体项目名字

3. 删除.git目录

4. 重新添加git仓库地址

## 插件引用

```js
//  config/plugin.ts
const plugin: EggPlugin = {
  //...
  routeAuth: { // 路由鉴权中间件
    enable: true,
    package: '@sbigtree/egg-route-auth',
  },
  sequelize: { // mysql 插件
    enable: true,
    package: '@sbigtree/egg-plugin-sequelize',
  },
}
```

## 项目作为插件包，需要做命名配置

```json
// package.json
{
  "eggPlugin": {
    "name": "pluginTmp",
    // 定义插件名字
    "dependencies": [
      // 当前模块插件依赖其他插件
      "routeAuth",
      "sequelize"
    ]
  }
}

```

## 插件使用详见插件包 README.md

如 node_modules/@sbigtree/egg-plugin-sequelize/README.md

## 其他使用方式详见egg文档

