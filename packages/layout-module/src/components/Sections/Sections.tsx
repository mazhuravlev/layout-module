import React from 'react'
import { List } from '../common/List'
import { useSections } from '../hooks'
import { SectionDto } from '../../dataAccess/types'
import { assertDefined } from '../../func'
import cn from 'classnames'
import styles from './Sections.module.scss'
import { useStoreMap } from 'effector-react'
import { $editorState } from '../events'

interface SectionsComponentProps {
    selectedSection?: SectionDto
    onSelectSection: (section: SectionDto) => void
}

export const Sections: React.FC<SectionsComponentProps> = props => {
    const sectionId = useStoreMap($editorState, x => x.sectionId)
    const { data: sections, error, isLoading } = useSections()

    if (isLoading) {
        return <>Загрузка...</>
    }

    if (error) {
        return <>Ошибка</>
    }

    return (
        <>
            <List>
                {assertDefined(sections).map(section => (
                    <li
                        key={section.id}
                        onClick={() => props.onSelectSection(section)}>
                        <span
                            className={cn({
                                [styles.active]: props.selectedSection?.id === section.id,
                                [styles.currentSection]: sectionId === section.id,
                            })}>
                            {section.name}</span> | {section.minFloors}-{section.maxFloors}
                    </li>
                ))}
            </List>
        </>
    )
}
