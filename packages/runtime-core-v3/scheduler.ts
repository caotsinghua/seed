import { callWithErrorHandling, ErrorCodes } from './errorHandling'

export interface SchedulerJob {
  (): void
  id?: number
  cb?: boolean
}

const queue: (SchedulerJob | null)[] = []

let currentFlushPromise: Promise<void> | null = null
const resolvedPromise: Promise<void> = Promise.resolve()
let flushIndex = 0 // 当前执行的queue index
let isFlushing = false // 是否执行queue中
let isFlushPending = false
let currentPreFlushParentJob: SchedulerJob | null = null
let hasPendingPreFlushJobs = false
export function nextTick(fn?: () => void): Promise<void> {
  const p = currentFlushPromise || resolvedPromise
  return fn ? p.then(fn) : p
}

export function queueJob(job: SchedulerJob) {
  // 什么样的job会加入到队列中？
  // 默认一个job没有cb，会从当前执行位置开始查询，当前执行的可能就是一样的job，
  //   因此不能再重复执行自己
  // 一个watcher的callback的job，会从a+1位置开始找，因此如果现在a位置执行的是一样的job，
  //   还是允许再次运行自己
  //
  if (
    (!queue.length ||
      !queue.includes(
        job,
        isFlushing && job.cb ? flushIndex + 1 : flushIndex
      )) &&
    job !== currentPreFlushParentJob
  ) {
    queue.push(job)
    if ((job.id as number) < 0) {
      hasPendingPreFlushJobs = true
    }
    queueFlush() // 执行
  }
}

function queueFlush() {
  if (!isFlushing && !isFlushPending) {
    isFlushPending = true
    currentFlushPromise = resolvedPromise.then(flushJobs)
  }
}
const getId = (job: SchedulerJob) => (job.id == null ? Infinity : job.id)
function flushJobs() {
  // 执行到当前的flush了
  isFlushPending = false
  isFlushing = true

  queue.sort((a, b) => getId(a!) - getId(b!))
  try {
    for (flushIndex = 0; flushIndex < queue.length; flushIndex++) {
      const job = queue[flushIndex]
      if (job) {
        callWithErrorHandling(job, null, ErrorCodes.SCHEDULER)
      }
    }
  } finally {
    flushIndex = 0
    queue.length = 0
    isFlushing = false
    currentFlushPromise = null
    //   执行post的flush
  }
}
