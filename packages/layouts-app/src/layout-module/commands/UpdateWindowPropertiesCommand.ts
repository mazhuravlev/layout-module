import type { WindowObj, WindowProperties } from '../entities/Window'
import { assertDefined } from '../func'
import type { EditorCommand } from './EditorCommand'

export class UpdateWindowPropertiesCommand implements EditorCommand {
    private _oldProperties: Map<WindowObj, WindowProperties>

    public get description() { return 'Изменить свойство окна' }

    constructor(
        private _windows: WindowObj[],
        private _newProperties: Partial<WindowProperties>,
    ) {
        this._oldProperties = new Map(_windows.map(x => [x, { ...x.properties }]))
    }

    execute(): void {
        this._windows.forEach(window => window.setProperties({ ...window.properties, ...this._newProperties }))
    }

    undo(): void {
        this._windows.forEach(window => window.setProperties(assertDefined(this._oldProperties.get(window))))
    }

    dispose(): void {
    }
}