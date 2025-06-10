import { useQueryClient } from 'react-query'
import { SectionDto } from '../../dataAccess/types'
import { generateName, notEmpty, timeout } from '../../func'
import { LogicError } from '../../types'
import { Button } from '../common/Button'
import { List } from '../common/List'
import { $editorState, createNewLayout, loadLayout } from '../events'
import { useSectionLayouts } from '../hooks'
import { useStoreMap } from 'effector-react'

interface LayoutsComponentProps {
    section: SectionDto
}

export const Layouts: React.FC<LayoutsComponentProps> = props => {
    const layoutId = useStoreMap($editorState, x => x.layoutId)
    const queryClient = useQueryClient()
    const { data: layouts, isLoading, error } = useSectionLayouts(props.section.id)
    if (isLoading) return 'Загрузка...'
    if (error) return 'Ошибка'
    if (layouts === undefined) throw new LogicError()

    const handleCreateNewLayout = async () => {
        const name = prompt('Введите название', generateName())
        if (name !== null) {
            createNewLayout({ sectionId: props.section.id, name })
            await timeout(1000) // TODO: сделать нормально
            await queryClient.invalidateQueries({
                queryKey: ['SectionLayouts', props.section.id]
            })
        }
    }

    return <>
        {notEmpty(layouts) && <List>
            {layouts.map(x => <li
                style={layoutId === x.id ? { fontWeight: 600 } : undefined}
                onClick={() => loadLayout(x.id)}
                key={x.id}>{x.name}</li>)}
        </List>}
        <Button onClick={() => handleCreateNewLayout()}>Новый</Button>
    </>
}