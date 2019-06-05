export function importClass<T extends NewableFunction = any> (className: string): (T & { new (...arg: any[]): { destroy (): void } }) | null
