import './app.css'
import { Graph } from '../index'

// https://curricularanalytics.org/degree_plans/11085
const graph = new Graph({
  name: '',
  // metrics: {
  //   complexity: 514,
  //   centrality: 1410
  // },
  curriculum_terms: [
    {
      name: 'Term 1',
      curriculum_items: [
        {
          curriculum_requisites: [],
          name: 'SOCIAL SCIENCE/DEI',
          metrics: {
            centrality: 0,
            complexity: 1,
            'blocking factor': 0,
            'delay factor': 1
          },
          id: 44,
          credits: 4
        },
        {
          curriculum_requisites: [],
          name: 'FINE ARTS GE',
          metrics: {
            centrality: 0,
            complexity: 1,
            'blocking factor': 0,
            'delay factor': 1
          },
          id: 45,
          credits: 4
        },
        {
          curriculum_requisites: [],
          name: 'MATH 20A',
          metrics: {
            centrality: 0,
            complexity: 44,
            'blocking factor': 34,
            'delay factor': 10
          },
          id: 1,
          credits: 4
        },
        {
          curriculum_requisites: [],
          name: 'CHEM 6A',
          metrics: {
            centrality: 0,
            complexity: 9,
            'blocking factor': 5,
            'delay factor': 4
          },
          id: 2,
          credits: 4
        }
      ],
      id: 1
    },
    {
      name: 'Term 2',
      curriculum_items: [
        {
          curriculum_requisites: [
            {
              source_id: 2,
              target_id: 4,
              type: 'prereq'
            },
            {
              source_id: 1,
              target_id: 4,
              type: 'prereq'
            }
          ],
          name: 'CHEM 6B',
          metrics: {
            centrality: 20,
            complexity: 8,
            'blocking factor': 4,
            'delay factor': 4
          },
          id: 4,
          credits: 4
        },
        {
          curriculum_requisites: [
            {
              source_id: 1,
              target_id: 5,
              type: 'prereq'
            }
          ],
          name: 'PHYS 2A',
          metrics: {
            centrality: 95,
            complexity: 31,
            'blocking factor': 22,
            'delay factor': 9
          },
          id: 5,
          credits: 4
        },
        {
          curriculum_requisites: [],
          name: 'BENG 1',
          metrics: {
            centrality: 0,
            complexity: 5,
            'blocking factor': 2,
            'delay factor': 3
          },
          id: 6,
          credits: 2
        },
        {
          curriculum_requisites: [],
          name: 'HUM 1',
          metrics: {
            centrality: 0,
            complexity: 7,
            'blocking factor': 4,
            'delay factor': 3
          },
          id: 46,
          credits: 6
        },
        {
          curriculum_requisites: [
            {
              source_id: 1,
              target_id: 3,
              type: 'prereq'
            }
          ],
          name: 'MATH 20B',
          metrics: {
            centrality: 164,
            complexity: 37,
            'blocking factor': 27,
            'delay factor': 10
          },
          id: 3,
          credits: 4
        }
      ],
      id: 2
    },
    {
      name: 'Term 3',
      curriculum_items: [
        {
          curriculum_requisites: [
            {
              source_id: 3,
              target_id: 7,
              type: 'prereq'
            }
          ],
          name: 'MATH 20C',
          metrics: {
            centrality: 131,
            complexity: 32,
            'blocking factor': 22,
            'delay factor': 10
          },
          id: 7,
          credits: 4
        },
        {
          curriculum_requisites: [
            {
              source_id: 5,
              target_id: 8,
              type: 'prereq'
            },
            {
              source_id: 3,
              target_id: 8,
              type: 'prereq'
            }
          ],
          name: 'PHYS 2B',
          metrics: {
            centrality: 50,
            complexity: 14,
            'blocking factor': 8,
            'delay factor': 6
          },
          id: 8,
          credits: 4
        },
        {
          curriculum_requisites: [
            {
              source_id: 5,
              target_id: 9,
              type: 'prereq'
            }
          ],
          name: 'PHYS 2BL',
          metrics: {
            centrality: 0,
            complexity: 3,
            'blocking factor': 0,
            'delay factor': 3
          },
          id: 9,
          credits: 2
        },
        {
          curriculum_requisites: [],
          name: 'BILD 1',
          metrics: {
            centrality: 0,
            complexity: 5,
            'blocking factor': 2,
            'delay factor': 3
          },
          id: 10,
          credits: 4
        },
        {
          curriculum_requisites: [
            {
              source_id: 46,
              target_id: 47,
              type: 'prereq'
            }
          ],
          name: 'HUM 2',
          metrics: {
            centrality: 0,
            complexity: 2,
            'blocking factor': 0,
            'delay factor': 2
          },
          id: 47,
          credits: 6
        }
      ],
      id: 3
    },
    {
      name: 'Term 4',
      curriculum_items: [
        {
          curriculum_requisites: [
            {
              source_id: 7,
              target_id: 11,
              type: 'prereq'
            }
          ],
          name: 'MATH 20D',
          metrics: {
            centrality: 41,
            complexity: 22,
            'blocking factor': 12,
            'delay factor': 10
          },
          id: 11,
          credits: 4
        },
        {
          curriculum_requisites: [
            {
              source_id: 4,
              target_id: 12,
              type: 'prereq'
            }
          ],
          name: 'CHEM 7L',
          metrics: {
            centrality: 0,
            complexity: 3,
            'blocking factor': 0,
            'delay factor': 3
          },
          id: 12,
          credits: 4
        },
        {
          curriculum_requisites: [
            {
              source_id: 5,
              target_id: 13,
              type: 'prereq'
            },
            {
              source_id: 8,
              target_id: 13,
              type: 'prereq'
            }
          ],
          name: 'PHYS 2CL',
          metrics: {
            centrality: 34,
            complexity: 9,
            'blocking factor': 3,
            'delay factor': 6
          },
          id: 13,
          credits: 2
        },
        {
          curriculum_requisites: [
            {
              source_id: 5,
              target_id: 14,
              type: 'prereq'
            },
            {
              source_id: 7,
              target_id: 14,
              type: 'prereq'
            }
          ],
          name: 'PHYS 2C',
          metrics: {
            centrality: 100,
            complexity: 26,
            'blocking factor': 16,
            'delay factor': 10
          },
          id: 14,
          credits: 4
        },
        {
          curriculum_requisites: [
            {
              source_id: 46,
              target_id: 48,
              type: 'prereq'
            }
          ],
          name: 'HUM 3',
          metrics: {
            centrality: 0,
            complexity: 2,
            'blocking factor': 0,
            'delay factor': 2
          },
          id: 48,
          credits: 4
        }
      ],
      id: 4
    },
    {
      name: 'Term 5',
      curriculum_items: [
        {
          curriculum_requisites: [
            {
              source_id: 1,
              target_id: 15,
              type: 'prereq'
            }
          ],
          name: 'MATH 18',
          metrics: {
            centrality: 61,
            complexity: 24,
            'blocking factor': 15,
            'delay factor': 9
          },
          id: 15,
          credits: 4
        },
        {
          curriculum_requisites: [
            {
              source_id: 5,
              target_id: 16,
              type: 'prereq'
            },
            {
              source_id: 4,
              target_id: 16,
              type: 'prereq'
            },
            {
              source_id: 2,
              target_id: 16,
              type: 'prereq'
            },
            {
              source_id: 10,
              target_id: 16,
              type: 'prereq'
            },
            {
              source_id: 8,
              target_id: 16,
              type: 'prereq'
            },
            {
              source_id: 14,
              target_id: 16,
              type: 'prereq'
            }
          ],
          name: 'BENG 140A',
          metrics: {
            centrality: 39,
            complexity: 7,
            'blocking factor': 1,
            'delay factor': 6
          },
          id: 16,
          credits: 4
        },
        {
          curriculum_requisites: [
            {
              source_id: 15,
              target_id: 17,
              type: 'prereq'
            },
            {
              source_id: 11,
              target_id: 17,
              type: 'prereq'
            },
            {
              source_id: 8,
              target_id: 17,
              type: 'prereq'
            }
          ],
          name: 'MAE 40',
          metrics: {
            centrality: 0,
            complexity: 5,
            'blocking factor': 0,
            'delay factor': 5
          },
          id: 17,
          credits: 4
        },
        {
          curriculum_requisites: [
            {
              source_id: 3,
              target_id: 18,
              type: 'prereq'
            },
            {
              source_id: 1,
              target_id: 18,
              type: 'prereq'
            }
          ],
          name: 'MAE 8',
          metrics: {
            centrality: 9,
            complexity: 7,
            'blocking factor': 2,
            'delay factor': 5
          },
          id: 18,
          credits: 4
        },
        {
          curriculum_requisites: [
            {
              source_id: 46,
              target_id: 49,
              type: 'coreq'
            }
          ],
          name: 'HUM 4',
          metrics: {
            centrality: 3,
            complexity: 4,
            'blocking factor': 1,
            'delay factor': 3
          },
          id: 49,
          credits: 4
        }
      ],
      id: 5
    },
    {
      name: 'Term 6',
      curriculum_items: [
        {
          curriculum_requisites: [
            {
              source_id: 16,
              target_id: 19,
              type: 'prereq'
            }
          ],
          name: 'BENG 140B',
          metrics: {
            centrality: 0,
            complexity: 6,
            'blocking factor': 0,
            'delay factor': 6
          },
          id: 19,
          credits: 4
        },
        {
          curriculum_requisites: [
            {
              source_id: 15,
              target_id: 20,
              type: 'prereq'
            },
            {
              source_id: 7,
              target_id: 20,
              type: 'prereq'
            }
          ],
          name: 'MATH 20E',
          metrics: {
            centrality: 58,
            complexity: 20,
            'blocking factor': 10,
            'delay factor': 10
          },
          id: 20,
          credits: 4
        },
        {
          curriculum_requisites: [
            {
              source_id: 5,
              target_id: 21,
              type: 'prereq'
            }
          ],
          name: 'MAE 3',
          metrics: {
            centrality: 4,
            complexity: 5,
            'blocking factor': 1,
            'delay factor': 4
          },
          id: 21,
          credits: 4
        },
        {
          curriculum_requisites: [
            {
              source_id: 6,
              target_id: 22,
              type: 'prereq'
            },
            {
              source_id: 15,
              target_id: 22,
              type: 'prereq'
            },
            {
              source_id: 7,
              target_id: 22,
              type: 'prereq'
            }
          ],
          name: 'BENG 100',
          metrics: {
            centrality: 12,
            complexity: 6,
            'blocking factor': 1,
            'delay factor': 5
          },
          id: 22,
          credits: 4
        },
        {
          curriculum_requisites: [
            {
              source_id: 22,
              target_id: 50,
              type: 'strict-coreq'
            },
            {
              source_id: 49,
              target_id: 50,
              type: 'coreq'
            }
          ],
          name: 'HUM 5',
          metrics: {
            centrality: 0,
            complexity: 5,
            'blocking factor': 0,
            'delay factor': 5
          },
          id: 50,
          credits: 4
        }
      ],
      id: 6
    },
    {
      name: 'Term 7',
      curriculum_items: [
        {
          curriculum_requisites: [
            {
              source_id: 15,
              target_id: 23,
              type: 'prereq'
            },
            {
              source_id: 18,
              target_id: 23,
              type: 'prereq'
            }
          ],
          name: 'MAE 107',
          metrics: {
            centrality: 13,
            complexity: 6,
            'blocking factor': 1,
            'delay factor': 5
          },
          id: 23,
          credits: 4
        },
        {
          curriculum_requisites: [
            {
              source_id: 15,
              target_id: 24,
              type: 'prereq'
            },
            {
              source_id: 20,
              target_id: 24,
              type: 'prereq'
            },
            {
              source_id: 11,
              target_id: 24,
              type: 'prereq'
            },
            {
              source_id: 14,
              target_id: 24,
              type: 'prereq'
            }
          ],
          name: 'BENG 110',
          metrics: {
            centrality: 170,
            complexity: 19,
            'blocking factor': 9,
            'delay factor': 10
          },
          id: 24,
          credits: 4
        },
        {
          curriculum_requisites: [
            {
              source_id: 13,
              target_id: 25,
              type: 'prereq'
            },
            {
              source_id: 14,
              target_id: 25,
              type: 'prereq'
            }
          ],
          name: 'MAE 170',
          metrics: {
            centrality: 56,
            complexity: 8,
            'blocking factor': 2,
            'delay factor': 6
          },
          id: 25,
          credits: 4
        },
        {
          curriculum_requisites: [],
          name: 'LANGUAGE',
          metrics: {
            centrality: 0,
            complexity: 1,
            'blocking factor': 0,
            'delay factor': 1
          },
          id: 51,
          credits: 5
        }
      ],
      id: 7
    },
    {
      name: 'Term 8',
      curriculum_items: [
        {
          curriculum_requisites: [
            {
              source_id: 5,
              target_id: 26,
              type: 'prereq'
            },
            {
              source_id: 4,
              target_id: 26,
              type: 'prereq'
            },
            {
              source_id: 11,
              target_id: 26,
              type: 'prereq'
            },
            {
              source_id: 8,
              target_id: 26,
              type: 'prereq'
            },
            {
              source_id: 14,
              target_id: 26,
              type: 'prereq'
            },
            {
              source_id: 3,
              target_id: 26,
              type: 'prereq'
            },
            {
              source_id: 1,
              target_id: 26,
              type: 'prereq'
            }
          ],
          name: 'BENG 130',
          metrics: {
            centrality: 0,
            complexity: 5,
            'blocking factor': 0,
            'delay factor': 5
          },
          id: 26,
          credits: 4
        },
        {
          curriculum_requisites: [
            {
              source_id: 24,
              target_id: 27,
              type: 'prereq'
            }
          ],
          name: 'BENG 112A',
          metrics: {
            centrality: 138,
            complexity: 17,
            'blocking factor': 7,
            'delay factor': 10
          },
          id: 27,
          credits: 4
        },
        {
          curriculum_requisites: [
            {
              source_id: 25,
              target_id: 28,
              type: 'prereq'
            }
          ],
          name: 'BENG 186B',
          metrics: {
            centrality: 0,
            complexity: 6,
            'blocking factor': 0,
            'delay factor': 6
          },
          id: 28,
          credits: 4
        },
        {
          curriculum_requisites: [],
          name: 'LANGUAGE',
          metrics: {
            centrality: 0,
            complexity: 1,
            'blocking factor': 0,
            'delay factor': 1
          },
          id: 52,
          credits: 5
        }
      ],
      id: 8
    },
    {
      name: 'Term 9',
      curriculum_items: [
        {
          curriculum_requisites: [
            {
              source_id: 25,
              target_id: 29,
              type: 'prereq'
            }
          ],
          name: 'BENG 172',
          metrics: {
            centrality: 0,
            complexity: 6,
            'blocking factor': 0,
            'delay factor': 6
          },
          id: 29,
          credits: 4
        },
        {
          curriculum_requisites: [
            {
              source_id: 27,
              target_id: 30,
              type: 'prereq'
            }
          ],
          name: 'BENG 112B',
          metrics: {
            centrality: 44,
            complexity: 9,
            'blocking factor': 1,
            'delay factor': 8
          },
          id: 30,
          credits: 4
        },
        {
          curriculum_requisites: [
            {
              source_id: 27,
              target_id: 31,
              type: 'prereq'
            }
          ],
          name: 'BENG 103B',
          metrics: {
            centrality: 0,
            complexity: 7,
            'blocking factor': 0,
            'delay factor': 7
          },
          id: 31,
          credits: 4
        },
        {
          curriculum_requisites: [
            {
              source_id: 27,
              target_id: 32,
              type: 'prereq'
            }
          ],
          name: 'BENG 187A',
          metrics: {
            centrality: 56,
            complexity: 13,
            'blocking factor': 3,
            'delay factor': 10
          },
          id: 32,
          credits: 1
        },
        {
          curriculum_requisites: [],
          name: 'LANGUAGE',
          metrics: {
            centrality: 0,
            complexity: 1,
            'blocking factor': 0,
            'delay factor': 1
          },
          id: 53,
          credits: 5
        }
      ],
      id: 9
    },
    {
      name: 'Term 10',
      curriculum_items: [
        {
          curriculum_requisites: [
            {
              source_id: 32,
              target_id: 33,
              type: 'prereq'
            }
          ],
          name: 'BENG 187B',
          metrics: {
            centrality: 56,
            complexity: 12,
            'blocking factor': 2,
            'delay factor': 10
          },
          id: 33,
          credits: 1
        },
        {
          curriculum_requisites: [],
          name: 'BENG DE',
          metrics: {
            centrality: 0,
            complexity: 1,
            'blocking factor': 0,
            'delay factor': 1
          },
          id: 34,
          credits: 3
        },
        {
          curriculum_requisites: [
            {
              source_id: 21,
              target_id: 35,
              type: 'prereq'
            },
            {
              source_id: 24,
              target_id: 35,
              type: 'prereq'
            },
            {
              source_id: 23,
              target_id: 35,
              type: 'prereq'
            }
          ],
          name: 'MAE 150',
          metrics: {
            centrality: 0,
            complexity: 6,
            'blocking factor': 0,
            'delay factor': 6
          },
          id: 35,
          credits: 4
        },
        {
          curriculum_requisites: [],
          name: 'BENG 122A',
          metrics: {
            centrality: 0,
            complexity: 3,
            'blocking factor': 1,
            'delay factor': 2
          },
          id: 36,
          credits: 4
        },
        {
          curriculum_requisites: [],
          name: 'LANGUAGE',
          metrics: {
            centrality: 0,
            complexity: 3,
            'blocking factor': 1,
            'delay factor': 2
          },
          id: 54,
          credits: 5
        }
      ],
      id: 10
    },
    {
      name: 'Term 11',
      curriculum_items: [
        {
          curriculum_requisites: [
            {
              source_id: 33,
              target_id: 37,
              type: 'prereq'
            }
          ],
          name: 'BENG 187C',
          metrics: {
            centrality: 56,
            complexity: 11,
            'blocking factor': 1,
            'delay factor': 10
          },
          id: 37,
          credits: 1
        },
        {
          curriculum_requisites: [],
          name: 'BENG DE',
          metrics: {
            centrality: 0,
            complexity: 1,
            'blocking factor': 0,
            'delay factor': 1
          },
          id: 38,
          credits: 3
        },
        {
          curriculum_requisites: [],
          name: 'TE',
          metrics: {
            centrality: 0,
            complexity: 1,
            'blocking factor': 0,
            'delay factor': 1
          },
          id: 39,
          credits: 4
        },
        {
          curriculum_requisites: [
            {
              source_id: 54,
              target_id: 55,
              type: 'coreq'
            }
          ],
          name: 'SOCIAL SCIENCE GE',
          metrics: {
            centrality: 0,
            complexity: 2,
            'blocking factor': 0,
            'delay factor': 2
          },
          id: 55,
          credits: 4
        }
      ],
      id: 11
    },
    {
      name: 'Term 12',
      curriculum_items: [
        {
          curriculum_requisites: [
            {
              source_id: 37,
              target_id: 40,
              type: 'prereq'
            }
          ],
          name: 'BENG 187D',
          metrics: {
            centrality: 0,
            complexity: 10,
            'blocking factor': 0,
            'delay factor': 10
          },
          id: 40,
          credits: 1
        },
        {
          curriculum_requisites: [
            {
              source_id: 30,
              target_id: 41,
              type: 'prereq'
            }
          ],
          name: 'BENG 186A',
          metrics: {
            centrality: 0,
            complexity: 8,
            'blocking factor': 0,
            'delay factor': 8
          },
          id: 41,
          credits: 4
        },
        {
          curriculum_requisites: [
            {
              source_id: 36,
              target_id: 42,
              type: 'prereq'
            }
          ],
          name: 'BENG 125',
          metrics: {
            centrality: 0,
            complexity: 2,
            'blocking factor': 0,
            'delay factor': 2
          },
          id: 42,
          credits: 4
        },
        {
          curriculum_requisites: [],
          name: 'TE',
          metrics: {
            centrality: 0,
            complexity: 3,
            'blocking factor': 1,
            'delay factor': 2
          },
          id: 43,
          credits: 4
        },
        {
          curriculum_requisites: [
            {
              source_id: 43,
              target_id: 56,
              type: 'strict-coreq'
            }
          ],
          name: 'AHI',
          metrics: {
            centrality: 0,
            complexity: 2,
            'blocking factor': 0,
            'delay factor': 2
          },
          id: 56,
          credits: 4
        }
      ],
      id: 12
    }
  ]
  // metadata: {}
})
graph.wrapper.classList.add('graph')
document.body.append(graph.wrapper)
