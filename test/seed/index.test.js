const {Seed} = require('../../packages/seed/index')

test('proxy seed _data',()=>{
    const data={
        a:12,
        b:{
            bc:33
        }
    }
    const seed=new Seed({
        data(){
            return data
        }
    })
    expect(seed._data).toEqual(data)
    expect(seed.a).toBe(12)
    expect(seed.b.bc).toBe(33)
})

test('proxt seed methods',()=>{
    const seed=new Seed({
        data(){
            return {
                a:12
            }
        },
        methods:{
            foo(){
                return 'foo'
            },
            boo(){
                this.a=33;
                return this.a;
            }
        }
    })

    expect(seed.foo()).toBe('foo')
    expect(seed.boo()).toBe(33)

})

