import { useStoreMap, useUnit } from 'effector-react'
import { $editorState, $selectedObjects, addApartment, addLLU } from '../../events'
import { BlockOutline } from './BlockOutline'
import { useApartmentTemplates, useLLU } from '../hooks/dataAccess'
import { assertDefined, not, notEmpty } from '../../func'
import { isApartmentDto, isWindowDto } from '../../Editor/dto'
import { ApartmentProperties } from './ApartmentProperties'
import { WindowProperties } from './WindowProperties'
import { SectionProperties } from './SectionProperties'
import styles from './PropertySidebar.module.scss'
import { PopulateWindows } from './PopulateWindows'
import { PropertyBlock } from './PropertyBlock/PropertyBlock'


export const PropertySidebar: React.FC = () => {
    const editorReady = useStoreMap($editorState, x => x.ready)
    const selectedObjects = useUnit($selectedObjects)
    const apartments = selectedObjects.filter(isApartmentDto)
    const windows = selectedObjects.filter(isWindowDto)
    if (not(editorReady)) {
        return <div className={styles.container}>Откройте планировку</div>
    }
    return <div className={styles.container}>
        <PropertyBlock header='Типы помещений'>
            <ApartmentTemplatesList />
        </PropertyBlock>
        <PropertyBlock header='Типы ЛЛУ'>
            <LLUList />
        </PropertyBlock>
        <PropertyBlock header='Свойства проекта'>
            <PopulateWindows />
        </PropertyBlock>
        <PropertyBlock header='Свойства секции'>
            <SectionProperties />
        </PropertyBlock>
        {notEmpty(apartments) && <PropertyBlock header={`Свойства планировки: ${apartments.length}`}>
            <ApartmentProperties apartments={apartments} />
        </PropertyBlock>}
        {notEmpty(windows) && <PropertyBlock header={`Свойства окна: ${windows.length}`}>
            <WindowProperties windows={windows} />
        </PropertyBlock>}
    </div>
}

const ApartmentTemplatesList: React.FC = () => {
    const { data, isLoading, error } = useApartmentTemplates()
    if (isLoading) return 'Загрузка...'
    if (error) return 'Ошибка'

    return <table className={styles.templatesTable} ><tbody>
        {assertDefined(data).map((template) => (
            <tr
                key={template.name}
                onClick={() => addApartment(template)}>
                <td width='30%'>
                    <BlockOutline outline={template.points} />
                </td>
                <td>
                    {template.name}
                </td>
            </tr>
        ))}
    </tbody>
    </table>
}

const LLUList: React.FC = () => {
    const currentLayout = useStoreMap($editorState, x => x.currentLayout)
    const { data, isLoading, error } = useLLU(currentLayout ?? { minFloors: 0, maxFloors: 0 })
    if (isLoading) return 'Загрузка...'
    if (error) return 'Ошибка'
    if (currentLayout === null) return 'Выберите планировку'

    return <table
        style={{ fontSize: 10 }}
        className={styles.templatesTable} >
        <tbody>
            {assertDefined(data).map((template) => (
                <tr
                    key={template.name}
                    onClick={() => addLLU(template.id)}>
                    <td>
                        <BlockOutline outline={template.outline} />
                    </td>
                    <td>
                        {template.name}
                    </td>
                </tr>
            ))}
        </tbody>
    </table>
}