export function stringToNumber(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash) // hash * 31 + char
  }
  return hash >>> 0 // 转为正整数
}
