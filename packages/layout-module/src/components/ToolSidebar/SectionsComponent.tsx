import { List } from '../common/List'
import { setSection } from '../events'

const sections = [
    {
        name: 'section1',
        outline: [
            { x: 0, y: 0 },
            { x: 0, y: 18000 },
            { x: 36000, y: 18000 },
            { x: 36000, y: 0 },
        ]
    },
    {
        name: 'section2',
        outline: [
            { x: 0, y: 0 },
            { x: 0, y: 18000 },
            { x: 18000, y: 18000 },
            { x: 18000, y: 0 },
        ]
    }
]

export const SectionsComponent: React.FC = () => {
    return <div>
        <List>
            {sections.map(x => <li key={x.name}
                onClick={() => setSection(x.outline)}
            >
                {x.name}</li>)}
        </List>
    </div>
}