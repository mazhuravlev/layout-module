import { useState, useEffect } from 'react'

export function usePersistentState<T>(
    key: string,
    defaultValue: T,
    options?: {
        storage?: 'local' | 'session';
        serializer?: (value: T) => string;
        deserializer?: (value: string) => T;
    },
): [T, (value: T | ((prev: T) => T)) => void] {
    // Выбираем хранилище
    const storage = options?.storage === 'session' ? sessionStorage : localStorage
    const serialize = options?.serializer || JSON.stringify
    const deserialize = options?.deserializer || JSON.parse

    // Инициализация состояния
    const [state, setState] = useState<T>(() => {
        try {
            const savedValue = storage.getItem(key)
            return savedValue !== null ? deserialize(savedValue) : defaultValue
        } catch (error) {
            // eslint-disable-next-line no-console
            console.warn(`Error reading storage key "${key}":`, error)
            return defaultValue
        }
    })

    // Обновляем хранилище при изменении состояния
    useEffect(() => {
        try {
            if (state === undefined) {
                storage.removeItem(key)
            } else {
                storage.setItem(key, serialize(state))
            }
        } catch (error) {
            // eslint-disable-next-line no-console
            console.warn(`Error writing to storage key "${key}":`, error)
        }
    }, [key, state, storage, serialize])

    return [state, setState]
}