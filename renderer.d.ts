declare interface ImportedClass<T = any> {
  new (...arg: any[]): T & {
    destroy (): void
  }
}

export function importClass<T = any> (className: string): ImportedClass<T>
