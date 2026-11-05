// Messages to the Swift shell. Outside the app (plain browser dev) this is a no-op.
type NativeMessage = { type: 'ready' } | { type: 'log'; message: string }

interface WebKitWindow {
	webkit?: { messageHandlers?: { native?: { postMessage(message: unknown): void } } }
}

export const isNativeApp = !!(window as WebKitWindow).webkit?.messageHandlers?.native

export function postToNative(message: NativeMessage) {
	;(window as WebKitWindow).webkit?.messageHandlers?.native?.postMessage(message)
}
