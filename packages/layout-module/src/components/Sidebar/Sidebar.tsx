import { useState } from 'react'
import { SectionDto } from '../../Editor/dto'
import { Button } from '../common/Button'
import { Sections } from '../Sections/Sections'
import styles from './Sidebar.module.scss'
import { Layouts } from '../Layouts/Layouts'

export const Sidebar: React.FC = () => {
    const [selectedSection, setSelectedSection] = useState<SectionDto | null>(null)

    return <div className={styles.container}>
        <div className={styles.modeSwitch}>
            <span>Задание</span>
            <span style={{ fontWeight: 600 }}>Редактирование</span>
        </div>
        <div className={styles.layouts}>
            <header>Секции</header>
            <div>
                <Sections selectedSection={selectedSection ?? undefined} onSelectSection={setSelectedSection} />
            </div>
        </div>
        <div className={styles.layouts}>
            <header>Планировки</header>
            <div>
                {selectedSection && <Layouts section={selectedSection} />}
            </div>
        </div>
        <div className={styles.layoutButtons}>
            <Button>Загрузить из файла</Button>
            <Button>Редактировать</Button>
        </div>
    </div>
}