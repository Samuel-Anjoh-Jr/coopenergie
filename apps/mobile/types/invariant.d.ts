declare module "invariant" {
  function invariant(condition: unknown, message: string, ...args: unknown[]): asserts condition;
  export = invariant;
}
