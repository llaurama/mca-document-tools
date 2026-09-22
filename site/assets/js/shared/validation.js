// Keep field identifiers on errors so each controller can resolve its own inputs.
export function configError(field, message) {
  return Object.assign(new Error(message), { field });
}
