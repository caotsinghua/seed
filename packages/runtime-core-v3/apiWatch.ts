import { fchown } from 'fs'
import { ReactiveEffectOptions, effect } from 'packages/reactivity-v3/effects'
import { type } from 'os'
import { traverse } from '@babel/core'

export type WatchEffect = (inInvalidate: InvalidateCbRegistrator) => void
export type WatchSource<T = any> = Ref<T> | ComputedRef<T> | (() => T) // 监听的源

type InvalidateCbRegistrator = (cb: () => void) => void
export interface WatchOptionsBase {
  flush?: 'pre' | 'post' | 'sync'
  onTrack?: ReactiveEffectOptions['onTrack']
  onTrigger?: ReactiveEffectOptions['onTrigger']
}
export interface WatchOptions <Immediate = boolean> extends WatchOptionsBase{
    immediate?:Immediate,
    deep?:boolean
}

export type WatchStopHandle = () => void

export function watchEffect(
  effect: WatchEffect,
  options?: WatchOptionsBase
): WatchStopHandle {
  return doWatch(effect, null, options)
}

export type WatchCallback<V = any, OV = any> = (
  value: V,
  oldValue: OV,
  onInvalidate: InvalidateCbRegistrator
) => any

const INITIAL_WATCHER_VALUE={}
function doWatch(source: WatchEffect|WatchSource|WatchSource[], cb: WatchCallback,{
    immediate,deep,flush,onTrigger,onTrack
}:WatchOptions={} instance = currentInstance,) {
    if(!cb){
        // 没有回调
        if(immediate !== undefined){
            console.warn("不设置回调无法触发watch的callback")
        }
        if(deep !== undefined){
            console.error("不设置回调无法使deep生效")
        }

    }

    let getter :()=>any
    const isRefSource = isRef(source) // 监听的源是ref类型
    if(isRefSource){
        getter = ()=>(source as Ref).value
    }else if(isReactive(source)){
        // 监听了一个相应对象
        getter=()=>source
        deep = true
    }else if(Array.isArray(source)){
        // 监听了一个ref数组
        getter = ()=>{
            source.map(s=>{
                if(isRef(s)){
                    return s.value // 获取值
                }else if(isReactive(s)){
                    return traverse(s) // 深度取值
                }else if(typeof source === 'function'){
                    return source()
                }else{
                    console.error("非法 source")
                }
            })
        }
    }else if(typeof source === 'function'){
        if(cb){
            getter = ()=>source()
        }else{
            // 没有回调方法
            getter=()=>{
                if(instance && instance.isUnmounted){
                    // 实例未挂载
                    return
                }
                if(cleanup){
                    // 每次执行source之前执行clean，
                    cleanup()
                }
                return source(onInvalidate) // 执行完毕后执行onInvalidate
            }
        }
    }else{
        getter = ()=>{}
    }

    if(cb && deep){
        // 深度
        const baseGetter = getter
        getter = ()=>traverse(baseGetter())
    }

    let cleanup:()=>void
    const onInvalidate:InvalidateCbRegistrator=(fn:()=>void)=>{
        cleanup = runner.options.onStop = ()=>{
            fn()
        }
    }
    let oldValue = Array.isArray(source) ? [] :INITIAL_WATCHER_VALUE
    const job = ()=>{
        if(!runner.active){
            return
        }
        if(cb){
            const newValue = runner() // get new value
            if(deep || isRefSource || hasChanged(newValue,oldValue)){
                // run before cb 
                if(cleanup){
                    cleanup()
                }
                cb(newValue,oldValue,onInvalidate)
            }
        }else{
            runner()
        }
    }
    job.cb=!!cb

    let scheduler:(job:()=>any)=>void

    if(flush === 'sync'){
        // 同步执行更新
        scheduler = job
    }else if(flush === 'pre'){
        // 在视图更新前执行
        job.id = -1 // 优先级提到最高
        scheduler = ()=>{
            if(!instance || instance.isMounted){
                // 必须组件挂载后，才会加入队列
                queuePreFlushCb(job)
            }else{
                // 组件未挂载。同步执行
                job()
            }
        }
    }else{
        // 视图更新后执行
        scheduler=()=>queuePostRenderEffect(job,instance && instance.suspense)
    }
    // 创建一个懒求值effect
    const runner = effect(getter,{
        lazy:true,
        onTrack,
        onTrigger,
        scheduler
    })

    if(cb){
        if(immediate){
            // 立即执行
            job()  // 这里会执行cb
        }else{
            oldValue = runner() // 依赖收集
        }
    }else{
        runner() // 直接依赖收集
    }

    return ()=>{
        // 停止侦听
        stop(runner)
        if(instance){
            remove(instance.effects,runner) // 从组件实例删除这个effect
        }
    }



}

// 递归取值，进行依赖收集
function traverse(value:unknown,seen:Set<unknown> = new Set()){
    if(typeof value !== 'object' || seen.has(value)){
        // 这个值已经获取过或者递归的值不是对象
        return value
    }
    seen.add(value)
    if(Array.isArray(value)){
        for(let i=0;i<value.length;i++){
            traverse(value[i],seen)
        }
    }else if(value instanceof Map){
        value.forEach((v,key)=>{
            traverse(value.get(key),seen)
        })
    }else if(value instanceof Set){
        value.forEach(v=>{
            traverse(v,seen)
        })
    }else{
        for(const key in value){
            traverse((value as any)[key],seen)
        }
    }
    return value
}