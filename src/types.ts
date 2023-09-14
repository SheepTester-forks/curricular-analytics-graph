export type VisualizationData = {
  options: VisualizationOptions
  curriculum: VisualizationCurriculum
}

export type VisualizationOptions = {
  edit: boolean
  hideTerms: boolean
}

export type VisualizationCurriculum = {
  /** Name of the degree plan. */
  dp_name: string
  /** Name of the curriculum. */
  name: string
  institution: string
  curriculum_terms: VisualizationTerm[]
}

export type VisualizationTerm = {
  /** 1-indexed index. */
  id: number
  /** Defaults to `Term ${id}`. */
  name: string
  curriculum_items: VisualizationCourse[]
}

export type VisualizationCourse = {
  /**
   * Course ID. As in CurricularAnalytics.jl, the course ID is not guaranteed be
   * unique (e.g. multiple generic "elective" courses with the same name), but
   * it is good practice to supply unique IDs.
   */
  id: number
  /** Course title. */
  nameSub: string
  /** Course code: `${prefix} ${num}`. */
  name: string
  credits: number
  curriculum_requisites: VisualizationRequisite[]
  /**
   * Omit metrics to not show them.
   */
  metrics: Partial<VisualizationMetrics>
  /** Canonical course name. */
  nameCanonical: string
}

export type VisualizationRequisite = {
  /**
   * Course ID of the requisite course. If there are multiple courses with the
   * same ID, then the earliest course is considered the requisite.
   */
  source_id: number
  /** Course ID of the target course. */
  target_id: number
  type:
    | 'CurriculumPrerequisite'
    | 'CurriculumCorequisite'
    | 'CurriculumStrictCorequisite'
}

export type VisualizationMetrics = {
  complexity: number
  centrality: number
  'delay factor': number
  'blocking factor': number
}
