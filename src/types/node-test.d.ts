declare module "node:test" {
  type TestBody = () => void | Promise<void>;

  export default function test(name: string, body: TestBody): void;
}

declare module "node:assert/strict" {
  type AssertErrorMatcher = RegExp | ((error: unknown) => boolean);

  interface StrictAssert {
    equal(actual: unknown, expected: unknown, message?: string): void;
    deepEqual(actual: unknown, expected: unknown, message?: string): void;
    throws(body: () => unknown, matcher?: AssertErrorMatcher): void;
  }

  const assert: StrictAssert;
  export default assert;
}
