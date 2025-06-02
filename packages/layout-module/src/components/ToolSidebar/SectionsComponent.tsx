import React from 'react'
import { List } from '../common/List'
import { setSection } from '../events'
import { useSections } from '../hooks'

export const SectionsComponent: React.FC = () => {
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
                    <li key={section.id} onClick={() => setSection(section.id)}>
                        {section.name}
                    </li>
                ))}
            </List>
        </div>
    )
}
