# curricular-analytics-graph

A CurricularVisualization.jl-compatible graph renderer

## Usage

The graph renderer is currently a work in progress.

```sh
$ npm install git+https://github.com/SheepTester-forks/curricular-analytics-graph.git
```

There are no pre-bundled files available. If you want to import this into your project, you will have to use a bundler like [esbuild](https://esbuild.github.io/) with `--loader:.svg=file`.

To create a graph, you need to

1. Import `Graph` from `curricular-analytics-graph/src`.

1. Provide an options object to the `Graph` constructor. A list of options is documented in [`GraphOptions`](./src/components/Graph.ts#L16). All options are optional, and by default, the graph will only have circles and arrows.

1. Provide a degree plan, in the form of a list of list of course objects, to `graph.setDegreePlan`.

   Each course object must contain `backwards` and `forwards`, which are arrays of references to other course objects, representing the prerequisite relationships between courses. Course objects can contain other information, such as course IDs or names, which will be passed directly to the callbacks in the options object in the `Graph` constructor.

   These links don't store any metadata, so if you want to keep track of the type of prerequisite (e.g. prereq vs coreq vs strict coreq), you should maintain a separate object or `Map` mapping from pairs of course IDs to any metadata you wish to keep.

1. Add `graph.wrapper` to the document.

```ts
import { Graph } from 'curricular-analytics-graph/src'

type Course = {
  name: string
  backwards: Course[]
  forwards: Course[]
}

const graph = new Graph<Course>({
  courseName: ({ course }) => course.name
})

const plan = [
  [
    { name: 'MATH 1', backwards: [], forwards: [] },
    { name: 'MATH 2', backwards: [], forwards: [] }
  ],
  { name: 'PHYS 10', backwards: [], forwards: [] }
]
plan[0][0].forwards.push(plan[1][0])
plan[1][0].backwards.push(plan[0][0])
plan[0][1].forwards.push(plan[1][0])
plan[1][0].backwards.push(plan[0][1])
graph.setDegreePlan(plan)

document.body.append(graph.wrapper)
```

For more examples about customizing the graph renderer, you can refer to these examples:

- [Kitchen sink demo](https://github.com/SheepTester-forks/curricular-analytics-graph/blob/main/app/App.tsx), [live](https://educationalinnovation.ucsd.edu/_files/graph-demo.html)
- [Using a graph in React](https://github.com/SheepTester-forks/ucsd-plan-editor/blob/main/src/components/GraphView.tsx), [live](https://educationalinnovation.ucsd.edu/_files/plan-editor.html)

## Development

```sh
# Build and minify the app
$ yarn build

# Start a local HTTP server that recompiles on the fly
$ yarn dev
```
