"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  ProfileFields,
  composeName,
  type NameParts,
} from "./profile-fields";
import { normalizeName } from "@/lib/normalize-input";
import { upsertAccount } from "@/lib/account-store";
import { useLocale } from "@/lib/i18n";

// 프로필 설정 폼 (제목 + 입력 + 동작)
// - 이름·조직명이 채워지면 '시작하기' 활성화
// - 저장(계정에 반영) 후 /projects로 이동
export function ProfileSetupForm({ email }: { email: string }) {
  const router = useRouter();
  const { t, locale } = useLocale();
  const [name, setName] = useState("");
  const [nameParts, setNameParts] = useState<NameParts>(
    { lastName: "", firstName: "", lastNameKana: "", firstNameKana: "" },
  );
  const [org, setOrg] = useState("");
  const [role, setRole] = useState("");

  // 일본어는 성·이름이 모두 채워져야 한다
  const filledName =
    locale === "ja"
      ? nameParts.lastName.trim().length > 0 &&
        nameParts.firstName.trim().length > 0
      : name.trim().length > 0;
  const canSubmit = filledName && org.trim().length > 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    upsertAccount({
      email,
      name: normalizeName(composeName(locale, name, nameParts)),
      org: normalizeName(org),
      role: role || undefined,
      ...(locale === "ja" && {
        lastName: normalizeName(nameParts.lastName),
        firstName: normalizeName(nameParts.firstName),
        lastNameKana: normalizeName(nameParts.lastNameKana),
        firstNameKana: normalizeName(nameParts.firstNameKana),
      }),
    });
    router.push("/projects");
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-[22px]">
      {/* 마지막 단계 배지 + 제목 */}
      <div className="flex flex-col items-start gap-3">
        <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
          {t("profile.lastStep")}
        </span>
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-bold tracking-[-0.6px] text-foreground">
            {t("profile.title")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("profile.desc")}
          </p>
        </div>
      </div>

      <ProfileFields
        idPrefix="setup"
        name={name}
        org={org}
        role={role}
        nameParts={nameParts}
        onNameChange={setName}
        onNamePartsChange={setNameParts}
        onOrgChange={setOrg}
        onRoleChange={setRole}
      />

      {/* 시작하기 */}
      <Button
        type="submit"
        disabled={!canSubmit}
        className="h-11 w-full rounded-lg text-sm font-medium"
      >
        {t("profile.submit")}
      </Button>
    </form>
  );
}
