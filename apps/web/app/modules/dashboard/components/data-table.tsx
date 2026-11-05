import * as React from "react"
import {
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
} from "@tabler/icons-react"
import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  VisibilityState,
} from "@tanstack/react-table"

import { Button } from "~/shared/components/ui/button"
import { Checkbox } from "~/shared/components/ui/checkbox"
import { Input } from "~/shared/components/ui/input"
import { Label } from "~/shared/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/shared/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/shared/components/ui/table"
import { Search } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "~/shared/components/ui/avatar"
import { TooltipProvider } from "~/shared/components/ui/tooltip"
import type { MemberRow } from "~/modules/dashboard/model/dashboard-member-schema"
import type { CommunityMemberRole } from "~/modules/dashboard/model/dashboard-types"
import { MemberRoleCell } from "~/modules/dashboard/components/member-role-cell"
import { MemberActionsCell } from "~/modules/dashboard/components/member-actions-cell"
import { MemberRoleConfirmDialog } from "~/modules/dashboard/components/member-role-confirm-dialog"

type PendingRoleAction = {
  intent: "promote" | "demote"
  memberId: string
  fullName: string
}

type DataTableProps = {
  data: MemberRow[]
  canManageRoles?: boolean
  updatingMemberId?: string | null
  onPromote?: (memberId: string) => void
  onDemote?: (memberId: string) => void
  /** Rendered next to the search, e.g. the owner's invite button. */
  toolbarAction?: React.ReactNode
}

function normalizeRole(role?: CommunityMemberRole): CommunityMemberRole {
  if (role === "admin" || role === "owner") return role
  return "member"
}

export function DataTable({
  data,
  canManageRoles = false,
  updatingMemberId = null,
  onPromote = () => {},
  onDemote = () => {},
  toolbarAction = null,
}: DataTableProps) {
  const [rowSelection, setRowSelection] = React.useState({})
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({})
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  )
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  })
  const [pendingAction, setPendingAction] = React.useState<PendingRoleAction | null>(
    null,
  )

  const handleRequestPromote = React.useCallback(
    (memberId: string, fullName: string) => {
      setPendingAction({ intent: "promote", memberId, fullName })
    },
    [],
  )

  const handleRequestDemote = React.useCallback(
    (memberId: string, fullName: string) => {
      setPendingAction({ intent: "demote", memberId, fullName })
    },
    [],
  )

  const handleConfirmRoleChange = React.useCallback(() => {
    if (!pendingAction) return

    if (pendingAction.intent === "promote") {
      onPromote(pendingAction.memberId)
    } else {
      onDemote(pendingAction.memberId)
    }

    setPendingAction(null)
  }, [pendingAction, onPromote, onDemote])

  const columns = React.useMemo<ColumnDef<MemberRow>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
          />
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: "full_name",
        header: "Member",
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={row.original.avatar_url || ""} alt={row.original.full_name} />
              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                {row.original.full_name.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="font-medium">{row.original.full_name}</div>
          </div>
        ),
      },
      {
        accessorKey: "role",
        header: "Role",
        cell: ({ row }) => (
          <MemberRoleCell role={normalizeRole(row.original.role)} />
        ),
      },
      {
        accessorKey: "joined_at",
        header: "Joined Date",
        cell: ({ row }) => {
          const date = new Date(row.original.joined_at);
          return (
            <div className="text-muted-foreground">
              {date.toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </div>
          );
        },
      },
      {
        id: "actions",
        header: () => <div className="text-right">Actions</div>,
        cell: ({ row }) => (
          <MemberActionsCell
            memberId={row.original.id}
            fullName={row.original.full_name}
            role={normalizeRole(row.original.role)}
            canManageRoles={canManageRoles}
            updatingMemberId={updatingMemberId}
            onRequestPromote={handleRequestPromote}
            onRequestDemote={handleRequestDemote}
          />
        ),
      },
    ],
    [canManageRoles, updatingMemberId, handleRequestPromote, handleRequestDemote],
  )

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
      pagination,
    },
    getRowId: (row) => row.id,
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-4 px-4 lg:px-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Joined Users</h2>
            <p className="text-sm text-muted-foreground">
              Manage members who have joined your community
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name"
                value={(table.getColumn("full_name")?.getFilterValue() as string) ?? ""}
                onChange={(event) =>
                  table.getColumn("full_name")?.setFilterValue(event.target.value)
                }
                className="pl-10 w-80"
              />
            </div>
            {toolbarAction}
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader className="bg-muted">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead key={header.id} colSpan={header.colSpan}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    )
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No users have joined yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-muted-foreground flex-1 text-sm">
            {table.getFilteredSelectedRowModel().rows.length} of{" "}
            {table.getFilteredRowModel().rows.length} user(s) selected.
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Label htmlFor="rows-per-page" className="text-sm font-medium">
                Rows per page
              </Label>
              <Select
                value={`${table.getState().pagination.pageSize}`}
                onValueChange={(value) => {
                  table.setPageSize(Number(value))
                }}
              >
                <SelectTrigger size="sm" className="w-20" id="rows-per-page">
                  <SelectValue
                    placeholder={table.getState().pagination.pageSize}
                  />
                </SelectTrigger>
                <SelectContent side="top">
                  {[10, 20, 30, 40, 50].map((pageSize) => (
                    <SelectItem key={pageSize} value={`${pageSize}`}>
                      {pageSize}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-center text-sm font-medium">
              Page {table.getState().pagination.pageIndex + 1} of{" "}
              {table.getPageCount()}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
              >
                <span className="sr-only">Go to first page</span>
                <IconChevronsLeft />
              </Button>
              <Button
                variant="outline"
                className="size-8"
                size="icon"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <span className="sr-only">Go to previous page</span>
                <IconChevronLeft />
              </Button>
              <Button
                variant="outline"
                className="size-8"
                size="icon"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <span className="sr-only">Go to next page</span>
                <IconChevronRight />
              </Button>
              <Button
                variant="outline"
                className="size-8"
                size="icon"
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
              >
                <span className="sr-only">Go to last page</span>
                <IconChevronsRight />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <MemberRoleConfirmDialog
        open={pendingAction !== null}
        onOpenChange={(open) => {
          if (!open) setPendingAction(null)
        }}
        intent={pendingAction?.intent ?? null}
        memberName={pendingAction?.fullName ?? ""}
        isSubmitting={
          pendingAction !== null && updatingMemberId === pendingAction.memberId
        }
        onConfirm={handleConfirmRoleChange}
      />
    </TooltipProvider>
  )
}
