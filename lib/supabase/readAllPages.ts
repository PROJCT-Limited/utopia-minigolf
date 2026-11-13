// FILE: lib/supabase/readAllPages.ts
// -----------------------------------------------------------------------------
// Supabase caps a read at 1000 rows and says nothing when it does. `waves`
// passed 1000 rows (20 start times a day, plus October's) and the admin
// calendar showed every day after 20 Nov as "Closed" — the rows simply never
// arrived. Any read that can grow past that pages through this.
//
// The query passed in must be ordered down to a unique column (`id`), or
// Postgres is free to shuffle rows between pages and one can be skipped or
// read twice.
// -----------------------------------------------------------------------------

export const PAGE_SIZE = 1000;

export async function readAllPages<T>(
  readPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>
): Promise<{ rows: T[]; error: { message: string } | null }> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await readPage(from, from + PAGE_SIZE - 1);
    if (error) return { rows, error };
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) return { rows, error: null };
  }
}
