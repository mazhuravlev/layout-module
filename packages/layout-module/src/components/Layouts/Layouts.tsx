import { SectionDto } from '../../dataAccess/types'
import { Button } from '../common/Button'
import { setSection } from '../events'

interface LayoutsComponentProps {
    section: SectionDto
}

export const Layouts: React.FC<LayoutsComponentProps> = props => {
    return <div>
        <Button onClick={() => setSection(props.section.id)}>Новый</Button>
    </div>
}