import { SectionDto } from '../../dataAccess/types'
import { Button } from '../common/Button'
import { createNewLayout } from '../events'

interface LayoutsComponentProps {
    section: SectionDto
}

export const Layouts: React.FC<LayoutsComponentProps> = props => {
    return <div>
        <Button onClick={() => createNewLayout({ sectionId: props.section.id })}>Новый</Button>
    </div>
}