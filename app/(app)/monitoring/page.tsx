"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  ChevronDown,
  Radar,
  EllipsisVertical,
  PencilLine,
  Trash2,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  getRecords,
  updateRecord,
  deleteRecord,
  type SavedMonitoringRecord,
} from "@/lib/monitoring-store";
import { EmptyState } from "@/components/domain/empty-state";
import { SearchBar } from "@/components/domain/search-bar";
import { Pagination } from "@/components/domain/pagination";
import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/i18n";
import { formatDate, formatDateTime } from "@/lib/format-date";

type SortKey = "recent" | "created";
// 정렬 이름의 사전 열쇠말
const SORT_LABEL_KEY: Record<SortKey, string> = {
  recent: "monitoring.sortRecent",
  created: "monitoring.sortCreated",
};

const PAGE_SIZE = 20;

export default function MonitoringListPage() {
  const { t, locale } = useLocale();
  const router = useRouter();
  const [records, setRecords] = useState<SavedMonitoringRecord[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("recent");
  const [page, setPage] = useState(1);

  useEffect(() => {
    setRecords(getRecords());
  }, []);

  // 검색·정렬 바뀌면 첫 페이지로
  useEffect(() => {
    setPage(1);
  }, [query, sort]);

  // 검색(이름) + 정렬 (최신순=최근 탐지 / 생성순=최초 탐지일)
  const visible = records
    .filter((r) =>
      r.imageName.toLowerCase().includes(query.trim().toLowerCase()),
    )
    .slice()
    .sort((a, b) => {
      // 최신순: 최근 탐지 일시 내림차순 (최근 것부터)
      if (sort === "recent") return b.scannedAt.localeCompare(a.scannedAt);
      // 생성순: 최초 탐지일 오름차순 (먼저 만든 것부터)
      const av = a.firstScannedAt ?? a.scannedAt;
      const bv = b.firstScannedAt ?? b.scannedAt;
      return av.localeCompare(bv);
    });

  // 페이지네이션 (20건 초과 시)
  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = visible.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  function startRename(r: SavedMonitoringRecord) {
    setEditingId(r.id);
    setEditValue(r.imageName);
  }

  function saveRename() {
    if (editingId && editValue.trim()) {
      updateRecord(editingId, { imageName: editValue.trim() });
      setRecords(getRecords());
    }
    setEditingId(null);
  }

  function handleDelete(id: string) {
    deleteRecord(id);
    setRecords(getRecords());
    if (editingId === id) setEditingId(null);
  }

  return (
    <div className="flex flex-col gap-5 px-[var(--pad-page-x)] py-[var(--pad-page-y)]">
      {/* 헤더 (에셋 생성 목록 참고) */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold text-foreground">{t("monitoring.list")}</h2>
          <Badge variant="secondary" className="h-auto text-sm">
            {records.length}
          </Badge>
        </div>
        <Button asChild className="gap-1.5">
          <Link href="/monitoring/new">
            <Plus className="size-4" />
            {t("monitoring.new")}
          </Link>
        </Button>
      </div>

      {records.length === 0 ? (
        // 탐지 기록 없음 (기본)
        <EmptyState
          icon={Radar}
          title={t("monitoring.emptyTitle")}
          description={t("monitoring.emptyDesc")}
          action={
            <Button asChild variant="outline" size="sm" className="mt-1">
              <Link href="/monitoring/new">{t("monitoring.startNew")}</Link>
            </Button>
          }
        />
      ) : (
        <>
          {/* 검색 · 필터 (에셋 생성 목록 참고) */}
          <div className="flex flex-col gap-2 sm:flex-row">
            <SearchBar
              value={query}
              onChange={setQuery}
              placeholder={t("monitoring.searchPlaceholder")}
              className="flex-1"
            />
            <DropdownMenu>
              <DropdownMenuTrigger className="flex h-10 shrink-0 items-center justify-between gap-2 rounded-lg border border-input bg-card px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/40">
                {t(SORT_LABEL_KEY[sort])}
                <ChevronDown className="size-4 text-muted-foreground" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[140px]">
                {(Object.keys(SORT_LABEL_KEY) as SortKey[]).map((key) => (
                  <DropdownMenuItem
                    key={key}
                    onSelect={() => setSort(key)}
                    className="justify-between"
                  >
                    {t(SORT_LABEL_KEY[key])}
                    {sort === key && <Check className="size-4 text-brand" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* 탐지 기록 테이블 (shadcn table) */}
          <div className="overflow-hidden rounded-[14px] border border-border bg-card">
            <Table className="min-w-[760px] table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50%] pl-5">
                    {t("monitoring.colImage")}
                  </TableHead>
                  <TableHead className="w-[16%]">
                    {t("monitoring.colScannedAt")}
                  </TableHead>
                  <TableHead className="w-[16%]">
                    {t("monitoring.colFirstScan")}
                  </TableHead>
                  <TableHead className="w-[10%]">
                    {t("monitoring.colResult")}
                  </TableHead>
                  <TableHead className="w-[8%] pr-4" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="py-10 text-center text-sm text-muted-foreground"
                    >
                      {t("assets.noResult")}
                    </TableCell>
                  </TableRow>
                )}
                {paged.map((r) => (
                  <TableRow
                    key={r.id}
                    onClick={() => {
                      if (editingId !== r.id) router.push(`/monitoring/${r.id}`);
                    }}
                    className="cursor-pointer"
                  >
                    <TableCell className="pl-5">
                      <div className="flex min-w-0 items-center gap-3">
                        {r.imageData ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={r.imageData}
                            alt=""
                            className="size-[var(--row-thumb)] shrink-0 overflow-hidden rounded-md object-cover"
                          />
                        ) : r.imageGradient ? (
                          <div
                            className={cn(
                              "size-[var(--row-thumb)] shrink-0 rounded-md",
                              r.imageGradient,
                            )}
                          />
                        ) : (
                          <div className="size-[var(--row-thumb)] shrink-0 rounded-md bg-muted" />
                        )}
                        {editingId === r.id ? (
                          <input
                            autoFocus
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => {
                              e.stopPropagation();
                              if (e.key === "Enter") saveRename();
                              if (e.key === "Escape") setEditingId(null);
                            }}
                            onBlur={saveRename}
                            className="h-8 w-full max-w-[280px] rounded-md border border-input bg-card px-2 text-sm text-foreground focus:ring-2 focus:ring-ring/40 focus:outline-none"
                          />
                        ) : (
                          <span className="min-w-0 max-w-[66%] truncate font-medium text-card-foreground">
                            {r.imageName}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(r.scannedAt, locale)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(r.firstScannedAt, locale)}
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                          r.resultCount > 0
                            ? "bg-amber-100 text-amber-700"
                            : "bg-green-100 text-green-700",
                        )}
                      >
                        {t("monitoring.resultCount", { n: r.resultCount })}
                      </span>
                    </TableCell>
                    <TableCell className="pr-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/40 transition-colors hover:bg-muted hover:text-foreground"
                        >
                          <EllipsisVertical className="size-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="w-[160px]"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <DropdownMenuItem
                            onSelect={() => startRename(r)}
                          >
                            <PencilLine className="size-4" />
                            {t("projects.rename")}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            onSelect={() => handleDelete(r.id)}
                          >
                            <Trash2 className="size-4" />
                            {t("common.delete")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* 페이지네이션 (20건 초과 시) */}
          <Pagination
            page={currentPage}
            totalPages={totalPages}
            onChange={setPage}
          />
        </>
      )}
    </div>
  );
}
