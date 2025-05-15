import { createEvent, createStore, Store } from 'effector'
import { ApartmentTemplate } from '../Editor/types'
import { returnSecondArg } from '../func'
import persist from 'effector-localstorage'
import { Observable } from 'rxjs'

const returnPayload = returnSecondArg

export const addApartmentEvent = createEvent<ApartmentTemplate>()
export const deleteSelectedEvent = createEvent<void>()
export const zoomToExtentsEvent = createEvent<void>()

export const selectionEvent = createEvent<string[]>()
export const $selection = createStore<string[]>([])
$selection.on(selectionEvent, returnPayload)

interface DebugConfig {
    drawDebug: boolean
}
export const $debugConfig = createStore<DebugConfig>({ drawDebug: true })
export const toggleDrawDebug = createEvent<void>()
$debugConfig.on(toggleDrawDebug, (state, _payload) => ({ ...state, drawDebug: !state.drawDebug }))
persist({ store: $debugConfig, key: 'debugConfig.v1' })

interface SnapConfig {
    snap: boolean
}
export const $snapConfig = createStore<SnapConfig>({ snap: true })
export const toggleSnap = createEvent<void>()
$snapConfig.on(toggleSnap, (state, _payload) => ({ ...state, snap: !state.snap }))
persist({ store: $snapConfig, key: 'snapConfig.v1' })


export function fromEffectorStore<T, U>(store: Store<T>, mapFn: (s: T) => U): Observable<U> {
    const mappedStore = store.map(mapFn)
    return new Observable((subscriber) => {
        subscriber.next(mappedStore.getState())
        const unsubscribe = mappedStore.watch((state) => {
            subscriber.next(state)
        })
        return () => unsubscribe()
    })
}