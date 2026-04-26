"use client";

import { useState } from "react";
import { ConfirmActionForm } from "@/components/admin/confirm-action-form";

type CleanupItem = {
  id: string;
  title: string;
  meta: string;
  date: string;
  type: string;
  sizeLabel?: string;
  href: string;
  deleteAction: any;
  deleteConfirmMessage: string;
  deleteFields: { name: string; value: string }[];
};

type CleanupSectionData = {
  key: string;
  title: string;
  count: number;
  sizeLabel?: string;
  href: string;
  openLabel: string;
  deleteAllLabel: string;
  deleteAllAction: any;
  deleteAllConfirmMessage: string;
  items: CleanupItem[];
};

export function CleanupSections({
  sections
}: {
  sections: CleanupSectionData[];
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="rounded-2xl border border-white/10 px-4 py-2.5 text-sm text-white/80 transition hover:border-accent/35 hover:bg-white/5 hover:text-white"
      >
        {expanded ? "Скрыть разделы очистки" : "Показать разделы очистки"}
      </button>

      {expanded ? (
        <div className="grid gap-3 xl:grid-cols-2">
          {sections.map((section) => (
            <article
              key={section.key}
              className="rounded-[22px] border border-white/10 bg-black/10 px-4 py-4"
            >
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-lg font-semibold text-white">{section.title}</h4>
                      <span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-white/55">
                        {section.count} шт.
                      </span>
                      {section.sizeLabel ? (
                        <span className="rounded-full border border-cyanGlow/20 bg-cyanGlow/10 px-2.5 py-1 text-[11px] text-cyanGlow">
                          {section.sizeLabel}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <a
                      href={section.href}
                      className="rounded-2xl border border-white/10 px-3 py-2 text-sm text-white/78 transition hover:border-accent/35 hover:bg-white/5 hover:text-white"
                    >
                      {section.openLabel}
                    </a>
                    {section.count ? (
                      <ConfirmActionForm
                        action={section.deleteAllAction}
                        confirmMessage={section.deleteAllConfirmMessage}
                        buttonLabel={section.deleteAllLabel}
                        buttonClassName="rounded-2xl border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-sm text-rose-100 transition hover:bg-rose-400/20"
                      />
                    ) : null}
                  </div>
                </div>

                {section.items.length ? (
                  <details className="rounded-2xl border border-white/10 bg-white/[0.03]">
                    <summary className="cursor-pointer list-none px-3 py-2.5 text-sm text-white/76">
                      {`Показать список (${Math.min(section.items.length, 8)})`}
                    </summary>
                    <div className="space-y-2 border-t border-white/10 px-3 py-3">
                      {section.items.map((item) => (
                        <div
                          key={item.id}
                          className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-black/10 px-3 py-3"
                        >
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="truncate text-sm font-medium text-white">{item.title}</p>
                                <span className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] text-white/45">
                                  {item.type}
                                </span>
                              </div>
                              <p className="mt-1 text-xs text-white/52">{item.meta}</p>
                              <p className="mt-1 text-xs text-white/38">
                                {item.date}
                                {item.sizeLabel ? ` • ${item.sizeLabel}` : ""}
                              </p>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <a
                                href={item.href}
                                className="rounded-2xl border border-white/10 px-3 py-2 text-sm text-white/78 transition hover:border-accent/35 hover:bg-white/5 hover:text-white"
                              >
                                Открыть
                              </a>
                              <ConfirmActionForm
                                action={item.deleteAction}
                                confirmMessage={item.deleteConfirmMessage}
                                buttonLabel="Удалить"
                                buttonClassName="rounded-2xl border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-sm text-rose-100 transition hover:bg-rose-400/20"
                                hiddenFields={item.deleteFields}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </details>
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/10 px-3 py-3 text-sm text-white/45">
                    Сейчас в этом разделе нечего чистить.
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </div>
  );
}
