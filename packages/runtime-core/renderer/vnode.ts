export const Fragment= Symbol(__DEV__?'Frament':undefined)

 //标准化vnode
export function normalizeVNode(child){
    // 1.是空 ？ boolean？ =》注释
    // 2.是数组？=》fragment包裹
    // 3.是对象，即vnode对象，如果没有挂载过就直接返回
    // 挂载过就复制节点

    // 4.是字符串/数字，则创建text
}


