import { SectionDto } from '../../dataAccess/types'
import { Button } from '../common/Button'
import { setSection } from '../events'

interface LayoutsComponentProps {
    section: SectionDto
}

export const LayoutsComponent: React.FC<LayoutsComponentProps> = props => {
    return <div>
        <p>{props.section.name}</p>
        <Button onClick={() => setSection(props.section.id)}>Новый</Button>
    </div>
}