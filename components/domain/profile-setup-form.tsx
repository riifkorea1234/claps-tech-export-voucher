"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ProfileFields } from "./profile-fields";
import { upsertAccount } from "@/lib/account-store";

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

      <ProfileFields
        idPrefix="setup"
        name={name}
        org={org}
        role={role}
        onNameChange={setName}
        onOrgChange={setOrg}
        onRoleChange={setRole}
      />

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
