# curricular-analytics-graph

Intended to be a CurricularVisualization.jl-compatible graph renderer.

This repo is set up in two parts:

- `src/`, which defines a generic graph renderer as a library.
- `app/`, a React app that uses the library to make a [kitchen-sink demo](https://educationalinnovation.ucsd.edu/_files/graph-demo.html).

## Usage (as library)

The graph renderer is currently a work in progress.

```sh
$ npm install git+https://github.com/SheepTester-forks/curricular-analytics-graph.git
```

There are no pre-bundled files available. If you want to import this into your project, you will have to use a bundler like [esbuild](https://esbuild.github.io/) with `--loader:.svg=file`.

To create a graph, you need to

1. Import `Graph` from `curricular-analytics-graph/src`.

1. Provide an options object to the `Graph` constructor. A list of options is documented in [`GraphOptions`](./src/components/Graph.ts#L16). All options are optional, and by default, the graph will only have circles and arrows.

   To update the options object, directly modify `Graph.options`, then force a re-render using `Graph.forceUpdate()`.

1. Provide a degree plan, in the form of a list of list of course objects, to `Graph.setDegreePlan`.

   Each course object must contain `backwards` and `forwards`, which are arrays of references to other course objects, representing the prerequisite relationships between courses. Course objects can contain other information, such as course IDs or names, which will be passed directly to the callbacks in the options object in the `Graph` constructor.

   These links don't store any metadata, so if you want to keep track of the type of prerequisite (e.g. prereq vs coreq vs strict coreq), you should maintain a separate object or `Map` mapping from pairs of course IDs to any metadata you wish to keep.

   To change the degree plan again later on, simply call `setDegreePlan` again with the new degree plan.

1. Add `Graph.wrapper` to the document.

```ts
import { Graph } from 'curricular-analytics-graph/src'

// Define the properties of the object used to store course data (if using
// TypeScript). The only required fields used by `Graph` are `backwards` and
// `forwards`, which are arrays of references to other course objects in the
// plan.
type Course = {
  name: string
  backwards: Course[]
  forwards: Course[]
}

const graph = new Graph<Course>({
  // The `courseName` option determines the text that displays underneath each
  // course node.
  courseName: ({ course }) => course.name
})

// In practice, these links would be attached automatically rather than
// manually.
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

## Development (app)

Requires [Node 22+](https://nodejs.org/) (on Mac/Linux, I recommend nvm: `curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/master/install.sh | bash` then `nvm install node`) and Yarn (`npm install -g yarn`).

The app relies on DFW, waitlist, and course offering frequency data (see the [next section](#getting-protected-data-ucsd-only)).
After setting up the required datasets, you can run `yarn dev` to start a development server.

```shell
# Build and minify the app
$ yarn build

# Start a local HTTP server that recompiles on the fly
$ yarn dev
```

You can also start/build a public-facing version that uses publicly available data by setting the `GRAPH_VERSION` environment variable to `public`:

```shell
$ GRAPH_VERSION=public yarn build
$ GRAPH_VERSION=public yarn dev
```

The app also relies on UCSD-specific prerequisite data. This isn't protected data, but it's good to keep in mind when adapting this for other universities. Prereqs are only used when editing course names to determine how to update the prereqs in the plan. The prereqs are automatically fetched from the URL defined in the constant `DATA_SOURCE_URL` in [app/App.tsx](./app/App.tsx).

### Getting protected data (UCSD only)

To get the protected DFW, waitlist, and course frequency data, you also need to clone [curricular-analytics-exploration](https://github.com/SheepTester-forks/curricular-analytics-exploration) in the same parent folder as this repository. Refer to the setup steps in that repo's README, but what's essential is that you run `make protected` (which means you need the protected data files).

```shell
$ cd ..
$ git clone https://github.com/SheepTester-forks/curricular-analytics-exploration.git
$ cd curricular-analytics-exploration/
# (Download the required data files)
$ make
$ make protected
$ cd ../curricular-analytics-graph/
```

### URL documentation

Query parameters:

- `from`: URL of Curricular Analytics CSV file. Relative URLs are supported, based on `https://raw.githubusercontent.com/SheepTester-forks/ucsd-degree-plans/main/` (this allows the source repo to be swapped out without having to update existing URLs).
- `defaults`: Default settings for the options panel. `ca` for options mimicking the original Curricular Analytics, and `ucsd` for Carlos' preferred options.
- `hide-panel=true`: Whether to hide the side panel.
- `title`: Title text to show in the side panel.
- `major`: Major code, used to get major-specific DFW data.
- `year`: Starting year of the degree plan, used for determining the term to use for prereqs when editing courses.

Fragment: contains URL-encoded contents of a Curricular Analytics CSV.

To load a degree plan or curriculum in Curricular Analytics' CSV format, pass it in the URL fragment (i.e. after a `#`) or upload the file online then use `?from=<url>`.
