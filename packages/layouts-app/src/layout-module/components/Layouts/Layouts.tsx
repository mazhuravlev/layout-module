import { useQueryClient } from '@tanstack/react-query'
import { generateLayoutName, notEmpty, watchOnce } from '../../func'
import { LogicError } from '../../types'
import { Button } from '../common/Button'
import { List } from '../common/List'
import { $editorState, createNewLayout, loadLayout, setEditorReady } from '../../events'
import { useSectionLayouts } from '../hooks'
import { useStoreMap } from 'effector-react'

interface LayoutsComponentProps {
    sectionId: string
}

export const Layouts: React.FC<LayoutsComponentProps> = props => {
    const layoutId = useStoreMap($editorState, x => x.currentLayout?.layoutId)
    const queryClient = useQueryClient()
    const { data: layouts, isLoading, error } = useSectionLayouts(props.sectionId)
    if (isLoading) return 'Загрузка...'
    if (error) return 'Ошибка'
    if (layouts === undefined) throw new LogicError()

    const handleCreateNewLayout = async () => {
        const name = prompt('Введите название', generateLayoutName())
        if (name === null) return
        watchOnce(
            setEditorReady.filter({ fn: x => x }),
            () => {
                queryClient.invalidateQueries({
                    queryKey: ['SectionLayouts', props.sectionId]
                })
            }
        )
        createNewLayout({ sectionId: props.sectionId, name })
    }

    return <>
        {notEmpty(layouts) && <List>
            {layouts.map(x => <li
                style={layoutId === x.id ? { fontWeight: 600 } : undefined}
                onClick={() => loadLayout({ sectionId: x.sectionId, layoutId: x.id })}
                key={x.id}>{x.name}</li>)}
        </List>}
        <Button onClick={() => handleCreateNewLayout()}>Новый</Button>
    </>
}