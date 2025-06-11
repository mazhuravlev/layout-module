import type { ApartmentTemplate } from '../../types'

interface ApartmentTemplateProps {
    template: ApartmentTemplate
}

export const ApartmentTemplateComponent: React.FC<ApartmentTemplateProps> = ({ template }) => {
    const pointsString = template.points.map(p => `${p.x},${p.y}`).join(' ')
    const viewBox = [
        0,
        0,
        Math.max(...template.points.map(p => p.x)),
        Math.max(...template.points.map(p => p.y)),
    ].join(' ')

    return (
        <div>
            <div>{template.name}</div>
            <svg width='100%' height='80px'
                viewBox={viewBox}>
                <polygon
                    points={pointsString}
                    fill='lightblue'
                    stroke='black'
                    strokeWidth='1'
                    vectorEffect='non-scaling-stroke'
                />
            </svg>
        </div>
    )
}
