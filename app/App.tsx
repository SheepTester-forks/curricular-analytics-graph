import { useEffect, useRef, useState } from 'react'
import { Graph, GraphOptions } from '../src/index'
import styles from './app.module.css'
// https://curricularanalytics.org/degree_plans/11085
// import example from './example.json'
// https://curricularanalytics.org/degree_plans/25144 (extraneous reqs removed)
import example from './BE27.json'
import { Dropdown } from './components/Dropdown'
import './index.css'
import {
  RequisiteType,
  VisualizationCourse,
  VisualizationRequisite,
  VisualizationTerm,
  toRequisiteType
} from './types'
// import dfwRates from './fake-dfw.json'
import dfwRates from '../../ExploratoryCurricularAnalytics/files/summarize_dfw.json'

// Sort classes alphabetically in each term to clean up lines
for (const term of example.curriculum_terms) {
  term.curriculum_items.sort((a, b) => a.name.localeCompare(b.name))
}

const options = {
  courseBall: {
    none: 'None',
    complexity: 'Complexity',
    units: 'Units',
    dfw: 'DFW rate'
  },
  courseBallColor: {
    none: 'None',
    flagHighDfw: 'Flag DFW > 10% as red'
  },
  courseBallWidth: {
    none: 'None',
    dfwThick: 'High DFW is thicker',
    dfwThin: 'High DFW is thinner',
    unitsThick: 'More units is thicker'
  },
  lineWidth: {
    none: 'None',
    dfwThick: 'High DFW is thicker',
    dfwThin: 'High DFW is thinner'
  },
  lineColor: {
    none: 'None',
    flagHighDfw: 'Flag DFW > 10% as red'
  },
  lineDash: {
    none: 'None',
    flagHighDfw: 'Flag DFW > 10% as dashed line'
  },
  complexity: {
    default: 'Same as Curricular Analytics',
    dfw: 'Multiply course complexity by DFW rate',
    dfwPlus1: 'Multiply course complexity by (DFW rate + 1)'
  }
} as const

const classes: Record<RequisiteType, string> = {
  prereq: styles.prereqs,
  coreq: styles.coreqs,
  'strict-coreq': styles.strictCoreqs
}

function getDfw (courseName: string): number | null {
  const match = courseName.toUpperCase().match(/([A-Z]+) *(\d+[A-Z]*)/)
  return (
    (match && (dfwRates as Record<string, number>)[match[1] + match[2]]) ?? null
  )
}

