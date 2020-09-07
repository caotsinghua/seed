// == 生命周期钩子
type CountMap = Map<Function,number> // 执行次数
const postFlushCbs :Function[]= []

export function queuePostFlushCbs(cbs:Function | Function[]){
    if(Array.isArray(cbs)){
        postFlushCbs.push(...cbs)
    }else{
        postFlushCbs.push(cbs)
    }
    console.log(postFlushCbs)
    // flush，会在下一个tick执行（准确的说，是在当前事件循环结束前执行）
    queueFlush()
}

let isFlushing = false // 正在刷新
let isFlushPending = false
function queueFlush(){
    if(!isFlushing && !isFlushPending){
        isFlushPending = true
        nextTick(flushJobs)
    }
}

// flush
function flushPostFlushCbs(seen?:CountMap){
    
    if(postFlushCbs.length){
        console.log(postFlushCbs,postFlushCbs.length)
        const cbs = Array.from(new Set(postFlushCbs)) // 去重
        
        postFlushCbs.length = 0
        for(let i=0;i<cbs.length;i++){
            cbs[i]()
        }
    }
}

// 刷新任务
function flushJobs(seen?:CountMap){
    isFlushPending = false
    isFlushing=true
    // 先执行effets,再执行生命周期钩子,原因不明
    flushPostFlushCbs(seen)
    isFlushing = false

}



function nextTick(callback:(v:unknown)=>void){
    Promise.resolve().then(callback)
}