import {
  useEffect,
  cloneElement,
  isValidElement,
  type ReactNode,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type SelectHTMLAttributes,
} from "react";
import { X, LoaderCircle } from "lucide-react";
import { useUiStore } from "../stores/uiStore";
export function Button({
  children,
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string }) {
  return (
    <button {...props} className={`button ${variant} ${props.className || ""}`}>
      {children}
    </button>
  );
}
export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`input ${props.className || ""}`} />;
}
export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`input ${props.className || ""}`} />;
}
export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`badge badge-${status.toLowerCase()}`}>
      {status.replaceAll("_", " ")}
    </span>
  );
}
export function PageHeader({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      <div className="actions">{children}</div>
    </div>
  );
}
export function LoadingSpinner() {
  return (
    <div className="state">
      <LoaderCircle className="spin" size={24} /> Loading…
    </div>
  );
}
export function EmptyState({
  message = "No records found",
}: {
  message?: string;
}) {
  return <div className="state">{message}</div>;
}
/** Error with a retry; `onRetry` reloads only the failed resource (defaults to every view). */
export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="error" role="alert">
      {message}
      <Button
        variant="ghost"
        onClick={onRetry ?? (() => useUiStore.getState().invalidate())}
      >
        Retry
      </Button>
    </div>
  );
}
export function FilterBar({ children }: { children: ReactNode }) {
  return <div className="filter-bar">{children}</div>;
}
export function Table({
  headers,
  children,
}: {
  headers: string[];
  children: ReactNode;
}) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
export function Pagination({
  page,
  totalPages,
  total,
  change,
}: {
  page: number;
  totalPages: number;
  total: number;
  change: (page: number) => void;
}) {
  return (
    <div className="pagination">
      <span>
        {total} records · Page {page + 1} / {Math.max(1, totalPages)}
      </span>
      <Button
        variant="ghost"
        disabled={page === 0}
        onClick={() => change(page - 1)}
      >
        Previous
      </Button>
      <Button
        variant="ghost"
        disabled={page + 1 >= totalPages}
        onClick={() => change(page + 1)}
      >
        Next
      </Button>
    </div>
  );
}
export function Modal({
  title,
  close,
  children,
}: {
  title: string;
  close: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", listener);
    return () => document.removeEventListener("keydown", listener);
  }, [close]);
  return (
    <div className="modal-backdrop" onClick={close}>
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-title">
          <h2>{title}</h2>
          <Button aria-label="Close" variant="ghost" onClick={close}>
            <X size={18} />
          </Button>
        </div>
        {children}
      </section>
    </div>
  );
}
export function ConfirmDialog({
  title,
  message,
  busy,
  confirm,
  close,
  confirmLabel = "Confirm",
}: {
  title: string;
  message: string;
  busy: boolean;
  confirm: () => void;
  close: () => void;
  confirmLabel?: string;
}) {
  return (
    <Modal title={title} close={close}>
      <p>{message}</p>
      <div className="actions">
        <Button variant="ghost" onClick={close}>
          Cancel
        </Button>
        <Button variant="danger" disabled={busy} onClick={confirm}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
export function Toast() {
  const toast = useUiStore((s) => s.toast);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => useUiStore.setState({ toast: null }), 6000);
    return () => clearTimeout(timer);
  }, [toast]);
  return toast ? (
    <div
      className={`toast toast-${toast.tone}`}
      role={toast.tone === "error" ? "alert" : "status"}
    >
      {toast.message}
      <button
        aria-label="Dismiss"
        onClick={() => useUiStore.setState({ toast: null })}
      >
        ×
      </button>
    </div>
  ) : null;
}
export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {isValidElement<Record<string, unknown>>(children)
        ? cloneElement(children, { "aria-label": label })
        : children}
    </label>
  );
}
export { date, confidence, duration } from "../utils/format";
