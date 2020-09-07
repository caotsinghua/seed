import {
  ComponentInstance,
  currentInstance,
  setCurrentInstance,
} from './component'
import { pauseTraking, resetTraking } from '../reactivity/effect'

export const enum LifecycleHooks {
  BEFORE_CREATE = 'bc',
  CREATED = 'c',
  BEFORE_MOUNT = 'bm',
  MOUNTED = 'm',
  BEFORE_UPDATE = 'bu',
  UPDATED = 'u',
  BEFORE_UNMOUNT = 'bum',
  UNMOUNTED = 'um',
  DEACTIVATED = 'da',
  ACTIVATED = 'a',
  RENDER_TRIGGERERED = 'rtg',
  RENDER_TRACKED = 'rtc',
  ERROR_CAPTURED = 'ec',
}
export function injectHook(
  type: LifecycleHooks,
  hook: Function & { __weh?: Function },
  target: ComponentInstance | null = currentInstance
) {
  if (target) {
    const hooks = target[type] || (target[type] = []) // 原来的hooks
    const wrappedHook =
      hook.__weh ||
      (hook.__weh = (...args: unknown[]) => {
        if (target.isUnmounted) {
          return // 如果未挂载，withErrorhandling无效
        }
        // 在生命周期执行期间，禁止依赖收集
        pauseTraking()
        setCurrentInstance(target)
        let res = null
        try {
          res = hook(...args)
        } catch (e) {
          console.log(e)
        }
        // --call end
        setCurrentInstance(null)
        resetTraking()
        return res
      })
// == 执行的时机？
    hooks.push(wrappedHook) // 加入到组件的hooks中
    console.log('组件的hook', {
      target,
      hooks,
    })
  } else {
    console.warn('注册生命周期时无激活的component')
  }
}

export const createHook = <T extends Function>(lifecycle: LifecycleHooks) => {
  return function (
    hook: T,
    target: ComponentInstance | null = currentInstance
  ) {
    injectHook(lifecycle, hook, target)
  }
}
// 在setup中注册生命周期
export const onBeforeMount = createHook(LifecycleHooks.BEFORE_MOUNT)
export const onMounted = createHook(LifecycleHooks.MOUNTED)


