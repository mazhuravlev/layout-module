import { createEvent, createStore } from 'effector'
import { ApartmentTemplate } from '../types'
import { returnSecondArg } from '../func'

const returnPayload = returnSecondArg

export const addApartmentEvent = createEvent<ApartmentTemplate>()
export const deleteSelectedEvent = createEvent<void>()

export const selectionEvent = createEvent<string[]>()
export const selectionStore = createStore<string[]>([])
selectionStore.on(selectionEvent, returnPayload)
