"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import { z } from "zod";
import { apiRequest, ApiClientError } from "@/lib/api/client";
import { useLanguage } from "@/lib/i18n/provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
const item = z.object({ id: z.string(), name: z.string(), description: z.string(), tags: z.array(z.string()), ipNames: z.array(z.string()), imageCount: z.number(), marketDescription: z.string(), imageAlt: z.string(), requestedLocale: z.string(), resolvedLocale: z.string(), fallbackUsed: z.boolean() });
const schema = z.object({ items: z.array(item), totalPages: z.number() });
export function PartnerCatalog() {
    const { t, locale } = useLanguage(), [items, setItems] = useState<z.infer<typeof item>[]>([]), [q, setQ] = useState(''), [query, setQuery] = useState(''), [page, setPage] = useState(1), [pages, setPages] = useState(1), [error, setError] = useState('');
    useEffect(() => { let alive = true; apiRequest(`/api/partners?q=${encodeURIComponent(query)}&page=${page}`, { schema, locale: locale }).then(({ data }) => { if (alive) {
        setItems(data.items);
        setPages(data.totalPages);
        setError('');
    } }).catch(e => { if (alive)
        setError(e instanceof ApiClientError ? e.message : t('admin.error')); }); return () => { alive = false; }; }, [locale, query, page, t]);
    return <section className="space-y-4 border-b pb-6" aria-label={t('admin.catalog')}><h2 className="text-xl font-semibold">{t('admin.catalog')}</h2><form className="flex gap-2" onSubmit={e => { e.preventDefault(); setQuery(q); setPage(1); }}><Input className="max-w-sm" aria-label={t('admin.search')} value={q} onChange={e => setQ(e.target.value)}/><Button>{t('admin.search')}</Button></form>{error && <p role="alert">{error}</p>}<div className="grid gap-3 sm:grid-cols-2">{items.map(p => <article key={p.id} className="rounded-xl border p-4"><h3 className="font-semibold">{p.name}</h3><p className="whitespace-pre-wrap text-sm">{p.description}</p><p className="text-sm">{p.marketDescription}</p><p className="text-sm text-muted-foreground">{p.ipNames.join(' · ')} / {p.tags.join(' · ')}</p>{p.fallbackUsed && <p className="text-xs">{t('admin.fallback')}: {p.resolvedLocale}</p>}{p.imageCount > 0 && <Image unoptimized width={320} height={320} className="mt-3 max-h-40 rounded object-contain" src={`/api/partners/${p.id}/images/0`} alt={p.imageAlt || p.name}/>}</article>)}</div>{!items.length && !error && <p className="text-sm text-muted-foreground">{t('admin.empty')}</p>}<div className="flex gap-2"><Button variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>{t('admin.previous')}</Button><Button variant="outline" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>{t('admin.next')}</Button></div></section>;
}
