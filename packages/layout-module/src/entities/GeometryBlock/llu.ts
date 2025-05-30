import { assert } from '../../func'
import { APoint } from '../../types'
import { GeometryBlockData } from './GeometryBlockData'
import data from './llu.json'

const mapPoint = (p: number[]): APoint => {
    assert(p.length === 2)
    return { x: p[0], y: p[1] }
}

const lluData: GeometryBlockData = {
    outline: data.outline.map(mapPoint),
    geometry: data.lines.map(x => x.map(mapPoint)),
}

export default lluData