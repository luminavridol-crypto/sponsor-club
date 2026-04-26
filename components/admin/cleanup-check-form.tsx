"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { checkStorageCleanupAction } from "@/app/actions";

const initialCleanupCheckState = {
  status: "idle" as const,
  message: "",
  fileCount: 0,
  totalBytes: 0
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-2xl border border-cyanGlow/35 bg-cyanGlow/10 px-4 py-2.5 text-sm font-medium text-cyanGlow transition hover:bg-cyanGlow/15 disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? "Проверяем..." : "Проверить"}
    </button>
  );
}

export function CleanupCheckForm({
  initialMessage
}: {
  initialMessage: string;
}) {
  const [state, action] = useActionState(checkStorageCleanupAction, initialCleanupCheckState);
  const message = state.message || initialMessage;

  return (
    <div className="flex flex-col gap-3 lg:items-end">
      <form action={action}>
        <SubmitButton />
      </form>
      <p
        className={`max-w-md text-sm leading-6 ${
          state.status === "error" ? "text-rose-200" : "text-white/62"
        }`}
      >
        {message}
      </p>
    </div>
  );
}
