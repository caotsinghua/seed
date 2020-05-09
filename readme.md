## sth like vue
> vue 2.6简化

1. reactivity
    - [x] observe 一个对象/数组；值为对象时，对值进行深度observe
        - [x] 值为数组时的处理（对每个元素observe）
    - [x] watcher，get收集依赖，默认浅层收集，可deep。
        - [x]todo:防止重复依赖收集，一次取值时/多次取值时
    - [x] dep
    - [x] nexttick 异步更新
        - [ ] nexttick方案演变过程及原因
        - [ ]在watcher queue执行过程中又有watcher更新的处理
    - [ ] proxy实现 (like 3.0)

2. seed
    - [x] Seed class
        - init data,observe data
        - init methods
        - init computed
        - [ ] init props
    - [x] vm.$watch

3. vdom & patch (like 3.0)

    need todo

4. hooks (like 3.0 composition or react hooks)

    need todo

