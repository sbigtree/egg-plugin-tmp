interface TaskStore {
  maxWorker:number,
  runningWorker:number,
  [key:string]:any
}

const store:TaskStore = {
  maxWorker: 1000, // 并发数
  runningWorker: 0, // 当前运行的worker数
  max_TaskTest:100
}

function add(key = 'runningWorker', step = 1) {
  if (store[key]==undefined||store[key]==null) {
    store[key] = 0
  }else {
    store[key] += step
  }
}

function get():TaskStore {
  return store
}

export default {
  add: add,
  get: get,
}
