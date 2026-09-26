"use client";
import { useT } from "@/lib/i18n/provider";
import { Check, ShieldCheck, Radar } from "lucide-react";
// Live HTML replaces screenshots with embedded Korean text, so all labels share
// the same language pack as the product and remain readable at narrow widths.
export function ProductPreview({ kind }: { kind: "verify" | "monitoring" }) {
  const t = useT();
  const monitoring = kind === "monitoring";
  return (
    <div
      className="bg-zinc-50 text-left text-zinc-800"
      role="img"
      aria-label={t(
        monitoring
          ? "monitoring.claps_monitoring_screen"
          : "landing.claps_guideline_verification_screen",
      )}
    >
      <div className="flex items-center gap-4 border-b bg-white p-4 text-xs sm:text-sm">
        <b>
          CLAPS <span className="font-normal text-zinc-400">Studio 2.0</span>
        </b>
        <span className="ml-auto">
          {t(
            monitoring
              ? "navigation.monitoring"
              : "landing.guideline_verification",
          )}
        </span>
      </div>
      <div className="grid grid-cols-[1fr_3fr] gap-3 p-4 sm:gap-6 sm:p-7">
        <div className="flex flex-col gap-4 text-[10px] sm:text-xs">
          {["projects", "partners", "assets", "monitoring"].map((item) => (
            <div key={item} className="rounded-lg bg-white p-2">
              {t(`navigation.${item}`)}
            </div>
          ))}
        </div>
        <div className="min-w-0 space-y-4">
          <div className="flex items-center gap-2 rounded-lg bg-white p-3 text-xs font-semibold">
            {monitoring ? (
              <Radar className="size-4" />
            ) : (
              <ShieldCheck className="size-4" />
            )}
            {t(monitoring ? "monitoring.scan_results" : "assets.review_list")}
          </div>
          <div
            className={
              monitoring
                ? "grid grid-cols-2 gap-3"
                : "grid grid-cols-[1fr_3fr] gap-3"
            }
          >
            {monitoring ? (
              [96, 93, 91, 88].map((score) => (
                <div
                  key={score}
                  className="overflow-hidden rounded-lg border bg-white"
                >
                  <div className="aspect-[4/3] bg-gradient-to-br from-pink-200 via-purple-100 to-blue-200" />
                  <p className="p-2 text-[10px] sm:text-xs">
                    {t("monitoring.similarity")} {score}%
                  </p>
                </div>
              ))
            ) : (
              <>
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((id) => (
                    <div
                      key={id}
                      className="aspect-square rounded-md bg-gradient-to-br from-pink-200 to-purple-300"
                    />
                  ))}
                </div>
                <div className="space-y-3">
                  <div className="aspect-square rounded-xl bg-gradient-to-br from-pink-200 to-violet-300" />
                  <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-xs text-green-700">
                    <Check className="size-4" />
                    {t("assets.verdict.passed")}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
