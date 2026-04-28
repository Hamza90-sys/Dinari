export function unwrap<T>(data: T | null, error: { message: string } | null) {
  if (error) throw new Error(error.message);
  if (data === null) throw new Error("No data returned from Supabase");
  return data;
}

export function ensureArray<T>(data: T[] | null, error: { message: string } | null): T[] {
  if (error) throw new Error(error.message);
  return data ?? [];
}