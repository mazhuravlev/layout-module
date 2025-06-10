import { useStoreMap, useUnit } from 'effector-react'
import { $editorState, $selectedObjects, addApartment } from '../events'
import { List } from '../common/List'
import { ApartmentTemplateComponent } from './ApartmentTemplateComponent'
import { useApartmentTemplates } from '../hooks'
import { assertDefined, not, notEmpty } from '../../func'
import { isApartmentDto, isWindowDto } from '../../Editor/dto'
import { ApartmentProperties } from './ApartmentProperties'
import { WindowProperties } from './WindowProperties'
import { SectionProperties } from './SectionProperties'
import styles from './PropertySidebar.module.scss'
import { PopulateWindows } from './PopulateWindows'


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

const PropertyBlock: React.FC<{
    header: string
    children: React.ReactNode
}> = (props) => {
    return <div style={{ borderBottom: '1px solid lightgrey' }}>
        <header style={{ fontWeight: 500, marginBottom: 2 }}>{props.header}</header>
        <div style={{ paddingLeft: 8, paddingBottom: 4 }}>
            {props.children}
        </div>
    </div>
}

const ApartmentTemplatesList: React.FC = () => {
    const { data, isLoading, error } = useApartmentTemplates()
    if (isLoading) return 'Загрузка...'
    if (error) return 'Ошибка'

    return <List>
        {assertDefined(data).map((template) => (
            <li
                key={template.name}
                onClick={() => addApartment(template)}>
                <ApartmentTemplateComponent template={template} />
                {template.name}
            </li>
        ))}
    </List>
}