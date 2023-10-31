import { useEffect, useRef, useState } from 'react'
import { Graph, GraphOptions } from '../src/index'
import styles from './app.module.css'
// https://curricularanalytics.org/degree_plans/11085
// import example from './example.json'
// https://curricularanalytics.org/degree_plans/25144
import example from './BE27.json'
import { Dropdown, TextField } from './components/Dropdown'
import './index.css'
import {
  RequisiteType,
  VisualizationCourse,
  VisualizationRequisite,
  VisualizationTerm,
  toRequisiteType
} from './types'
// import dfwRates from './fake-dfw.json'
import dfwRates from '../../ExploratoryCurricularAnalytics/files/protected/summarize_dfw.json'
import frequencies from '../../ExploratoryCurricularAnalytics/files/protected/summarize_frequency.json'
import waitlists from '../../ExploratoryCurricularAnalytics/files/protected/summarize_waitlist.json'

// Sort classes alphabetically in each term to clean up lines
for (const term of example.curriculum_terms) {
  term.curriculum_items.sort((a, b) => a.name.localeCompare(b.name))
}

const options = {
  courseBall: {
    none: 'None',
    complexity: 'Complexity',
    units: 'Units',
    dfw: 'DFW rate',
    waitlist: 'Waitlist length'
  },
  courseBallColor: {
    none: 'None',
    flagHighDfw: 'Flag high DFW as red'
  },
  courseBallWidth: {
    none: 'None',
    dfwThick: 'High DFW is thicker',
    dfwThin: 'High DFW is thinner',
    unitsThick: 'More units is thicker',
    waitlistThick: 'Longer waitlist is thicker'
  },
  lineWidth: {
    none: 'None',
    dfwThick: 'High DFW is thicker',
    dfwThin: 'High DFW is thinner',
    waitlistThick: 'Longer waitlist is thicker'
  },
  lineColor: {
    none: 'None',
    flagHighDfw: 'Flag high DFW as red'
  },
  lineDash: {
    none: 'None',
    flagHighDfw: 'Flag high DFW as dashed line'
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

type CourseStats = {
  dfw: number | null
  frequency: string[] | null
  waitlist: number | null
}

function getStats (courseName: string): CourseStats {
  const match = courseName.toUpperCase().match(/([A-Z]+) *(\d+[A-Z]*)/)
  return {
    dfw:
      (match && (dfwRates as Record<string, number>)[match[1] + match[2]]) ??
      null,
    frequency:
      (match &&
        (frequencies as Record<string, string[]>)[match[1] + match[2]]) ??
      null,
    waitlist:
      (match &&
        (waitlists as Record<string, number>)[match[1] + ' ' + match[2]]) ??
      null
  }
}

function interpretFrequency (terms: string[]): string {
  const quarters = terms.map(term => term.slice(0, 2))
  const summer = quarters.includes('S1') || quarters.includes('S2')
  const regular = [
    quarters.includes('FA') ? 'Fall' : '',
    quarters.includes('WI') ? 'Winter' : '',
    quarters.includes('SP') ? 'Spring' : ''
  ].filter(quarter => quarter)
  if (regular.length === 3) {
    return summer ? 'Year-round (incl. summer)' : 'Regular year (no summer)'
  } else {
    if (summer) {
      regular.push('Summer')
    }
    return regular.join(', ')
  }
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

  const [dfwThreshold, setDfwThreshold] = useState('10')

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
    const threshold = +dfwThreshold / 100
    const options: GraphOptions<
      VisualizationRequisite,
      VisualizationCourse,
      VisualizationTerm
    > = {
      termName: (_, i) =>
        `${['Fall', 'Winter', 'Spring'][i % 3]} ${Math.floor(i / 3) + 1}`,
      termSummary: term => {
        const termComplexity = term.curriculum_items.reduce((acc, curr) => {
          const { dfw } = getStats(curr.name)
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
        const { dfw, waitlist } = getStats(course.name)
        node.textContent =
          courseBall === 'complexity'
            ? complexity === 'default' ||
              dfw === null ||
              course.metrics.complexity === undefined
              ? String(course.metrics.complexity ?? '')
              : complexity === 'dfw'
              ? (course.metrics.complexity * dfw).toFixed(2)
              : (course.metrics.complexity * (dfw + 1)).toFixed(1)
            : courseBall === 'dfw'
            ? dfw !== null
              ? (dfw * 100).toFixed(0)
              : ''
            : courseBall === 'units'
            ? String(course.credits)
            : courseBall === 'waitlist'
            ? waitlist !== null
              ? waitlist.toFixed(0)
              : ''
            : ''
        node.style.fontSize =
          courseBall === 'complexity' && complexity !== 'default' ? '0.8em' : ''
        node.style.setProperty(
          '--border-color',
          dfw !== null && dfw > threshold && courseBallColor === 'flagHighDfw'
            ? '#ef4444'
            : ''
        )
        node.style.borderWidth =
          dfw !== null && courseBallWidth === 'dfwThick'
            ? `${dfw * 30 + 1}px`
            : dfw !== null && courseBallWidth === 'dfwThin'
            ? `${(1 - dfw) * 5}px`
            : courseBallWidth === 'unitsThick'
            ? `${course.credits}px`
            : waitlist !== null && courseBallWidth === 'waitlistThick'
            ? `${waitlist / 4 + 1}px`
            : ''
      },
      styleLink: (path, { type, source }) => {
        const { dfw, waitlist } = getStats(source.name)
        path.setAttributeNS(
          null,
          'stroke',
          dfw !== null && dfw > threshold && lineColor === 'flagHighDfw'
            ? '#ef4444'
            : ''
        )
        path.setAttributeNS(
          null,
          'stroke-width',
          dfw !== null && lineWidth === 'dfwThick'
            ? `${dfw * 15 + 0.5}`
            : dfw !== null && lineWidth === 'dfwThin'
            ? `${(1 - dfw) * 3}`
            : waitlist !== null && lineWidth === 'waitlistThick'
            ? `${waitlist / 4 + 0.5}`
            : ''
        )
        path.setAttributeNS(
          null,
          'stroke-dasharray',
          dfw !== null && dfw > threshold && lineDash === 'flagHighDfw'
            ? '5 5'
            : ''
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
        const { dfw, frequency, waitlist } = getStats(course.name)
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
              : (course.metrics.complexity * (dfw + 1)).toFixed(1)
          ],
          ['Centrality', String(course.metrics.centrality)],
          ['Blocking factor', String(course.metrics['blocking factor'])],
          ['Delay factor', String(course.metrics['delay factor'])],
          ['DFW rate', dfw !== null ? `${(dfw * 100).toFixed(1)}%` : 'N/A'],
          [
            'Offered',
            frequency !== null ? interpretFrequency(frequency) : 'N/A'
          ],
          ['Average waitlist', waitlist !== null ? waitlist.toFixed(0) : 'N/A']
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
    complexity,
    dfwThreshold
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
        <TextField value={dfwThreshold} onChange={setDfwThreshold} numeric>
          Minimum DFW considered "high" (%)
        </TextField>
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
        {dfwRates['MATH18'] < 0.001 ? (
          <p>For this demo, DFW rates have been randomized.</p>
        ) : (
          <p>
            This demo is currently showing <em>real</em> DFW rates, which is
            protected data.
          </p>
        )}
        <p>Data were sampled from the 2021–2022 academic year.</p>
      </aside>
    </>
  )
}
