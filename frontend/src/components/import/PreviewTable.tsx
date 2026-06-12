interface Props {
  rows: Record<string, string>[]
}

export default function PreviewTable({ rows }: Props) {
  if (rows.length === 0) return null

  const columns = Object.keys(rows[0])

  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
        Veri Önizlemesi — İlk {rows.length} Satır
      </p>
      <div className="overflow-x-auto rounded-lg border border-gray-200 max-h-56">
        <table className="min-w-full text-xs">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              {columns.map((col) => (
                <th
                  key={col}
                  className="px-3 py-2 text-left font-semibold text-gray-500 whitespace-nowrap border-b border-gray-200"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row, i) => (
              <tr key={i} className="hover:bg-gray-50">
                {columns.map((col) => (
                  <td
                    key={col}
                    className="px-3 py-1.5 text-gray-700 whitespace-nowrap max-w-[160px] truncate"
                    title={row[col]}
                  >
                    {row[col] || <span className="text-gray-300">—</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
