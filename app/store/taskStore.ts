interface TaskStore {
  maxWorker:number,
  runningWorker:number,
}

const store:TaskStore = {
  maxWorker: 100, // 并发数
  runningWorker: 0, // 当前运行的worker数
}

function add(key = 'runningWorker', step = 1) {
  if (store[key] != undefined) {
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
