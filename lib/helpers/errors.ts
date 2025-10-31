export function toAppError(err: any): Error {
  if (!err) return new Error("Unknown error")
  if (err instanceof Error) return err
  if (typeof err === "string") return new Error(err)
  return new Error(err.message ?? "Unknown error")
}

export function withErrorHandling<T>(label: string, fn: () => Promise<T>): Promise<T> {
  return fn().catch((err) => {
    throw toAppError({ message: `${label}: ${err?.message ?? err}` })
  })
}