export function App () {
  const ref = useRef<HTMLDivElement>(null)

  const graph = useRef<Graph<
    VisualizationRequisite,
    VisualizationCourse,
    VisualizationTerm
  > | null>(null)

  const [courseBall, setCourseBall] =
    useState<keyof typeof options['courseBall']>('complexity')
  const [courseBallColor, setCourseBallColor] =
    useState<keyof typeof options['courseBallColor']>('flagHighDfw')
  const [courseBallWidth, setCourseBallWidth] =
    useState<keyof typeof options['courseBallWidth']>('dfwThick')
  const [lineWidth, setLineWidth] =
    useState<keyof typeof options['lineWidth']>('dfwThick')
  const [lineColor, setLineColor] =
    useState<keyof typeof options['lineColor']>('flagHighDfw')
  const [lineDash, setLineDash] =
    useState<keyof typeof options['lineDash']>('none')
  const [complexity, setComplexity] =
    useState<keyof typeof options['complexity']>('dfwPlus1')

  useEffect(() => {
    graph.current = new Graph<
      VisualizationRequisite,
      VisualizationCourse,
      VisualizationTerm
    >()
    graph.current.setCurriculum(example)
    graph.current.wrapper.classList.add(styles.graph)
    ref.current?.append(graph.current.wrapper)

    return () => {
      graph.current?.wrapper.remove()
      graph.current = null
    }
  }, [])

  useEffect(() => {
    const options: GraphOptions<
      VisualizationRequisite,
      VisualizationCourse,
      VisualizationTerm
    > = {
      termName: term => term.name,
      termSummary: term => {
        const termComplexity = term.curriculum_items.reduce((acc, curr) => {
          const dfw = getDfw(curr.name)
          return (
            acc +
            (complexity === 'default' ||
            dfw === null ||
            curr.metrics.complexity === undefined
              ? curr.metrics.complexity ?? 0
              : complexity === 'dfw'
              ? curr.metrics.complexity * dfw
              : curr.metrics.complexity * (dfw + 1))
          )
        }, 0)
        return `Complex.: ${
          complexity === 'default' ? termComplexity : termComplexity.toFixed(2)
        }\nUnits: ${term.curriculum_items.reduce(
          (acc, curr) => acc + (curr.credits ?? 0),
          0
        )}`
      },
      courseName: ({ name, nameSub, nameCanonical }) =>
        name +
        (nameSub ? `\n${nameSub}` : '') +
        (nameCanonical ? `\n(${nameCanonical})` : ''),
      styleNode: (node, course) => {
        const dfw = getDfw(course.name)
        node.textContent =
          courseBall === 'complexity'
            ? complexity === 'default' ||
              dfw === null ||
              course.metrics.complexity === undefined
              ? String(course.metrics.complexity ?? '')
              : complexity === 'dfw'
              ? (course.metrics.complexity * dfw).toFixed(2)
              : (course.metrics.complexity * (dfw + 1)).toFixed(2)
            : courseBall === 'dfw'
            ? dfw !== null
              ? (dfw * 100).toFixed(0)
              : ''
            : courseBall === 'units'
            ? String(course.credits)
            : ''
        node.style.borderColor =
          dfw !== null && dfw > 0.1 && courseBallColor === 'flagHighDfw'
            ? 'red'
            : ''
        node.style.borderWidth =
          dfw !== null && courseBallWidth === 'dfwThick'
            ? `${dfw * 30 + 1}px`
            : dfw !== null && courseBallWidth === 'dfwThin'
            ? `${(1 - dfw) * 5}px`
            : courseBallWidth === 'unitsThick'
            ? `${course.credits}px`
            : ''
      },
      styleLink: (path, { type, source }) => {
        const dfw = getDfw(source.name)
        path.setAttributeNS(
          null,
          'stroke',
          dfw !== null && dfw > 0.1 && lineColor === 'flagHighDfw' ? 'red' : ''
        )
        path.setAttributeNS(
          null,
          'stroke-width',
          dfw !== null && lineWidth === 'dfwThick'
            ? `${dfw * 15 + 0.5}`
            : dfw !== null && lineWidth === 'dfwThin'
            ? `${(1 - dfw) * 3}`
            : ''
        )
        path.setAttributeNS(
          null,
          'stroke-dasharray',
          dfw !== null && dfw > 0.1 && lineDash === 'flagHighDfw' ? '5 5' : ''
        )
        path.classList.add(classes[toRequisiteType(type)])
      },
      styleLinkedNode: (node, _, link) => {
        if (link === null) {
          node.classList.remove(
            styles.selected,
            styles.directPrereq,
            styles.directCoreq,
            styles.directStrictCoreq,
            styles.directBlocking,
            styles.prereq,
            styles.blocking
          )
          return
        }
        node.classList.add(
          link.relation === 'selected'
            ? styles.selected
            : link.relation === 'forward'
            ? link.direct
              ? styles.directBlocking
              : styles.blocking
            : !link.direct
            ? styles.prereq
            : link.type === 'prereq'
            ? styles.directPrereq
            : link.type === 'coreq'
            ? styles.directCoreq
            : styles.directStrictCoreq
        )
      },
      tooltipTitle: course => course.name,
      tooltipContent: course => {
        const dfw = getDfw(course.name)
        return [
          ['Units', String(course.credits)],
          [
            'Complexity',
            complexity === 'default' ||
            dfw === null ||
            course.metrics.complexity === undefined
              ? String(course.metrics.complexity ?? '')
              : complexity === 'dfw'
              ? (course.metrics.complexity * dfw).toFixed(2)
              : (course.metrics.complexity * (dfw + 1)).toFixed(2)
          ],
          ['Centrality', String(course.metrics.centrality)],
          ['Blocking factor', String(course.metrics['blocking factor'])],
          ['Delay factor', String(course.metrics['delay factor'])],
          ['DFW rate', dfw !== null ? `${(dfw * 100).toFixed(1)}%` : 'N/A']
        ]
      },
      tooltipRequisiteInfo: (element, { source, type }) => {
        if (element.children.length < 2) {
          element.append(
            Object.assign(document.createElement('span'), {
              className: styles.tooltipReqName
            }),
            ' ',
            Object.assign(document.createElement('span'), {
              className: styles.tooltipReqType
            })
          )
        }
        element.children[0].textContent = source.name
        element.children[1].textContent = type
      }
    }
    if (graph.current) {
      Object.assign(graph.current.options, options)
      graph.current?.forceUpdate()
    }
  }, [
    courseBall,
    courseBallColor,
    courseBallWidth,
    lineWidth,
    lineColor,
    lineDash,
    complexity
  ])

  return (
    <>
      <div className={styles.graphWrapper} ref={ref} />
      <aside className={styles.options}>
        <h2>Options</h2>
        <Dropdown
          options={options.courseBall}
          value={courseBall}
          onChange={setCourseBall}
        >
          Course node number
        </Dropdown>
        <Dropdown
          options={options.courseBallColor}
          value={courseBallColor}
          onChange={setCourseBallColor}
        >
          Course node outline color
        </Dropdown>
        <Dropdown
          options={options.courseBallWidth}
          value={courseBallWidth}
          onChange={setCourseBallWidth}
        >
          Course node outline thickness
        </Dropdown>
        <Dropdown
          options={options.lineWidth}
          value={lineWidth}
          onChange={setLineWidth}
        >
          Prereq line thickness
        </Dropdown>
        <Dropdown
          options={options.lineColor}
          value={lineColor}
          onChange={setLineColor}
        >
          Prereq line color
        </Dropdown>
        <Dropdown
          options={options.lineDash}
          value={lineDash}
          onChange={setLineDash}
        >
          Prereq line pattern
        </Dropdown>
        <Dropdown
          options={options.complexity}
          value={complexity}
          onChange={setComplexity}
        >
          Complexity formula
        </Dropdown>
        <p>For this demo, DFW rates have been randomized.</p>
      </aside>
    </>
  )
}
