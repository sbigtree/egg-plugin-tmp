export enum RedisKeys {
  // key命名规范
  // 驼峰命名，模块名 + 功能名 + _ + 是否要替换的字符串
  // Tmp是模块名，UserCache是功能名，由开发者定义，_{user_id}为需要替换的字符
  // 使用：RedisKeys.TmpUserCache.replace('{user_id}',user.id) 获取key
  TmpUserCache = 'TmpUserCache_{user_id}'


}

