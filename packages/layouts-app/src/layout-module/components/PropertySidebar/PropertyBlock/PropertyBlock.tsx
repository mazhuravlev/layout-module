import type { ReactNode } from 'react'
import styles from './PropertyBlock.module.scss'
import { usePersistentState } from '../../hooks/usePersistentState'

export const PropertyBlock: React.FC<{
    header: string;
    children: ReactNode;
}> = (props) => {
    const [collapsed, setCollapsed] = usePersistentState<boolean>(
        `PropertyBlock_${props.header}`,
        false,
    )

    const toggleCollapse = () => {
        setCollapsed(!collapsed)
    }

    return (
        <div className={styles.container}>
            <div className={styles.header} onClick={toggleCollapse}>
                <span>{props.header}</span>
                <button
                    type='button'
                    className={styles.toggleButton}
                    aria-label={collapsed ? 'Развернуть' : 'Свернуть'}
                >
                    {collapsed ? '▶' : '▼'}
                </button>
            </div>
            {!collapsed && (
                <div className={styles.content}>
                    {props.children}
                </div>
            )}
        </div>
    )
}