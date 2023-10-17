import { useEffect, useRef, useState } from 'react'
import { Graph, GraphOptions } from '../src/index'
import styles from './app.module.css'
import example from './example.json'
import './index.css'
import {
  RequisiteType,
  VisualizationCourse,
  VisualizationRequisite,
  VisualizationTerm,
  toRequisiteType
} from './types'

// TEMP: Contains sensitive info
import dfwRates from '../../ExploratoryCurricularAnalytics/files/summarize_dfw.json'
import { Dropdown } from './components/Dropdown'

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
  }
} as const

const classes: Record<RequisiteType, string> = {
  prereq: styles.prereqs,
  coreq: styles.coreqs,
  'strict-coreq': styles.strictCoreqs
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
    useState<keyof typeof options['courseBallColor']>('none')
  const [courseBallWidth, setCourseBallWidth] =
    useState<keyof typeof options['courseBallWidth']>('none')
  const [lineWidth, setLineWidth] =
    useState<keyof typeof options['lineWidth']>('none')
  const [lineColor, setLineColor] =
    useState<keyof typeof options['lineColor']>('none')
  const [lineDash, setLineDash] =
    useState<keyof typeof options['lineDash']>('none')

  useEffect(() => {
    // https://curricularanalytics.org/degree_plans/11085
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
      termSummary: term =>
        `Complex.: ${term.curriculum_items.reduce(
          (acc, curr) => acc + (curr.metrics.complexity ?? 0),
          0
        )}\nUnits: ${term.curriculum_items.reduce(
          (acc, curr) => acc + (curr.credits ?? 0),
          0
        )}`,
      courseName: ({ name, nameSub, nameCanonical }) =>
        name +
        (nameSub ? `\n${nameSub}` : '') +
        (nameCanonical ? `\n(${nameCanonical})` : ''),
      styleNode: (node, course) => {
        const dfw = (dfwRates as Record<string, number>)[
          course.name.replaceAll(' ', '')
        ]
        node.textContent =
          courseBall === 'complexity'
            ? String(course.metrics.complexity ?? '')
            : courseBall === 'dfw'
            ? dfw !== undefined
              ? (dfw * 100).toFixed(0)
              : ''
            : courseBall === 'units'
            ? String(course.credits)
            : ''
        node.style.borderColor =
          dfw !== undefined && dfw > 0.1 && courseBallColor === 'flagHighDfw'
            ? 'red'
            : ''
        node.style.borderWidth =
          dfw !== undefined && courseBallWidth === 'dfwThick'
            ? `${dfw * 30 + 1}px`
            : dfw !== undefined && courseBallWidth === 'dfwThin'
            ? `${(1 - dfw) * 5}px`
            : courseBallWidth === 'unitsThick'
            ? `${course.credits}px`
            : ''
      },
      styleLink: (path, { type, source }) => {
        const dfw = (dfwRates as Record<string, number>)[
          source.name.replaceAll(' ', '')
        ]
        path.setAttributeNS(
          null,
          'stroke',
          dfw !== undefined && dfw > 0.1 && lineColor === 'flagHighDfw'
            ? 'red'
            : ''
        )
        path.setAttributeNS(
          null,
          'stroke-width',
          dfw !== undefined && lineWidth === 'dfwThick'
            ? `${dfw * 15 + 0.5}`
            : dfw !== undefined && lineWidth === 'dfwThin'
            ? `${(1 - dfw) * 3}`
            : ''
        )
        path.setAttributeNS(
          null,
          'stroke-dasharray',
          dfw !== undefined && dfw > 0.1 && lineDash === 'flagHighDfw'
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
        // TEMP
        const dfw = (dfwRates as Record<string, number>)[
          course.name.replaceAll(' ', '')
        ]
        return [
          ['Units', String(course.credits)],
          ['Complexity', String(course.metrics.complexity)],
          ['Centrality', String(course.metrics.centrality)],
          ['Blocking factor', String(course.metrics['blocking factor'])],
          ['Delay factor', String(course.metrics['delay factor'])],
          ['DFW rate', dfw !== undefined ? `${(dfw * 100).toFixed(1)}%` : 'N/A']
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
    lineDash
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
      </aside>
    </>
  )
}
