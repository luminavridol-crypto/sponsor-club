"use client";

import { ReactNode } from "react";

type HiddenField = {
  name: string;
  value: string;
};

type ConfirmActionFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  confirmMessage: string;
  buttonLabel: ReactNode;
  buttonClassName: string;
  hiddenFields?: HiddenField[];
};

export function ConfirmActionForm({
  action,
  confirmMessage,
  buttonLabel,
  buttonClassName,
  hiddenFields = []
}: ConfirmActionFormProps) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm(confirmMessage)) {
          event.preventDefault();
        }
      }}
    >
      {hiddenFields.map((field) => (
        <input key={`${field.name}-${field.value}`} type="hidden" name={field.name} value={field.value} />
      ))}
      <button className={buttonClassName}>{buttonLabel}</button>
    </form>
  );
}
