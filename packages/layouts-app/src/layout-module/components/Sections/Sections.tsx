import React, { useEffect, useState } from 'react'
import { List } from '../common/List'
import { useSections } from '../hooks'
import { assertDefined } from '../../func'
import cn from 'classnames'
import styles from './Sections.module.scss'
import { useStoreMap } from 'effector-react'
import { $editorState, setCurrentLayout } from '../../events'

interface SectionsComponentProps {
    onSelectSection: (sectionId: string) => void
}

export const Sections: React.FC<SectionsComponentProps> = props => {
    const [selectedSectionId, setSelectedSectionId] = useState<string | null>()
    const sectionId = useStoreMap($editorState, x => x.currentLayout?.sectionId)
    const { data: sections, error, isLoading } = useSections()

    const handleSelectSection = (sectionId: string) => {
        setSelectedSectionId(sectionId)
        props.onSelectSection(sectionId)
    }

    useEffect(() => {
        const s = setCurrentLayout
            .watch(({ sectionId }) => handleSelectSection(sectionId))
        return () => s.unsubscribe()
    })

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
                        onClick={() => handleSelectSection(section.id)}>
                        <span
                            className={cn({
                                [styles.active]: selectedSectionId === section.id,
                                [styles.currentSection]: sectionId === section.id,
                            })}>
                            {section.name}</span> | {section.minFloors}-{section.maxFloors}
                    </li>
                ))}
            </List>
        </>
    )
}
