function render(
  vnode: VNode,
  parentDom: HTMLElement & { _vnode?: VNode }
) {
    const prevNode=parentDom._vnode;
    if(!prevNode){
        if(vnode){
            // mount
        }
    }else{
        if(vnode){
            // diff
        }else{
            // remove
            parentDom.removeChild(prevNode._el);
            parentDom._vnode=undefined;
        }
    }

}
