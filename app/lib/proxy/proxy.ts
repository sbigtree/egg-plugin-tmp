import { RedisKeys } from '@app/redis/keys'
import redis from '@app/redis'
import { ProxyTable } from '@sbigtree/db-model'
import { random16bChar } from '@sbigtree/steam-tools'
import config from '@/config'
import { BandwidthUseFromType } from '@sbigtree/db-model/dist/models/proxy_user_bandwidth_use_from_day'

export function randomAsciiChar(length) {
  const ascii_lowercase = 'abcdefghijklmnopqrstuvwxyz'
  const ascii_uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const ascii_letters = ascii_lowercase + ascii_uppercase
  return [...Array(length)]
    .map((e) => ascii_letters[Math.floor(Math.random() * ascii_letters.length)])
    .join('')
}

/**
 *
 * @param steam_account
 * @param options
 */
export async function getProxy(
  steam_account,
  options: {
    use_from: BandwidthUseFromType // 使用来源 BandwidthUseFromType
    user_id?: number
    residence?: boolean
    level?: number
    support_game?: boolean
    country?: string
  }
): Promise<{
  httpProxy: string
  socksProxy?: string
}> {
  if (!config.yymSuperProxy) {
    return {
      httpProxy: '',
      socksProxy: ''
    }
  }
  // options = options ||{}
  let level = options.level || 1
  const support_game = Number(options.support_game)
  let residence: any = options.residence
  const user_id = options.user_id || ''
  let country = options.country || ''
  let use_from = options.use_from || ''
  if (residence) {
    residence = 'residence'
  } else {
    residence = ''
  }

  country = 'us'

  const session = steam_account || randomAsciiChar(10)
  const STEAM_IP_COUNTRY = `STEAM_IP_COUNTRY_${steam_account}` // 值为 2位国家地区编码小写
  if (!country) {
    country = (await redis.master.client.get(STEAM_IP_COUNTRY)) || 'us'
  }

  let proxy = `http://yuanyoumao_steammew:user_id-${user_id}-country-${country.toLowerCase()}-use_from-${use_from}-channel-${residence}-session-${session}@${
    config.yymSuperProxy
  }`

  return {
    httpProxy: proxy
  }
}
