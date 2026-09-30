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
import { FieldRequirement } from "./field-requirement";

/* 프로필 입력 (이름 · 조직명 · 업종/직무)
   프로필 설정(신규 가입)과 마이페이지에서 함께 사용.

   이름 칸은 나라마다 다르다.
   한국·미국  이름 한 칸
   일본       성 / 이름 두 칸 + 읽기(후리가나) 두 칸
              한자 성명은 읽는 법이 여러 가지라 표기만으로 특정할 수 없다. */

export type NameParts = {
  lastName: string;
  firstName: string;
  lastNameKana: string;
  firstNameKana: string;
};

export function ProfileFields({
  idPrefix = "profile",
  name,
  org,
  role,
  nameParts,
  onNameChange,
  onNamePartsChange,
  onOrgChange,
  onRoleChange,
}: {
  idPrefix?: string; // 한 화면에 두 번 놓일 때 id 충돌 방지
  name: string;
  org: string;
  role: string;
  nameParts: NameParts;
  onNameChange: (value: string) => void;
  onNamePartsChange: (next: NameParts) => void;
  onOrgChange: (value: string) => void;
  onRoleChange: (value: string) => void;
}) {
  const { t, locale } = useLocale();
  const splitName = locale === "ja";

  function setPart(key: keyof NameParts, value: string) {
    onNamePartsChange({ ...nameParts, [key]: value });
  }

  return (
    <>
      {/* 이름 */}
      {splitName ? (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor={`${idPrefix}-last`} className="gap-1.5">
                {t("profile.lastName")}
                <FieldRequirement required />
              </Label>
              <Input
                id={`${idPrefix}-last`}
                value={nameParts.lastName}
                onChange={(e) => setPart("lastName", e.target.value)}
                placeholder={t("profile.lastNamePlaceholder")}
                className="h-11"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`${idPrefix}-first`} className="gap-1.5">
                {t("profile.firstName")}
                <FieldRequirement required />
              </Label>
              <Input
                id={`${idPrefix}-first`}
                value={nameParts.firstName}
                onChange={(e) => setPart("firstName", e.target.value)}
                placeholder={t("profile.firstNamePlaceholder")}
                className="h-11"
              />
            </div>
          </div>

          {/* 읽기 (후리가나) */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor={`${idPrefix}-last-kana`} className="gap-1.5">
                {t("profile.lastNameKana")}
                <FieldRequirement optional />
              </Label>
              <Input
                id={`${idPrefix}-last-kana`}
                value={nameParts.lastNameKana}
                onChange={(e) => setPart("lastNameKana", e.target.value)}
                placeholder={t("profile.lastNameKanaPlaceholder")}
                className="h-11"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`${idPrefix}-first-kana`} className="gap-1.5">
                {t("profile.firstNameKana")}
                <FieldRequirement optional />
              </Label>
              <Input
                id={`${idPrefix}-first-kana`}
                value={nameParts.firstNameKana}
                onChange={(e) => setPart("firstNameKana", e.target.value)}
                placeholder={t("profile.firstNameKanaPlaceholder")}
                className="h-11"
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${idPrefix}-name`} className="gap-1.5">
            {t("profile.name")}
            <FieldRequirement required />
          </Label>
          <Input
            id={`${idPrefix}-name`}
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder={t("profile.namePlaceholder")}
            className="h-11"
          />
        </div>
      )}

      {/* 조직명 */}
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${idPrefix}-org`} className="gap-1.5">
          {t("profile.org")}
          <FieldRequirement required />
        </Label>
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
        <Label htmlFor={`${idPrefix}-role`} className="gap-1.5">
          {t("profile.role")}
          <FieldRequirement optional />
        </Label>
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

/** 저장 직전에 이름을 하나로 합친다 (일본어는 "성 이름") */
export function composeName(
  locale: string,
  name: string,
  parts: NameParts,
): string {
  if (locale !== "ja") return name.trim();
  return `${parts.lastName} ${parts.firstName}`.trim();
}
