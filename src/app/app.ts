import './app.css'
import { Graph, IRequisite } from '../index'
import example from './example.json'
import {
  VisualizationCourse,
  VisualizationRequisite,
  VisualizationTerm
} from './types'

// https://curricularanalytics.org/degree_plans/11085
const graph = new Graph<
  VisualizationRequisite,
  VisualizationCourse,
  VisualizationTerm
>({})
graph.setCurriculum(example)
graph.wrapper.classList.add('graph')
document.body.append(graph.wrapper)
