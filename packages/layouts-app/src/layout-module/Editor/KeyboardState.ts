import type { IDisposable } from '../types'

/**
 * KeyboardState class to track the state of modifier keys (shift, alt, ctrl)
 */
export class KeyboardState implements IDisposable {
    private _shift = false
    private _alt = false
    private _ctrl = false

    private keydownHandler = (event: KeyboardEvent) => {
        this.updateKeyState(event, true)
    }

    private keyupHandler = (event: KeyboardEvent) => {
        this.updateKeyState(event, false)
    }

    private blurHandler = () => {
        this.resetAll()
    }

    constructor() {
        this.setupEventListeners()
    }

    /**
     * Get the current state of the shift key
     */
    public get shift(): boolean {
        return this._shift
    }

    /**
     * Get the current state of the alt key
     */
    public get alt(): boolean {
        return this._alt
    }

    /**
     * Get the current state of the ctrl key (includes meta key on Mac)
     */
    public get ctrl(): boolean {
        return this._ctrl
    }

    /**
     * Check if any modifier keys are pressed
     */
    public get hasModifiers(): boolean {
        return this._shift || this._alt || this._ctrl
    }

    /**
     * Get a snapshot of all key states
     */
    public getState() {
        return {
            shift: this._shift,
            alt: this._alt,
            ctrl: this._ctrl,
            hasModifiers: this.hasModifiers,
        }
    }

    private setupEventListeners() {
        document.addEventListener('keydown', this.keydownHandler)
        document.addEventListener('keyup', this.keyupHandler)
        window.addEventListener('blur', this.blurHandler)
        window.addEventListener('focus', this.blurHandler)
    }

    private updateKeyState(event: KeyboardEvent, pressed: boolean) {
        switch (event.key) {
            case 'Shift':
                this._shift = pressed
                break
            case 'Alt':
                this._alt = pressed
                break
            case 'Control':
            case 'Meta': // Command key on Mac
                this._ctrl = pressed
                break
        }
    }

    private resetAll() {
        this._shift = false
        this._alt = false
        this._ctrl = false
    }

    /**
     * Clean up event listeners
     */
    public dispose() {
        document.removeEventListener('keydown', this.keydownHandler)
        document.removeEventListener('keyup', this.keyupHandler)
        window.removeEventListener('blur', this.blurHandler)
        window.removeEventListener('focus', this.blurHandler)
    }
}
