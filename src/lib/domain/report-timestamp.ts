// Report timestamps use UTC time only, ending at whole seconds.
export function reportTimestamp(value: Date | null | undefined): string {
  return value ? value.toISOString().split("T")[1].slice(0, 8) : "";
}
