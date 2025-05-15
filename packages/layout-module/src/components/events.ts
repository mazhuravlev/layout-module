import { createEvent, createStore } from 'effector'
import { ApartmentTemplate } from '../Editor/types'
import { returnSecondArg } from '../func'

const returnPayload = returnSecondArg

export const addApartmentEvent = createEvent<ApartmentTemplate>()
export const deleteSelectedEvent = createEvent<void>()
export const zoomToExtentsEvent = createEvent<void>()

export const selectionEvent = createEvent<string[]>()
export const selectionStore = createStore<string[]>([])
selectionStore.on(selectionEvent, returnPayload)

interface DebugConfig {
    drawDebug: boolean
}
export const debugStore = createStore<DebugConfig>({ drawDebug: true })
export const toggleDrawDebugEvent = createEvent<void>()
debugStore.on(toggleDrawDebugEvent, (state, _payload) => ({ ...state, drawDebug: !state.drawDebug }))