export type Point = {
  x: number
  y: number
}

export type Vertex = Point & {
  id: string
}

export interface Wall {
  id: string
  start: Vertex
  end: Vertex
}

export interface Outline {
  id: string
  walls: Wall[]
  vertices: Vertex[]
}

export interface ApartmentShape {
  name: string
  points: Point[]
}
