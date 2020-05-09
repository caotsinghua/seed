import { Watcher } from './watcher'
import { nextTick } from './next-tick'

const queue: Watcher[] = []
const has: Map<number, boolean> = new Map()
let waiting = false
let flushing = false
let index = 0 // 得知现在更新到队列的位置

// 执行队列全部watcher的run
function flushWatcherQueue() {
  flushing = true
  queue.sort((a, b) => a._uid - b._uid)
  for (index = 0; index < queue.length; index++) {
    const watcher = queue[index]
    if (watcher.before) {
      watcher.before()
    }
    has.delete(watcher._uid)
    watcher.run()
  }
  resetScheduleState() // 执行完毕

//   更新完成，应该调用activated(keep alive) updated周期
}

// 重置状态
function resetScheduleState() {
  waiting = flushing = false
  queue.length = 0
  has.clear()
}

export function queueWatcher(watcher: Watcher) {
  const id = watcher._uid
  if (!has.has(id)) {
    has.set(id, true)
    if(!flushing){
        // 不在更新过程中
        queue.push(watcher)
    }else{
        // TODO:
        // 插入队列的正确位置，因为这里不再排序

    }


    if (!waiting) {
      waiting = true
      nextTick(flushWatcherQueue)
    }
  }
}
