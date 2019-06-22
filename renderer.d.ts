export function importClass<T extends NewableFunction = any> (className: string): (T & { new (...arg: any[]): { destroy (): void } })
export function listClass (): string[]
export function removeClass (className: string): boolean
