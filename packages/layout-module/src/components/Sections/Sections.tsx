import React from 'react'
import { List } from '../common/List'
import { useSections } from '../hooks'
import { SectionDto } from '../../dataAccess/types'
import { assertDefined } from '../../func'
import cn from 'classnames'
import styles from './Sections.module.scss'

interface SectionsComponentProps {
    selectedSection?: SectionDto
    onSelectSection: (section: SectionDto) => void
}

export const Sections: React.FC<SectionsComponentProps> = props => {
    const { data: sections, error, isLoading } = useSections()

    if (isLoading) {
        return <div>Загрузка...</div>
    }

    if (error) {
        return <div>Ошибка</div>
    }

    return (
        <div>
            <List>
                {assertDefined(sections).map(section => (
                    <li key={section.id} onClick={() => props.onSelectSection(section)}>
                        <span className={cn({ [styles.active]: props.selectedSection?.id === section.id })}>
                            {section.name}</span> | {section.minFloors}-{section.maxFloors}
                    </li>
                ))}
            </List>
        </div>
    )
}
