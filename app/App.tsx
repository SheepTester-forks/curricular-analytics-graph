import { useEffect, useMemo, useRef, useState } from 'react'
import { Graph, GraphOptions } from '../src/index'
import styles from './app.module.css'
import { Dropdown, TextField } from './components/Dropdown'
import './index.css'
import { RequisiteType } from './types'
import * as GraphUtils from '../src/graph-utils'

export type LinkedCourse = {
  id: number
  name: string
  credits: number
  backwards: LinkedCourse[]
  forwards: LinkedCourse[]
}

export type CourseStats = {
  dfw: number | null
  frequency: string[] | null
  waitlist: number | null
}

const triangleShape = document.getElementById('triangle')

const options = {
  courseBall: {
    none: 'None',
    complexity: 'Complexity',
    bf: 'Blocking factor',
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
    dfwFlag: 'Flag high DFW as thick',
    unitsThick: 'More units is thicker',
    waitlistThick: 'Longer waitlist is thicker'
  },
  lineWidth: {
    none: 'None',
    dfwThick: 'High DFW is thicker',
    dfwThin: 'High DFW is thinner',
    dfwFlag: 'Flag high DFW as thick',
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
  complexityMode: {
    default: 'Same as Curricular Analytics',
    dfw: 'Multiply course complexity by DFW rate',
    dfwPlus1: 'Multiply course complexity by (DFW rate + 1)',
    dfwPlus1Bf: 'Multiply blocking factors by (DFW rate + 1)'
  },
  shapes: {
    nothing: 'Nothing',
    frequency: 'Number of terms offered per year'
  },
  redundantVisibility: {
    visible: 'Normal line',
    dashed: 'Dashed line',
    hidden: 'Hidden'
  }
} as const

const classes: Record<RequisiteType, string> = {
  prereq: styles.prereqs,
  coreq: styles.coreqs,
  'strict-coreq': styles.strictCoreqs
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

export type LinkId = `${number}->${number}`

export type AppProps = {
  degreePlan: LinkedCourse[][]
  reqTypes: Record<LinkId, RequisiteType>
  getStats(courseName: string): CourseStats
  realData?: boolean
}

export function App ({ degreePlan, reqTypes, getStats, realData }: AppProps) {
  const ref = useRef<HTMLDivElement>(null)

  const graph = useRef<Graph<LinkedCourse> | null>(null)

  const [courseBall, setCourseBall] =
    useState<keyof typeof options['courseBall']>('complexity')
  const [courseBallColor, setCourseBallColor] =
    useState<keyof typeof options['courseBallColor']>('flagHighDfw')
  const [courseBallWidth, setCourseBallWidth] =
    useState<keyof typeof options['courseBallWidth']>('dfwFlag')
  const [lineWidth, setLineWidth] =
    useState<keyof typeof options['lineWidth']>('dfwFlag')
  const [lineColor, setLineColor] =
    useState<keyof typeof options['lineColor']>('flagHighDfw')
  const [lineDash, setLineDash] =
    useState<keyof typeof options['lineDash']>('none')
  const [complexityMode, setComplexityMode] =
    useState<keyof typeof options['complexityMode']>('dfwPlus1Bf')
  const [shapes, setShapes] =
    useState<keyof typeof options['shapes']>('frequency')
  const [redundantVisibility, setRedundantVisibility] =
    useState<keyof typeof options['redundantVisibility']>('dashed')

  const [dfwThreshold, setDfwThreshold] = useState('10')
  const [waitlistThreshold, setWaitlistThreshold] = useState('10')

  const [showWaitlistWarning, setShowWaitlistWarning] = useState(true)

  const {
    blockingFactors,
    delayFactors,
    complexities,
    centralities,
    redundantReqs
  } = useMemo(() => {
    const curriculum = degreePlan.flat()
    const blockingFactors = new Map(
      curriculum.map(course => [
        course,
        GraphUtils.blockingFactor(course, course => {
          const { dfw } = getStats(course.name)
          return complexityMode === 'dfwPlus1Bf' ? (dfw ?? 0) + 1 : 1
        })
      ])
    )
    const allPaths = GraphUtils.allPaths(curriculum)
    const delayFactors = GraphUtils.delayFactors(allPaths)
    const complexities = new Map(
      Array.from(
        GraphUtils.complexities(blockingFactors, delayFactors, 'semester'),
        ([course, complexity]) => {
          const { dfw } = getStats(course.name)
          return [
            course,
            (complexityMode === 'dfw'
              ? dfw ?? 0
              : complexityMode === 'dfwPlus1'
              ? (dfw ?? 0) + 1
              : 1) * complexity
          ]
        }
      )
    )
    const centralities = new Map(
      curriculum.map(course => [
        course,
        GraphUtils.centrality(allPaths, course)
      ])
    )
    const redundantReqs = GraphUtils.redundantRequisites(curriculum).map(
      ([source, target]): LinkId => `${source.id}->${target.id}`
    )
    return {
      blockingFactors,
      delayFactors,
      complexities,
      centralities,
      redundantReqs
    }
  }, [degreePlan, complexityMode])

  useEffect(() => {
    graph.current = new Graph()
    graph.current.wrapper.classList.add(styles.graph)
    ref.current?.append(graph.current.wrapper)

    return () => {
      graph.current?.wrapper.remove()
      graph.current = null
    }
  }, [])

  useEffect(() => {
    if (graph.current) {
      graph.current.setCurriculum(degreePlan)
    }
  }, [degreePlan])

  useEffect(() => {
    const threshold = +dfwThreshold / 100
    const options: GraphOptions<LinkedCourse> = {
      termName: (_, i) =>
        `${['Fall', 'Winter', 'Spring'][i % 3]} ${Math.floor(i / 3) + 1}`,
      termSummary: term => {
        const termComplexity = term.reduce((acc, curr) => {
          const { dfw } = getStats(curr.name)
          const complexity = complexities.get(curr)
          return (
            acc +
            (complexityMode === 'default' ||
            dfw === null ||
            complexity === undefined
              ? complexity ?? 0
              : complexityMode === 'dfw'
              ? complexity * dfw
              : complexity * (dfw + 1))
          )
        }, 0)
        return `Complex.: ${
          complexityMode === 'default'
            ? termComplexity
            : termComplexity.toFixed(2)
        }\nUnits: ${term.reduce((acc, curr) => acc + (curr.credits ?? 0), 0)}`
      },
      courseName: ({ name }) => {
        const { waitlist } = getStats(name)
        return (
          (showWaitlistWarning &&
          waitlist !== null &&
          waitlist > +waitlistThreshold
            ? '⚠️'
            : '') + name
        )
      },
      courseNode: course => {
        const { dfw, waitlist } = getStats(course.name)
        const complexity = complexities.get(course)
        return courseBall === 'complexity'
          ? complexityMode === 'default' ||
            dfw === null ||
            complexity === undefined
            ? String(complexity ?? '')
            : complexityMode === 'dfw'
            ? complexity.toFixed(2)
            : complexity.toFixed(1)
          : courseBall === 'bf'
          ? complexityMode === 'dfwPlus1Bf'
            ? blockingFactors.get(course)?.toFixed(1) ?? ''
            : String(blockingFactors.get(course))
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
      },
      styleNode: (node, course) => {
        const { dfw, waitlist, frequency } = getStats(course.name)
        node.classList.remove(styles.square, styles.triangle)
        const terms = new Set(frequency?.map(term => term.slice(0, 2)))
        terms.delete('S1')
        terms.delete('S2')
        if (shapes === 'frequency') {
          if (terms.size === 2) {
            node.classList.add(styles.square)
          } else if (terms.size === 1) {
            if (!node.querySelector(`.${styles.triangleShape}`)) {
              const shape = triangleShape?.cloneNode(true)
              if (shape instanceof Element) {
                shape.id = ''
                shape.classList.add(styles.triangleShape)
                node.append(shape)
              }
            }
            node.classList.add(styles.triangle)
          }
        }
        node.style.fontSize =
          (courseBall === 'complexity' && complexityMode !== 'default') ||
          (courseBall === 'bf' && complexityMode === 'dfwPlus1Bf')
            ? '0.8em'
            : ''
        node.style.setProperty(
          '--border-color',
          dfw !== null && dfw >= threshold && courseBallColor === 'flagHighDfw'
            ? '#ef4444'
            : ''
        )
        node.style.borderWidth =
          dfw !== null && courseBallWidth === 'dfwThick'
            ? `${dfw * 30 + 1}px`
            : dfw !== null && courseBallWidth === 'dfwThin'
            ? `${(1 - dfw) * 5}px`
            : dfw !== null && courseBallWidth === 'dfwFlag' && dfw >= threshold
            ? '3px'
            : courseBallWidth === 'unitsThick'
            ? `${course.credits}px`
            : waitlist !== null && courseBallWidth === 'waitlistThick'
            ? `${waitlist / 4 + 1}px`
            : ''
      },
      styleLink: (path, source, target) => {
        const { dfw, waitlist } = getStats(source.name)
        const linkId: LinkId = `${source.id}->${target.id}`
        const redundant = redundantReqs.includes(linkId)
        path.setAttributeNS(
          null,
          'stroke',
          dfw !== null && dfw >= threshold && lineColor === 'flagHighDfw'
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
            : dfw !== null && lineWidth === 'dfwFlag' && dfw >= threshold
            ? '3'
            : waitlist !== null && lineWidth === 'waitlistThick'
            ? `${waitlist / 4 + 0.5}`
            : ''
        )
        path.setAttributeNS(
          null,
          'stroke-dasharray',
          (dfw !== null && dfw >= threshold && lineDash === 'flagHighDfw') ||
            (redundant && redundantVisibility === 'dashed')
            ? '5 5'
            : ''
        )
        path.setAttributeNS(
          null,
          'visibility',
          redundant && redundantVisibility === 'hidden' ? 'hidden' : ''
        )
        path.classList.add(classes[reqTypes[linkId]])
      },
      styleLinkedNode: (node, course, link) => {
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
        } else if (link.relation === 'backwards') {
          const reqType = reqTypes[`${course.id}->${link.from.id}`]
          node.classList.add(
            link.direct
              ? reqType === 'prereq'
                ? styles.directPrereq
                : reqType === 'coreq'
                ? styles.directCoreq
                : styles.directStrictCoreq
              : styles.prereq
          )
        } else {
          node.classList.add(
            link.relation === 'selected'
              ? styles.selected
              : link.relation === 'forwards'
              ? link.direct
                ? styles.directBlocking
                : styles.blocking
              : link.relation // never
          )
        }
      },
      tooltipTitle: course => course.name,
      tooltipContent: course => {
        const { dfw, frequency, waitlist } = getStats(course.name)
        const complexity = complexities.get(course)
        return [
          ['Units', String(course.credits)],
          [
            'Complexity',
            complexityMode === 'default' ||
            dfw === null ||
            complexity === undefined
              ? String(complexity ?? '')
              : complexityMode === 'dfw'
              ? complexity.toFixed(2)
              : complexity.toFixed(1)
          ],
          ['Centrality', String(centralities.get(course))],
          [
            'Blocking factor',
            complexityMode === 'dfwPlus1Bf'
              ? blockingFactors.get(course)?.toFixed(2) ?? ''
              : String(blockingFactors.get(course))
          ],
          ['Delay factor', String(delayFactors.get(course) ?? 1)],
          ['DFW rate', dfw !== null ? `${(dfw * 100).toFixed(1)}%` : 'N/A'],
          [
            'Offered',
            frequency !== null ? interpretFrequency(frequency) : 'N/A'
          ],
          ['Avg. waitlist', waitlist !== null ? waitlist.toFixed(0) : 'N/A']
        ]
      },
      tooltipRequisiteInfo: (element, source) => {
        if (element.children.length < 2) {
          element.append(
            Object.assign(document.createElement('span'), {
              // className: styles.tooltipReqName
            }),
            ' ',
            Object.assign(document.createElement('span'), {
              // className: styles.tooltipReqType
            })
          )
        }
        const { dfw } = getStats(source.name)
        element.children[0].textContent = source.name
        element.children[1].textContent =
          dfw !== null ? `${(dfw * 100).toFixed(1)}% DFW` : ''
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
    complexityMode,
    shapes,
    dfwThreshold,
    waitlistThreshold,
    showWaitlistWarning,
    redundantVisibility
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
          options={options.complexityMode}
          value={complexityMode}
          onChange={setComplexityMode}
        >
          Complexity formula
        </Dropdown>
        <Dropdown options={options.shapes} value={shapes} onChange={setShapes}>
          Course node shape
        </Dropdown>
        <p>
          <label>
            <input
              type='checkbox'
              checked={showWaitlistWarning}
              onChange={e => setShowWaitlistWarning(e.currentTarget.checked)}
            />{' '}
            Show a warning icon on courses with a long waitlist.
          </label>
        </p>
        <TextField
          value={waitlistThreshold}
          onChange={setWaitlistThreshold}
          numeric
        >
          Minimum waitlist length for warning
        </TextField>
        <Dropdown
          options={options.redundantVisibility}
          value={redundantVisibility}
          onChange={setRedundantVisibility}
        >
          Show redundant requisites as
        </Dropdown>
        {realData ? (
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
