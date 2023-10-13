import {EventKey} from "@app/events/keys";

export interface ChannelData {
  key: EventKey, // 事件类型，求购还是改价
  data: {
    [name: string]: any
  }
}
