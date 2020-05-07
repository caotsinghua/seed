## sth like vue
> vue 2.6简化

1. reactivity
    - [x] observe 一个对象/数组；值为对象时，对值进行深度observe
        - todo:值为数组时的处理（对每个元素observe）
    - [x] watcher，get收集依赖，默认浅层收集，可deep。
        - [ ]todo:防止重复依赖收集，一次取值时/多次取值时
    - [x] dep
    - [ ] proxy实现 (like 3.0)

2. seed
    - [x] Seed class
        - init data,todo:observe data
        - init methods
        - [ ]todo: computed,watch,props
    - [x] vm.$watch

3. vdom & patch (like 3.0)

    need todo

4. hooks (like 3.0 composition or react hooks)

    need todo

