"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { sendMemberChatMessageAction } from "@/app/actions";
import { Tier } from "@/lib/types";
import { formatEuroAmount } from "@/lib/utils/money";

function SubmitState({
  submitLabel,
  submitButtonClassName,
  fileName,
  infoCardClassName,
  infoLabelClassName,
  accentTextClassName
}: {
  submitLabel: string;
  submitButtonClassName: string;
  fileName: string | null;
  infoCardClassName: string;
  infoLabelClassName: string;
  accentTextClassName: string;
}) {
  const { pending } = useFormStatus();

  return (
    <>
      {fileName ? (
        <div className={`rounded-[18px] border px-4 py-3 ${infoCardClassName}`}>
          <p className={`text-[11px] uppercase tracking-[0.22em] ${infoLabelClassName}`}>Файл</p>
          <p className={`mt-2 text-sm ${accentTextClassName}`}>{fileName}</p>
        </div>
      ) : null}

      {pending ? (
        <div className={`rounded-[18px] border px-4 py-3 ${infoCardClassName}`}>
          <div className="flex items-center justify-between gap-3">
            <p className={`text-sm ${accentTextClassName}`}>Загружаю скрин и отправляю заявку...</p>
            <span className={`text-xs ${infoLabelClassName}`}>Подожди</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/8">
            <div className="h-full w-1/2 animate-pulse rounded-full bg-[linear-gradient(90deg,#f0abfc,#a855f7,#6d28d9)]" />
          </div>
        </div>
      ) : null}

      <button
        disabled={pending}
        className={`flex w-full items-center justify-center rounded-[20px] px-4 py-3 text-sm font-semibold transition disabled:cursor-wait disabled:opacity-80 ${submitButtonClassName}`}
      >
        {pending ? "Отправляю..." : submitLabel}
      </button>
    </>
  );
}

export function SupportRequestForm({
  tier,
  requestKind,
  postSlug,
  postTitle,
  postPrice,
  textareaPlaceholder,
  submitLabel,
  infoCardClassName,
  infoLabelClassName,
  accentTextClassName,
  submitButtonClassName
}: {
  tier: Tier;
  requestKind: "post" | "tier" | "chat_messages";
  postSlug?: string;
  postTitle?: string;
  postPrice?: string;
  textareaPlaceholder: string;
  submitLabel: string;
  infoCardClassName: string;
  infoLabelClassName: string;
  accentTextClassName: string;
  submitButtonClassName: string;
}) {
  const [fileName, setFileName] = useState<string | null>(null);
  const amountLabel = postPrice ? formatEuroAmount(postPrice) ?? postPrice : null;
  const isPostPriceRequest = requestKind === "post" && !postPrice;

  return (
    <form action={sendMemberChatMessageAction} className="mt-3 space-y-3">
      <input type="hidden" name="tier" value={tier} />
      <input type="hidden" name="createRequest" value="1" />
      <input type="hidden" name="requestKind" value={requestKind} />
      {postSlug ? <input type="hidden" name="postSlug" value={postSlug} /> : null}
      {postTitle ? <input type="hidden" name="postTitle" value={postTitle} /> : null}
      {postPrice ? <input type="hidden" name="postPrice" value={postPrice} /> : null}

      {requestKind === "post" && amountLabel ? (
        <div className={`rounded-[18px] border px-4 py-3 ${infoCardClassName}`}>
          <p className={`text-[11px] uppercase tracking-[0.22em] ${infoLabelClassName}`}>Сумма к оплате</p>
          <p className={`mt-2 text-lg font-semibold ${accentTextClassName}`}>{amountLabel}</p>
        </div>
      ) : null}

      <textarea
        name="body"
        rows={3}
        placeholder={textareaPlaceholder}
        className={`w-full rounded-[20px] border-0 px-4 py-3 text-sm text-white outline-none placeholder:text-white/28 ${infoCardClassName}`}
      />

      <div className={`rounded-[20px] p-3 ${infoCardClassName}`}>
        <label className={`flex cursor-pointer items-center justify-center rounded-[16px] border border-dashed px-4 py-3 text-sm transition ${infoLabelClassName} hover:border-white/22 hover:text-white`}>
          <input
            type="file"
            name="media"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              const nextFile = event.currentTarget.files?.[0] ?? null;
              setFileName(nextFile ? nextFile.name : null);
            }}
          />
          {fileName ? "Скрин выбран" : isPostPriceRequest ? "Прикрепить скрин позже" : "Прикрепить скрин оплаты"}
        </label>
      </div>

      <SubmitState
        submitLabel={submitLabel}
        submitButtonClassName={submitButtonClassName}
        fileName={fileName}
        infoCardClassName={infoCardClassName}
        infoLabelClassName={infoLabelClassName}
        accentTextClassName={accentTextClassName}
      />
    </form>
  );
}
