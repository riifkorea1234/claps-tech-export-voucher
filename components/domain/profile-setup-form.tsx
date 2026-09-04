"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { upsertAccount } from "@/lib/account-store";

// 업종/직무 선택지 (임시 · 추후 조정)
const ROLES = [
  "브랜드/마케팅",
  "디자인/크리에이티브",
  "MD/상품기획",
  "라이선싱/IP",
  "대표/경영",
  "기타",
];

// 프로필 설정 폼 (제목 + 입력 + 동작)
// - 이름·조직명이 채워지면 '시작하기' 활성화
// - 저장(계정에 반영) 후 /projects로 이동
export function ProfileSetupForm({ email }: { email: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [org, setOrg] = useState("");
  const [role, setRole] = useState("");

  const canSubmit = name.trim().length > 0 && org.trim().length > 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    upsertAccount({
      email,
      name: name.trim(),
      org: org.trim(),
      role: role || undefined,
    });
    router.push("/projects");
  }

  const inputClass =
    "h-11 w-full rounded-lg border border-input bg-card px-3.5 text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/40 focus:outline-none";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-[22px]">
      {/* 마지막 단계 배지 + 제목 */}
      <div className="flex flex-col items-start gap-3">
        <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
          마지막 단계
        </span>
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-bold tracking-[-0.6px] text-foreground">
            프로필 설정
          </h2>
          <p className="text-sm text-muted-foreground">
            거의 다 됐어요. 기본 정보를 입력하면 시작합니다.
          </p>
        </div>
      </div>

      {/* 이름 */}
      <div className="flex flex-col gap-2">
        <label htmlFor="name" className="text-sm font-medium text-foreground">
          이름
        </label>
        <input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="홍길동"
          className={inputClass}
        />
      </div>

      {/* 조직명 */}
      <div className="flex flex-col gap-2">
        <label htmlFor="org" className="text-sm font-medium text-foreground">
          조직명
        </label>
        <input
          id="org"
          value={org}
          onChange={(e) => setOrg(e.target.value)}
          placeholder="회사 / 브랜드명"
          className={inputClass}
        />
      </div>

      {/* 업종 / 직무 */}
      <div className="flex flex-col gap-2">
        <label htmlFor="role" className="text-sm font-medium text-foreground">
          업종 / 직무
        </label>
        <div className="relative">
          <select
            id="role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className={cn(
              inputClass,
              "appearance-none pr-9",
              role === "" && "text-muted-foreground",
            )}
          >
            <option value="" disabled>
              선택하세요
            </option>
            {ROLES.map((r) => (
              <option key={r} value={r} className="text-foreground">
                {r}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
        </div>
      </div>

      {/* 시작하기 */}
      <Button
        type="submit"
        disabled={!canSubmit}
        className="h-11 w-full rounded-lg text-sm font-medium"
      >
        시작하기
      </Button>
    </form>
  );
}
