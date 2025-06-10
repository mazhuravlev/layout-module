import { createEvent, createStore } from 'effector'
import { ApartmentTemplate, FloorType } from '../types'
import { returnSecondArg } from '../func'
import persist from 'effector-localstorage'
import { EditorObjectDto } from '../Editor/dto'
import { ApartmentProperties } from '../entities/ApartmentProperties'
import { WindowProperties } from '../entities/Window'

const returnPayload = returnSecondArg

export const undo = createEvent<void>()
export const redo = createEvent<void>()
export const addApartment = createEvent<ApartmentTemplate>()
export const deleteSelected = createEvent<void>()
export const zoomToExtents = createEvent<void>()
export const addLLU = createEvent<void>()
export const rotateSelected = createEvent<number>()
export const flipSelected = createEvent<'horizontal' | 'vertical'>()

export const selectionChanged = createEvent<EditorObjectDto[]>()
export const $selectedObjects = createStore<EditorObjectDto[]>([])
$selectedObjects.on(selectionChanged, returnPayload)
export const setApartmentProperties = createEvent<Partial<ApartmentProperties>>()

interface DebugConfig {
    drawDebug: boolean
}
export const $debugConfig = createStore<DebugConfig>({ drawDebug: false })
export const toggleDrawDebug = createEvent<void>()
$debugConfig.on(toggleDrawDebug, (state, _payload) => ({ ...state, drawDebug: !state.drawDebug }))
persist({ store: $debugConfig, key: 'debugConfig.v1' })

export interface SnapConfig {
    enable: boolean
    enableGrid: boolean
    enablePoint: boolean
    enableLine: boolean
    pointThreshold: number
    lineThreshold: number
    angleSnap: number,
    gridStep: number,
}

export const $snapConfig = createStore<SnapConfig>({
    enable: true,
    enableGrid: true,
    enablePoint: true,
    enableLine: true,
    angleSnap: 90,
    pointThreshold: 10,
    lineThreshold: 10,
    gridStep: 300
})
export const toggleSnap = createEvent<void>()
export const toggleSnapGrid = createEvent<void>()
export const toggleSnapPoint = createEvent<void>()
export const toggleSnapLine = createEvent<void>()
export const setGridStep = createEvent<number>()
$snapConfig.on(toggleSnap, (state, _payload) => ({ ...state, enable: !state.enable }))
$snapConfig.on(toggleSnapGrid, (state, _payload) => ({ ...state, enableGrid: !state.enableGrid }))
$snapConfig.on(toggleSnapPoint, (state, _payload) => ({ ...state, enablePoint: !state.enablePoint }))
$snapConfig.on(toggleSnapLine, (state, _payload) => ({ ...state, enableLine: !state.enableLine }))
$snapConfig.on(setGridStep, (state, payload) => ({ ...state, gridStep: payload < 0 ? 1 : payload }))
persist({ store: $snapConfig, key: 'snapConfig.v3' })

export const $sectionSettings = createStore({ offset: 500 })
export const setSectionOffset = createEvent<number>()
$sectionSettings.on(setSectionOffset, (state, payload) => ({ ...state, offset: payload }))

export const $sizeConfig = createStore({ showWallSize: true })
export const toggleShowWallSize = createEvent<void>()
$sizeConfig.on(toggleShowWallSize, (state, _payload) => ({ ...state, showWallSize: !state.showWallSize }))
persist({ store: $sizeConfig, key: 'sizeConfig.v1' })

export const populateWindows = createEvent<{
    windowSize: number // размер окна в мм
    spacing: number // интервал между окнами в мм 
}>()
export const setWindowProperties = createEvent<Partial<WindowProperties>>()

export const createNewLayout = createEvent<{ sectionId: string, name: string }>()

export const $editorState = createStore<{
    ready: boolean
    floorType: FloorType
    layoutId: string | null
    sectionId: string | null
}>({
    ready: false,
    floorType: 'typical',
    layoutId: null,
    sectionId: null,
})
export const setEditorReady = createEvent<boolean>()
$editorState.on(setEditorReady, (s, ready) => ({ ...s, ready }))
export const selectFloorType = createEvent<FloorType>()
export const setFloorType = createEvent<FloorType>()
$editorState.on(setFloorType, (s, floorType) => ({ ...s, floorType }))
export const loadLayout = createEvent<string>()
export const setCurrentLayout = createEvent<{ sectionId: string, layoutId: string }>()
$editorState.on(setCurrentLayout, (s, { sectionId, layoutId }) => ({ ...s, sectionId, layoutId }))