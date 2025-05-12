// import { Outline, Point, Vertex, Wall } from './types'
// import { v4 as uuid } from 'uuid'
// import { pairwise } from '../func'

// export const createOutline = (points: Point[]): Outline => {
//   const vertices: Vertex[] = points.map((x) => ({ id: uuid(), ...x }))
//   const walls: Wall[] = pairwise(vertices).map(([start, end]) => ({
//     id: uuid(),
//     start,
//     end,
//   }))
//   const outline: Outline = {
//     id: uuid(),
//     walls,
//     vertices,
//   }
//   return outline
// }

