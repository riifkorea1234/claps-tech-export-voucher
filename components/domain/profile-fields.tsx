"use client";
import { useLanguage } from "@/lib/i18n/provider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { ROLES } from "@/lib/account-store";
import { FieldRequirement } from "./field-requirement";
export type SplitName = { familyName: string; givenName: string; familyNameKana: string; givenNameKana: string };
export const emptySplitName: SplitName = { familyName: "", givenName: "", familyNameKana: "", givenNameKana: "" };
export function ProfileFields({ idPrefix = "profile", disabled = false, name, org, role, splitName, onSplitNameChange, onNameChange, onOrgChange, onRoleChange }: {
  idPrefix?: string; disabled?: boolean; name: string; org: string; role: string; splitName: SplitName;
  onSplitNameChange: (value: SplitName) => void;
  onNameChange: (value: string) => void; onOrgChange: (value: string) => void; onRoleChange: (value: string) => void;
}) {
  const { locale, t } = useLanguage();
  const japanese = locale.split("-")[0] === "ja";
  function field(key: keyof SplitName) {
    const required = key === "familyName" || key === "givenName";
    return <div key={key} className="flex min-w-0 flex-col gap-2">
      <Label className="flex-wrap" htmlFor={`${idPrefix}-${key}`}>{t(`auth.${key}`)} <FieldRequirement required={required} /></Label>
      <Input disabled={disabled} id={`${idPrefix}-${key}`} value={splitName[key]} required={required} maxLength={100} autoComplete={key === "familyName" ? "family-name" : key === "givenName" ? "given-name" : "off"} onChange={e => onSplitNameChange({ ...splitName, [key]: e.target.value })} className="h-11" />
    </div>;
  }
  return <>
    {japanese ? <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{(["familyName", "givenName", "familyNameKana", "givenNameKana"] as const).map(field)}<p className="text-xs text-muted-foreground sm:col-span-2">{t("auth.splitNameLengthHint")}</p></div> : <div className="flex flex-col gap-2">
      <Label className="flex-wrap" htmlFor={`${idPrefix}-name`}>{t("auth.name")} <FieldRequirement required /></Label>
      <Input disabled={disabled} id={`${idPrefix}-name`} value={name} required maxLength={100} autoComplete="name" onChange={e => onNameChange(e.target.value)} placeholder={t("auth.your_name")} className="h-11" />
    </div>}
    <div className="flex flex-col gap-2">
      <Label className="flex-wrap" htmlFor={`${idPrefix}-org`}>{t("auth.organization")} <FieldRequirement required /></Label>
      <Input disabled={disabled} id={`${idPrefix}-org`} value={org} required maxLength={200} autoComplete="organization" onChange={e => onOrgChange(e.target.value)} placeholder={t("auth.company_brand_name")} className="h-11" />
    </div>
    <div className="flex flex-col gap-2">
      <Label className="flex-wrap" htmlFor={`${idPrefix}-role`}>{t("auth.industry_role")} <FieldRequirement /></Label>
      <Select disabled={disabled} value={role} onValueChange={onRoleChange}>
        <SelectTrigger id={`${idPrefix}-role`} className="h-auto min-h-11 max-w-full whitespace-normal"><SelectValue placeholder={t("auth.select_an_option")} /></SelectTrigger>
        <SelectContent>{ROLES.map(r => <SelectItem key={r} value={r}>{t(`auth.role.${r}`)}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  </>;
}
