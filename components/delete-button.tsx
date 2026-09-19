"use client";

import { useFormStatus } from "react-dom";

// Danger action: renders a red-outline button in a plain form that fires
// `action` (a server action). Native confirm() gates the submit — one line
// of platform, no dialog library.
export function DeleteButton({
  action,
  confirmMsg,
  label = "Borrar",
  pendingLabel = "Borrando…",
}: {
  action: (formData: FormData) => Promise<void> | void;
  confirmMsg: string;
  label?: string;
  pendingLabel?: string;
}) {
  return (
    <form action={action}>
      <Button confirmMsg={confirmMsg} label={label} pendingLabel={pendingLabel} />
    </form>
  );
}

function Button({ confirmMsg, label, pendingLabel }: { confirmMsg: string; label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(e) => {
        if (!window.confirm(confirmMsg)) e.preventDefault();
      }}
      className="hairline rounded-md px-3 py-1.5 text-[12px] disabled:opacity-60"
      style={{
        background: "var(--color-surface-1)",
        color: "var(--color-danger)",
        borderColor: "color-mix(in oklab, var(--color-danger) 40%, var(--color-hairline))",
      }}
    >
      {pending ? pendingLabel : label}
    </button>
  );
}
