declare module "bcryptjs" {
  export function hash(value: string, saltRounds: number): Promise<string>;
  export function compare(value: string, hashValue: string): Promise<boolean>;
  export function hashSync(value: string, saltRounds: number): string;

  const bcrypt: {
    hash: typeof hash;
    compare: typeof compare;
    hashSync: typeof hashSync;
  };

  export default bcrypt;
}
