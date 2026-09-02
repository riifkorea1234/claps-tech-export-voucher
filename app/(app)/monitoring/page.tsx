"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Radar,
  EllipsisVertical,
  PencilLine,
  Trash2,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";

type SortKey = "recent" | "created";
const SORT_LABEL: Record<SortKey, string> = {
  recent: "최신순",
  created: "생성순",
};

const PAGE_SIZE = 20;

export default function MonitoringListPage() {
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
    <div className="flex flex-col gap-5 px-8 py-7">
      {/* 헤더 (에셋 생성 목록 참고) */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold text-foreground">탐지 기록</h2>
          <span className="rounded-full bg-secondary px-2 py-0.5 text-sm font-medium text-secondary-foreground">
            {records.length}
          </span>
        </div>
        <Button asChild className="gap-1.5">
          <Link href="/monitoring/new">
            <Plus className="size-4" />새 탐지
          </Link>
        </Button>
      </div>

      {records.length === 0 ? (
        // 탐지 기록 없음 (기본)
        <div className="flex min-h-[320px] flex-col items-center justify-center gap-4 rounded-[14px] border border-dashed border-border bg-card px-6 py-10 text-center">
          <div className="flex size-14 items-center justify-center rounded-xl bg-muted">
            <Radar className="size-6 text-muted-foreground" />
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-base font-semibold text-foreground">
              아직 탐지 기록이 없어요
            </p>
            <p className="max-w-sm text-sm text-muted-foreground">
              이미지로 무단 사용을 탐지해보세요
            </p>
          </div>
          <Button asChild variant="outline" size="sm" className="mt-1">
            <Link href="/monitoring/new">새 탐지 시작</Link>
          </Button>
        </div>
      ) : (
        <>
          {/* 검색 · 필터 (에셋 생성 목록 참고) */}
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="탐지 기록 검색"
                className="h-10 w-full rounded-lg border border-input bg-card pr-3 pl-9 text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/40 focus:outline-none"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger className="flex h-10 shrink-0 items-center justify-between gap-2 rounded-lg border border-input bg-card px-3 text-sm text-foreground outline-none">
                {SORT_LABEL[sort]}
                <ChevronDown className="size-4 text-muted-foreground" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[140px]">
                {(Object.keys(SORT_LABEL) as SortKey[]).map((key) => (
                  <DropdownMenuItem
                    key={key}
                    onSelect={() => setSort(key)}
                    className="justify-between"
                  >
                    {SORT_LABEL[key]}
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
                  <TableHead className="w-[50%] pl-5">기준 이미지</TableHead>
                  <TableHead className="w-[16%]">최근 탐지 일시</TableHead>
                  <TableHead className="w-[16%]">최초 탐지일</TableHead>
                  <TableHead className="w-[10%]">탐지 결과</TableHead>
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
                      검색 결과가 없어요.
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
                            className="size-9 shrink-0 overflow-hidden rounded-md object-cover"
                          />
                        ) : r.imageGradient ? (
                          <div
                            className={cn(
                              "size-9 shrink-0 rounded-md",
                              r.imageGradient,
                            )}
                          />
                        ) : (
                          <div className="size-9 shrink-0 rounded-md bg-muted" />
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
                      {r.scannedAt}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {r.firstScannedAt ?? "-"}
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
                        {r.resultCount}건
                      </span>
                    </TableCell>
                    <TableCell className="pr-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground"
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
                            이름 변경
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            onSelect={() => handleDelete(r.id)}
                          >
                            <Trash2 className="size-4" />
                            삭제
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
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="flex size-9 items-center justify-center rounded-lg border border-input bg-card text-muted-foreground transition-colors hover:bg-muted/50 disabled:pointer-events-none disabled:opacity-40"
                aria-label="이전 페이지"
              >
                <ChevronLeft className="size-4" />
              </button>
              {Array.from({ length: totalPages }).map((_, i) => {
                const n = i + 1;
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setPage(n)}
                    className={cn(
                      "flex size-9 items-center justify-center rounded-lg border text-sm font-medium transition-colors",
                      n === currentPage
                        ? "border-foreground bg-foreground text-background"
                        : "border-input bg-card text-foreground hover:bg-muted/50",
                    )}
                  >
                    {n}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="flex size-9 items-center justify-center rounded-lg border border-input bg-card text-muted-foreground transition-colors hover:bg-muted/50 disabled:pointer-events-none disabled:opacity-40"
                aria-label="다음 페이지"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
