import React from 'react'
import { List } from '../common/List'
import { useSections } from '../hooks'
import { SectionDto } from '../../dataAccess/types'

interface SectionsComponentProps {
    onSelectSection: (section: SectionDto) => void
}

export const SectionsComponent: React.FC<SectionsComponentProps> = props => {
    const { data: sections, error, isLoading } = useSections()

    if (isLoading) {
        return <div>Loading sections...</div>
    }

    if (error) {
        return <div>Failed to fetch sections</div>
    }

    return (
        <div>
            <List>
                {sections?.map(section => (
                    <li key={section.id} onClick={() => props.onSelectSection(section)}>
                        {section.name}
                    </li>
                ))}
            </List>
        </div>
    )
}
