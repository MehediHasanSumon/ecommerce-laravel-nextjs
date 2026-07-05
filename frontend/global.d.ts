declare module '*.css' {}

declare module 'vitest/config' {
  export function defineConfig(config: Record<string, unknown>): Record<string, unknown>;
}
