// ===========================================================================
// DataTable : tableau générique paginé avec recherche intégrée (debounce),
// tri par colonne (sortable) et sélection du nombre de lignes par page.
// ===========================================================================
import { useEffect, useMemo, useState } from 'react'
import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  SearchX,
} from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import SearchBar from '@/components/SearchBar'
import EmptyState from '@/components/EmptyState'
import { cn } from '@/lib/utils'

const normalize = (value) => String(value ?? '').toLowerCase()

export default function DataTable({
  columns = [],
  rows = [],
  searchKeys = [],
  searchPlaceholder = 'Rechercher…',
  pageSizes = [10, 25, 50],
  defaultPageSize = 10,
  toolbar,
  onRowClick,
  emptyTitle = 'Aucun résultat',
  emptyDescription,
  keyField = 'id',
  className,
}) {
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(defaultPageSize)
  const [sort, setSort] = useState({ key: null, dir: 'asc' })

  // -------------------------------------------------------------------------
  // Recherche + tri.
  // -------------------------------------------------------------------------
  const filtered = useMemo(() => {
    let list = rows

    if (query.trim() && searchKeys.length) {
      const q = normalize(query)
      list = rows.filter((row) =>
        searchKeys.some((key) => normalize(row[key]).includes(q)),
      )
    }

    if (sort.key) {
      list = [...list].sort((a, b) => {
        const av = a[sort.key]
        const bv = b[sort.key]
        const cmp = av > bv ? 1 : av < bv ? -1 : 0
        return sort.dir === 'asc' ? cmp : -cmp
      })
    }

    return list
  }, [rows, query, searchKeys, sort])

  // Retour à la première page quand la recherche change.
  useEffect(() => {
    setPage(1)
  }, [query, pageSize])

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, pageCount)
  const start = (currentPage - 1) * pageSize
  const paginated = filtered.slice(start, start + pageSize)

  const toggleSort = (key) => {
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: 'asc' },
    )
  }

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {/* Barre d'outils : actions + recherche */}
      {(toolbar || searchKeys.length > 0) && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {toolbar ? <div className="flex flex-1 flex-wrap items-center gap-2">{toolbar}</div> : <div />}
          {searchKeys.length > 0 && (
            <SearchBar
              value={query}
              onChange={setQuery}
              placeholder={searchPlaceholder}
              className="w-full sm:max-w-xs"
            />
          )}
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              {columns.map((col) => (
                <TableHead
                  key={col.key}
                  className={cn('px-3', col.className)}
                  onClick={col.sortable ? () => toggleSort(col.key) : undefined}
                >
                  {col.sortable ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="-ml-3 h-8 px-2 font-medium"
                      onClick={() => toggleSort(col.key)}
                    >
                      {col.header}
                      <span className="ml-1 opacity-60">
                        {sort.key === col.key ? (sort.dir === 'asc' ? '↑' : '↓') : '↕'}
                      </span>
                    </Button>
                  ) : (
                    col.header
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-px p-0">
                  <EmptyState
                    icon={SearchX}
                    title={emptyTitle}
                    description={emptyDescription}
                  />
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((row, index) => {
                const rowKey = row[keyField] ?? index
                return (
                  <TableRow
                    key={rowKey}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={cn(onRowClick && 'cursor-pointer')}
                  >
                    {columns.map((col) => (
                      <TableCell key={col.key} className={cn('px-3', col.className)}>
                        {col.render
                          ? col.render(row)
                          : col.key
                            ? row[col.key]
                            : null}
                      </TableCell>
                    ))}
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {filtered.length > 0 && (
        <div className="flex flex-col items-center justify-between gap-3 text-sm text-muted-foreground sm:flex-row">
          <p>
            {filtered.length} résultat(s) — page {currentPage}/{pageCount}
          </p>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span>Par page :</span>
              <Select
                value={String(pageSize)}
                onValueChange={(value) => setPageSize(Number(value))}
              >
                <SelectTrigger className="h-8 w-[70px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {pageSizes.map((size) => (
                    <SelectItem key={size} value={String(size)}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                disabled={currentPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                aria-label="Page précédente"
              >
                <ChevronLeftIcon className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                disabled={currentPage >= pageCount}
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                aria-label="Page suivante"
              >
                <ChevronRightIcon className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}