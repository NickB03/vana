/// <reference types="jest" />

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R;
      toHaveClass(expected: string): R;
      toHaveStyle(expected: string | Record<string, any>): R;
    }
  }
}

export {};