import { noop } from "../utils"

const callbacks: Function[] = []
let running = false
let timerFunc=noop


function flushCallbacks() {
  const copies = callbacks.slice(0)
  callbacks.length = 0 // clear
  for (let i = 0, l = copies.length; i < l; i++) {
    copies[i]()
  }
}

// 使用microtask执行
function useMicroOrMacroTask(){
    if(Promise && typeof Promise !=='undefined' && /native code/.test(Promise.toString())){
        let p=Promise.resolve()
        timerFunc=()=>{
            p.then(flushCallbacks)
        }
    }else{
        // 降级macrotask
        setTimeout(flushCallbacks,0)
    }
}

useMicroOrMacroTask();

export function nextTick(callback: Function, context?: any) {
  callbacks.push(() => {
    callback.call(context)
  })

  if (!running) {
    running = true
    timerFunc()
  }
}
