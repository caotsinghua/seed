import { LifecycleHooks } from './component'

export const enum ErrorCodes {
  SETUP_FUNCTION,
  RENDER_FUNCTION,
  WATCH_GETTER,
  WATCH_CALLBACK,
  WATCH_CLEANUP,
  NATIVE_EVENT_HANDLER,
  COMPONENT_EVENT_HANDLER,
  VNODE_HOOK,
  DIRECTIVE_HOOK,
  TRANSITION_HOOK,
  APP_ERROR_HANDLER,
  APP_WARN_HANDLER,
  FUNCTION_REF,
  ASYNC_COMPONENT_LOADER,
  SCHEDULER,
}

export const ErrorTypeStrings: Record<number | string, string> = {
  [LifecycleHooks.BEFORE_CREATE]: 'beforeCreate hook',
  [LifecycleHooks.CREATED]: 'created hook',
  [LifecycleHooks.BEFORE_MOUNT]: 'beforeMount hook',
  [LifecycleHooks.MOUNTED]: 'mount hook',
  [LifecycleHooks.BEFORE_UPDATE]: 'before update hook',
  [LifecycleHooks.UPDATED]: 'updated hook',
  [LifecycleHooks.BEFORE_UNMOUNT]: 'beforeUnmount hook',
  [LifecycleHooks.UNMOUNTED]: 'unmounted hook',
  [LifecycleHooks.ACTIVITED]: 'activeted hook',
  [LifecycleHooks.DEACTIVITED]: 'deactivbited hook',
  [LifecycleHooks.RENDER_TRIGGERD]: 'render triggered hook',
  [LifecycleHooks.RENDER_TRACKED]: 'render tracked hook',
  [LifecycleHooks.ERROR_CAPTURED]: 'error captured hook',
  [ErrorCodes.SETUP_FUNCTION]:'setup function',
  [ErrorCodes.RENDER_FUNCTION]:'render function',
  [ErrorCodes.WATCH_GETTER]:'watch getter',
  [ErrorCodes.WATCH_CALLBACK]:'watch callback',
  [ErrorCodes.WATCH_CLEANUP]:'watch cleanup',
  [ErrorCodes.NATIVE_EVENT_HANDLER]:'native event handler',
  [ErrorCodes.COMPONENT_EVENT_HANDLER]:'component event handler',
  [ErrorCodes.VNODE_HOOK]:'vnode hook',
  [ErrorCodes.DIRECTIVE_HOOK]:'directive hook',
  [ErrorCodes.TRANSITION_HOOK]:'transition hook',
  [ErrorCodes.APP_ERROR_HANDLER]:'app error handler',
  [ErrorCodes.APP_WARN_HANDLER]:'app warn handler',
  [ErrorCodes.FUNCTION_REF]:'function ref',
  [ErrorCodes.ASYNC_COMPONENT_LOADER]:'async component loader',
  [ErrorCodes.SCHEDULER]:'scheduler flush;may be internal bug'
}

export type ErrorTypes = ErrorCodes | LifecycleHooks

export function callWithErrorHandling(
  fn: Function,
  instance: ComponentInternalInstance | null,
  type: ErrorTypes,
  args?: unknown[]
) {
    let res
    try{
        res = args ? fn(...args):fn()
    }catch(error){
        // TODO:///////error handler
        console.log("错误处理=====")
    }
    return res
}
