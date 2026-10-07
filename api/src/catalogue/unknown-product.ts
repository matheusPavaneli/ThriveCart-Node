export class UnknownProduct extends Error {
  override readonly name = 'UnknownProduct';
  readonly code: string;

  constructor(code: string) {
    super(`Unknown product code "${code}".`);
    this.code = code;
  }
}
