export class NotImplementedError extends Error {
  constructor(specId, detail = "") {
    super(
      `NOT_IMPLEMENTED: no structured generator registered for spec id "${specId}"${detail ? ` (${detail})` : ""}. ` +
        `See datagen/README.md#generator-coverage for what is implemented today.`
    );
    this.name = "NotImplementedError";
    this.specId = specId;
  }
}
