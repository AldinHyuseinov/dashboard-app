/**
 * Keeping tapped rows in place: when a list is read again after someone
 * changed a row from it (marking a Task Done moves it to the top of its
 * Category), the rows they changed stay where they tapped them.
 *
 * The rows in `fresh` come in its order, except that each `held` row that
 * was in `shown` stays at the position it was shown at. A held row takes its
 * fresh data, or keeps the data last shown when it's no longer in `fresh`
 * (it moved to another page).
 */
export function keepInPlace<Row extends { id: string }>(
  shown: readonly Row[],
  fresh: readonly Row[],
  held: ReadonlySet<string>,
): Row[] {
  const freshById = new Map(fresh.map((row) => [row.id, row]));
  const placed = shown
    .map((row, index) => ({ index, row: freshById.get(row.id) ?? row }))
    .filter(({ row }) => held.has(row.id));
  const placedIds = new Set(placed.map(({ row }) => row.id));

  const rows = fresh.filter((row) => !placedIds.has(row.id));
  for (const { index, row } of placed) rows.splice(Math.min(index, rows.length), 0, row);
  return rows;
}
