"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { ROLES } from "@/lib/account-store";
import { useLocale } from "@/lib/i18n";

// 프로필 입력 3종 (이름 · 조직명 · 업종/직무)
// 프로필 설정(신규 가입)과 마이페이지에서 함께 사용
export function ProfileFields({
  idPrefix = "profile",
  name,
  org,
  role,
  onNameChange,
  onOrgChange,
  onRoleChange,
}: {
  idPrefix?: string; // 한 화면에 두 번 놓일 때 id 충돌 방지
  name: string;
  org: string;
  role: string;
  onNameChange: (value: string) => void;
  onOrgChange: (value: string) => void;
  onRoleChange: (value: string) => void;
}) {
  const { t } = useLocale();

  return (
    <>
      {/* 이름 */}
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${idPrefix}-name`}>{t("profile.name")}</Label>
        <Input
          id={`${idPrefix}-name`}
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder={t("profile.namePlaceholder")}
          className="h-11"
        />
      </div>

      {/* 조직명 */}
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${idPrefix}-org`}>{t("profile.org")}</Label>
        <Input
          id={`${idPrefix}-org`}
          value={org}
          onChange={(e) => onOrgChange(e.target.value)}
          placeholder={t("profile.orgPlaceholder")}
          className="h-11"
        />
      </div>

      {/* 업종 / 직무 */}
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${idPrefix}-role`}>{t("profile.role")}</Label>
        <Select value={role} onValueChange={onRoleChange}>
          <SelectTrigger id={`${idPrefix}-role`} className="h-11">
            <SelectValue placeholder={t("profile.rolePlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            {ROLES.map((r) => (
              <SelectItem key={r} value={r}>
                {t(`role.${r}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </>
  );
}
