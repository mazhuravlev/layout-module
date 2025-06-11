import type { APoint } from '../../types'

interface BlockOutlineProps {
    outline: APoint[]
}

export const BlockOutline: React.FC<BlockOutlineProps> = ({ outline }) => {
    const pointsString = outline.map(p => `${p.x},${p.y}`).join(' ')
    const viewBox = [
        0,
        0,
        Math.max(...outline.map(p => p.x)),
        Math.max(...outline.map(p => p.y)),
    ].join(' ')

    return (
        <svg height='40px'
            viewBox={viewBox}>
            <polygon
                points={pointsString}
                fill='lightblue'
                stroke='black'
                strokeWidth='1'
                vectorEffect='non-scaling-stroke'
            />
        </svg>
    )
}
