import { useEffect, useMemo, useRef, useState } from 'react'
import { Graph, GraphOptions } from '../src/index'
import styles from './app.module.css'
import { Dropdown, TextField } from './components/Dropdown'
import './index.css'
import { RequisiteType } from './types'
import * as GraphUtils from '../src/graph-utils'
import { csvBlobToDegreePlan } from './util/parse-degree-plan'

export type LinkedCourse = {
  quarter: 'FA' | 'WI' | 'SP'
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
  initDegreePlan: LinkedCourse[][]
  initReqTypes: Record<LinkId, RequisiteType>
  getStats(courseName: string): CourseStats
  defaults?: string
  showOptions?: boolean
  realData?: boolean
}
export function App ({
  initDegreePlan,
  initReqTypes,
  getStats,
  defaults,
  showOptions,
  realData
}: AppProps) {
  const [degreePlan, setDegreePlan] = useState(initDegreePlan)
  const [reqTypes, setReqTypes] = useState(initReqTypes)

  const ref = useRef<HTMLDivElement>(null)
  const graph = useRef<Graph<LinkedCourse> | null>(null)

  const [courseBall, setCourseBall] =
    useState<keyof typeof options['courseBall']>('complexity')
  const [courseBallColor, setCourseBallColor] = useState<
    keyof typeof options['courseBallColor']
  >(defaults === 'ca' ? 'none' : 'flagHighDfw')
  const [courseBallWidth, setCourseBallWidth] = useState<
    keyof typeof options['courseBallWidth']
  >(defaults === 'ca' ? 'none' : 'dfwFlag')
  const [lineWidth, setLineWidth] = useState<keyof typeof options['lineWidth']>(
    defaults === 'ca' ? 'none' : 'dfwFlag'
  )
  const [lineColor, setLineColor] = useState<keyof typeof options['lineColor']>(
    defaults === 'ca' ? 'none' : 'flagHighDfw'
  )
  const [lineDash, setLineDash] =
    useState<keyof typeof options['lineDash']>('none')
  const [complexityMode, setComplexityMode] = useState<
    keyof typeof options['complexityMode']
  >(defaults === 'ca' ? 'default' : 'dfwPlus1Bf')
  const [shapes, setShapes] = useState<keyof typeof options['shapes']>(
    defaults === 'ca' ? 'nothing' : 'frequency'
  )
  const [redundantVisibility, setRedundantVisibility] = useState<
    keyof typeof options['redundantVisibility']
  >(defaults === 'ca' ? 'visible' : 'dashed')

  const [dfwThreshold, setDfwThreshold] = useState('10')
  const [waitlistThreshold, setWaitlistThreshold] = useState('10')

  const [showWaitlistWarning, setShowWaitlistWarning] = useState(
    defaults !== 'ca'
  )
  const [showNotOfferedWarning, setShowNotOfferedWarning] = useState(
    defaults !== 'ca'
  )

  const { blockingFactors, delayFactors, complexities } = useMemo(() => {
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
    return {
      blockingFactors,
      delayFactors,
      complexities
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
      graph.current.setDegreePlan(degreePlan)
    }
  }, [degreePlan])

  useEffect(() => {
    const threshold = +dfwThreshold / 100
    const options: GraphOptions<LinkedCourse> = {
      system: 'semester',
      termName: (_, i) =>
        `${['Fall', 'Winter', 'Spring'][i % 3]} ${Math.floor(i / 3) + 1}`,
      termSummary: term => {
        const termComplexity = term.reduce((acc, { course }) => {
          const { dfw } = getStats(course.name)
          const complexity = complexities.get(course)
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
        }\nUnits: ${term.reduce(
          (acc, { course }) => acc + (course.credits ?? 0),
          0
        )}`
      },
      courseName: ({ course: { name } }) => {
        const { waitlist } = getStats(name)
        return (
          (showWaitlistWarning &&
          waitlist !== null &&
          waitlist > +waitlistThreshold
            ? '⚠️'
            : '') + name
        )
      },
      courseNode: ({ course }) => {
        const { dfw, waitlist } = getStats(course.name)
        const complexity = complexities.get(course)
        return courseBall === 'complexity'
          ? complexityMode === 'default' || complexity === undefined
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
      styleNode: ({ element, course }) => {
        const { dfw, waitlist, frequency } = getStats(course.name)
        element.classList.remove(styles.square, styles.triangle)
        const terms = new Set(frequency?.map(term => term.slice(0, 2)))
        terms.delete('S1')
        terms.delete('S2')
        if (shapes === 'frequency') {
          if (terms.size === 2) {
            element.classList.add(styles.square)
          } else if (terms.size === 1) {
            if (!element.querySelector(`.${styles.triangleShape}`)) {
              const shape = triangleShape?.cloneNode(true)
              if (shape instanceof Element) {
                shape.id = ''
                shape.classList.add(styles.triangleShape)
                element.append(shape)
              }
            }
            element.classList.add(styles.triangle)
          }
        }
        element.style.fontSize =
          (courseBall === 'complexity' && complexityMode !== 'default') ||
          (courseBall === 'bf' && complexityMode === 'dfwPlus1Bf')
            ? '0.8em'
            : ''
        element.style.setProperty(
          '--border-color',
          dfw !== null && dfw >= threshold && courseBallColor === 'flagHighDfw'
            ? '#ef4444'
            : ''
        )
        element.style.borderWidth = element.style.strokeWidth =
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
        element.style.backgroundColor = element.style.fill =
          showNotOfferedWarning && frequency && !terms.has(course.quarter)
            ? 'yellow'
            : ''
      },
      styleLink: ({ element, source, target, redundant }) => {
        const { dfw, waitlist } = getStats(source.course.name)
        const linkId: LinkId = `${source.course.id}->${target.course.id}`
        element.setAttributeNS(
          null,
          'stroke',
          dfw !== null && dfw >= threshold && lineColor === 'flagHighDfw'
            ? '#ef4444'
            : ''
        )
        element.setAttributeNS(
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
        element.setAttributeNS(
          null,
          'stroke-dasharray',
          (dfw !== null && dfw >= threshold && lineDash === 'flagHighDfw') ||
            (redundant && redundantVisibility === 'dashed')
            ? '5 5'
            : ''
        )
        element.setAttributeNS(
          null,
          'visibility',
          redundant && redundantVisibility === 'hidden' ? 'hidden' : ''
        )
        element.classList.add(classes[reqTypes[linkId]])
      },
      styleLinkedNode: ({ element, course }, link) => {
        if (link === null) {
          element.classList.remove(
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
          element.classList.add(
            link.direct
              ? reqType === 'prereq'
                ? styles.directPrereq
                : reqType === 'coreq'
                ? styles.directCoreq
                : styles.directStrictCoreq
              : styles.prereq
          )
        } else {
          element.classList.add(
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
      tooltipTitle: ({ course }) => course.name,
      tooltipContent: ({ course, centrality }) => {
        const { dfw, frequency, waitlist } = getStats(course.name)
        const complexity = complexities.get(course)
        return [
          ['Units', String(course.credits)],
          [
            'Complexity',
            complexityMode === 'default' || complexity === undefined
              ? String(complexity ?? '')
              : complexityMode === 'dfw'
              ? complexity.toFixed(2)
              : complexity.toFixed(1)
          ],
          ['Centrality', String(centrality)],
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
      tooltipRequisiteInfo: (element, { source }) => {
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
        const { dfw } = getStats(source.course.name)
        element.children[0].textContent = source.course.name
        element.children[1].textContent =
          dfw !== null ? `${(dfw * 100).toFixed(1)}% DFW` : ''
      }
    }
    if (graph.current) {
      Object.assign(graph.current.options, options)
      graph.current?.forceUpdate()
    }
  }, [
    reqTypes,
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
    showNotOfferedWarning,
    redundantVisibility
  ])

  return (
    <>
      <div className={styles.graphWrapper} ref={ref} />
      <aside className={styles.options}>
        {showOptions && (
          <>
            <h2>Options</h2>
            <label>
              Upload degree plan:{' '}
              <input
                type='file'
                accept='.csv'
                onChange={async e => {
                  const input = e.currentTarget
                  const file = input.files?.[0]
                  if (file) {
                    const { degreePlan, reqTypes } = await csvBlobToDegreePlan(
                      file
                    )
                    setDegreePlan(degreePlan)
                    setReqTypes(reqTypes)
                  }
                  input.value = ''
                }}
              />
            </label>
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
            <Dropdown
              options={options.shapes}
              value={shapes}
              onChange={setShapes}
            >
              Course node shape
            </Dropdown>
            <p>
              <label>
                <input
                  type='checkbox'
                  checked={showWaitlistWarning}
                  onChange={e =>
                    setShowWaitlistWarning(e.currentTarget.checked)
                  }
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
            <p>
              <label>
                <input
                  type='checkbox'
                  checked={showNotOfferedWarning}
                  onChange={e =>
                    setShowNotOfferedWarning(e.currentTarget.checked)
                  }
                />{' '}
                Highlight the courses in quarters that they are not offered in
              </label>
            </p>
          </>
        )}
        <h2>Key</h2>
        <p>TODO</p>
        <h2>Disclaimer</h2>
        {realData ? (
          <p>
            For this demo, protected data have been replaced with{' '}
            <strong>randomized</strong> values.
          </p>
        ) : (
          <p>
            This demo is currently showing <em>real</em> protected data.
          </p>
        )}
        <p>Data were sampled from the 2021–2022 academic year.</p>
      </aside>
    </>
  )
}
