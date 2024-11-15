import { useEffect, useMemo, useRef, useState } from 'react'
import { Graph, GraphOptions } from '../src/index'
import styles from './app.module.css'
import { Dropdown, TextField } from './components/Dropdown'
import './index.css'
import { RequisiteType } from './types'
import * as GraphUtils from '../src/graph-utils'
import { csvBlobToDegreePlan } from './util/parse-degree-plan'
import {
  getTermClamped,
  compareTerm,
  getTerm,
  PrereqTermBounds,
  Term
} from './util/terms'
import { CourseDatalist } from './components/CourseDatalist'
import { updatePrereqs } from './util/updatePrereqs'

export type LinkedCourse = {
  /** 0-indexed */
  year: number
  quarter: 'FA' | 'WI' | 'SP'
  id: number
  name: string
  credits: number
  backwards: LinkedCourse[]
  forwards: LinkedCourse[]
}

export type PrereqCache = Record<Term, Record<string, string[][]>>

export type CourseStats = {
  dfw: number | null
  dfwForDepartment: boolean
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

/** Whether a course is upper-division (course number >= 100) */
function isUd (courseName: string) {
  courseName = courseName.toUpperCase()
  const match = courseName.match(/[A-Z]+ *(\d+)[A-Z]*/)
  return match ? +match[1] >= 100 : courseName.includes('UD ELECTIVE')
}

const DATA_SOURCE_URL =
  'https://raw.githubusercontent.com/SheepTester-forks/ucsd-degree-plans/main'

export type LinkId = `${number}->${number}`

export type AppProps = {
  initDegreePlan: LinkedCourse[][]
  initReqTypes: Record<LinkId, RequisiteType>
  getStats(courseName: string): CourseStats
  defaults?: 'ca' | 'ucsd' | (string & {})
  panelMode?: {
    title?: string
    key?: boolean
    options?: boolean
    majorDfwNote?: boolean
  }
  realData?: boolean
  year: number
}
export function App ({
  initDegreePlan,
  initReqTypes,
  getStats,
  defaults,
  panelMode = { key: true },
  realData,
  year
}: AppProps) {
  const [degreePlan, setDegreePlan] = useState(initDegreePlan)
  const [reqTypes, setReqTypes] = useState(initReqTypes)

  const ref = useRef<HTMLDivElement>(null)
  const graph = useRef<Graph<LinkedCourse> | null>(null)

  const [courseBall, setCourseBall] =
    useState<keyof typeof options['courseBall']>('units')
  const [courseBallColor, setCourseBallColor] = useState<
    keyof typeof options['courseBallColor']
  >(defaults === 'ca' ? 'none' : 'flagHighDfw')
  const [courseBallWidth, setCourseBallWidth] = useState<
    keyof typeof options['courseBallWidth']
  >(defaults === 'ca' ? 'none' : 'dfwFlag')
  const [lineWidth, setLineWidth] = useState<keyof typeof options['lineWidth']>(
    defaults === 'ca' ? 'none' : 'waitlistThick'
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

  const [dfwLdThreshold, setDfwLdThreshold] = useState('10')
  const [dfwUdThreshold, setDfwUdThreshold] = useState('10')
  const [waitlistThreshold, setWaitlistThreshold] = useState('10')

  const [showWaitlistWarning, setShowWaitlistWarning] = useState(
    defaults !== 'ca'
  )
  const [showNotOfferedWarning, setShowNotOfferedWarning] = useState(
    defaults !== 'ca'
  )

  const [prereqCache, setPrereqCache] = useState<PrereqCache>({})
  const metadataRef = useRef<PrereqTermBounds>({
    min_prereq_term: 'FA24',
    max_prereq_term: 'FA24'
  })

  useEffect(() => {
    fetch(`${DATA_SOURCE_URL}/metadata.json`)
      .then(r => r.json())
      .then(metadata => {
        metadataRef.current = metadata
      })
  }, [])

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
    const ldThreshold = +dfwLdThreshold / 100
    const udThreshold = +dfwUdThreshold / 100
    const options: GraphOptions<LinkedCourse> = {
      system: 'semester',
      termName: (_, i) =>
        `${['Fall', 'Winter', 'Spring'][i % 3]} '${String(
          (year + Math.floor((i + 2) / 3)) % 100
        ).padStart(2, '0')}`,
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
        const threshold = isUd(course.name) ? udThreshold : ldThreshold
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
              : dfw !== null &&
                courseBallWidth === 'dfwFlag' &&
                dfw >= threshold
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
        const threshold = isUd(source.course.name) ? udThreshold : ldThreshold
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
            ? `${dfw * 15 + 1}`
            : dfw !== null && lineWidth === 'dfwThin'
              ? `${(1 - dfw) * 3}`
              : dfw !== null && lineWidth === 'dfwFlag' && dfw >= threshold
                ? '3'
                : waitlist !== null && lineWidth === 'waitlistThick'
                  ? `${waitlist / 4 + 1}`
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
      tooltipTitle: ({ course }) => {
        const term = getTermClamped(year, course, metadataRef.current)
        if (!prereqCache[term]) {
          fetch(`${DATA_SOURCE_URL}/prereqs/${term}.json`)
            .then(r => r.json())
            .then(prereqs =>
              setPrereqCache(prereqCache =>
                prereqCache[term]
                  ? prereqCache
                  : {
                    ...prereqCache,
                    [term]: prereqs
                  }
              )
            )
        }
        return {
          content: course.name,
          editable: true,
          dataListId: 'courses'
        }
      },
      onTooltipTitleChange: ({ course }, courseName) => {
        const updated = updatePrereqs(
          degreePlan.map(term =>
            term.map(c => (c.id === course.id ? { ...c, name: courseName } : c))
          ),
          prereqCache,
          year,
          metadataRef.current
        )
        setDegreePlan(updated.degreePlan)
        setReqTypes(updated.reqTypes)
      },
      tooltipContent: ({ course, centrality }) => {
        const { dfw, dfwForDepartment, frequency, waitlist } = getStats(
          course.name
        )
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
          [
            'DFW rate',
            dfw !== null
              ? `${(dfw * 100).toFixed(1)}%${dfwForDepartment ? '*' : ''}`
              : 'N/A'
          ],
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
        const { dfw, dfwForDepartment } = getStats(source.course.name)
        element.children[0].textContent = source.course.name
        element.children[1].textContent =
          dfw !== null
            ? `${dfwForDepartment ? '*' : ''}${(dfw * 100).toFixed(1)}% DFW`
            : ''
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
    dfwLdThreshold,
    dfwUdThreshold,
    waitlistThreshold,
    showWaitlistWarning,
    showNotOfferedWarning,
    redundantVisibility
  ])

  return (
    <>
      <div className={styles.graphWrapper} ref={ref} />
      {(panelMode.key || panelMode.options) && (
        <aside className={styles.options}>
          {panelMode.title ? <h1>{panelMode.title}</h1> : null}
          {panelMode.key ? (
            <>
              <h2>Key</h2>
              {courseBall !== 'none' && (
                <p>
                  The number indicates the course's{' '}
                  {courseBall === 'bf'
                    ? 'blocking factor'
                    : courseBall === 'dfw'
                      ? 'DFW rate'
                      : courseBall === 'waitlist'
                        ? 'waitlist length'
                        : courseBall}
                  .
                </p>
              )}
              <p className={styles.keyEntry}>
                <span
                  className={`${styles.keyCourse} ${styles.directPrereq}`}
                />
                Prerequisite
              </p>
              <p className={styles.keyEntry}>
                <span className={`${styles.keyCourse} ${styles.prereq}`} />
                All prerequisites
              </p>
              <p className={styles.keyEntry}>
                <span
                  className={`${styles.keyCourse} ${styles.directBlocking}`}
                />
                Directly blocked
              </p>
              <p className={styles.keyEntry}>
                <span className={`${styles.keyCourse} ${styles.blocking}`} />
                All blocked
              </p>
              {defaults === 'ucsd' && (
                <>
                  <p className={styles.keyEntry}>
                    <span
                      className={styles.keyCourse}
                      style={{ backgroundColor: 'yellow' }}
                    />
                    Course not offered in quarter
                  </p>
                  <p>Ignoring summer offerings,</p>
                  <p className={styles.keyEntry}>
                    <span className={styles.keyCourse} />
                    Offered year-round
                  </p>
                  <p className={styles.keyEntry}>
                    <span
                      className={styles.keyCourse}
                      style={{ borderRadius: '5px' }}
                    />
                    Offered twice a year
                  </p>
                  <p className={styles.keyEntry}>
                    <svg
                      width={20}
                      height={20}
                      viewBox='0 0 40 40'
                      xmlns='http://www.w3.org/2000/svg'
                      style={{ flex: 'none' }}
                    >
                      <path
                        d='M18.2679 3C19.0377 1.66667 20.9623 1.66667 21.7321 3L36.4545 28.5C37.2243 29.8333 36.262 31.5 34.7224 31.5H5.27757C3.73797 31.5 2.77572 29.8333 3.54552 28.5L18.2679 3Z'
                        fill='#e2e8f0'
                        stroke='#64748b'
                        vectorEffect='non-scaling-stroke'
                      />
                    </svg>
                    Offered once a year
                  </p>
                  <p className={styles.keyEntry}>
                    <span
                      className={styles.line}
                      style={{
                        background:
                          'linear-gradient(to right, #64748b 0%, #64748b 50%, transparent 50%, transparent 100%)',
                        backgroundSize: '10px'
                      }}
                    />
                    Redundant prerequisite
                  </p>
                  <p className={styles.keyEntry}>
                    <span
                      className={styles.line}
                      style={{ backgroundColor: '#3b82f6', height: '5px' }}
                    />
                    Longest path
                  </p>
                  <p className={styles.keyEntry}>
                    <span
                      className={styles.line}
                      style={{ backgroundColor: 'red', height: '3px' }}
                    />
                    Prerequisite has high DFW
                  </p>
                  <p>⚠️ Long waitlist</p>
                </>
              )}
            </>
          ) : null}
          <h2>Disclaimer</h2>
          {realData ? (
            <p>
              This demo is currently showing <em>real</em> protected data.
            </p>
          ) : (
            <p>
              For this demo, protected data have been replaced with{' '}
              <strong>randomized</strong> values.
            </p>
          )}
          <p>Data were sampled between fall 2021 and spring 2024.</p>
          {panelMode.majorDfwNote ? (
            <p>*DFW rate is specific to majors in this department.</p>
          ) : null}
          {panelMode.options && (
            <details open={!panelMode.key}>
              <summary>
                <h2>Options</h2>
              </summary>
              <label>
                Upload degree plan:{' '}
                <input
                  type='file'
                  accept='.csv'
                  onChange={async e => {
                    const input = e.currentTarget
                    const file = input.files?.[0]
                    if (file) {
                      const { degreePlan, reqTypes } =
                        await csvBlobToDegreePlan(file)
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
              <TextField
                value={dfwLdThreshold}
                onChange={setDfwLdThreshold}
                numeric
              >
                Minimum DFW considered "high" for LD courses (%)
              </TextField>
              <TextField
                value={dfwUdThreshold}
                onChange={setDfwUdThreshold}
                numeric
              >
                Minimum DFW considered "high" for UD courses (%)
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
            </details>
          )}
        </aside>
      )}
      <CourseDatalist id='courses' prereqCache={prereqCache} />
    </>
  )
}
