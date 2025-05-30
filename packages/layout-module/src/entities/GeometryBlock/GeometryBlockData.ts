import { APoint } from '../../types'

/**
 * Во внутренних единицах {@link Units}
 */

export interface GeometryBlockData {
    /**
     * Общий контур
     */
    outline: APoint[];

    /**
     * Визуальная геометрия
     */
    geometry: APoint[][];
}
