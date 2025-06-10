import type { CSSProperties } from 'react'
import styles from './Button.module.scss'
import cn from 'classnames'

interface ButtonProps {
    children: React.ReactNode
    title?: string
    active?: boolean
    onClick?: () => void
    style?: CSSProperties
}

export const Button: React.FC<ButtonProps> = (props) => {
    return (
        <button
            style={props.style}
            className={cn(styles.button, { [styles.active]: props.active })}
            type='button'
            title={props.title}
            onClick={props.onClick}
        >
            {props.children}
        </button>)
}