import { Seed } from '../../packages/seed'

test('测试computed值', () => {
  const vm = new Seed({
    data() {
      return {
        first: 'aaa',
        last: 'bbb',
      }
    },
    computed: {
      name: {
        get(vm) {
          return vm.first + vm.last
        },
      },
    },
  })
  const oldValue=vm.first+vm.last;
  expect(vm.name).toBe(oldValue)
  vm.first='first'
  expect(vm._computedWatchers.get('name').dirty).toBe(true)
  expect(vm.name).toBe(vm.first+vm.last)
  expect(vm._computedWatchers.get('name').dirty).toBe(false)
})
