import {Seed} from '../../packages/seed'
test('props',()=>{
    const vm=new Seed({
        props:{
            name:{
                default(){
                    return 'default name'
                }
            }
        },
        propsData:{
            name:'hello'
        }
    })
    expect(vm.name).toBe('hello')
    // vm.parent.name changed ? 触发render重新执行
    // propsData改变

})
