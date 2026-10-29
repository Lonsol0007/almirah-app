import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cx } from "@/lib/cx";
import { Spinner } from "./spinner";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-on-accent hover:brightness-110 active:brightness-95",
  secondary: "bg-surface-raised text-text border border-border hover:bg-surface",
  ghost: "bg-transparent text-accent hover:bg-accent-subtle",
  danger: "bg-danger text-on-accent hover:brightness-110 active:brightness-95",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-5 text-base",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading, icon, disabled, className, children, type = "button", ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-md font-semibold",
        "transition-[filter,background-color] duration-[var(--motion-fast)]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        sizes[size],
        className,
      )}
      {...rest}
    >
      {loading ? <Spinner size={16} /> : icon}
      <span>{children}</span>
    </button>
  );
});

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  loading?: boolean;
  variant?: "ghost" | "subtle" | "inverse";
}

const iconVariants = {
  ghost: "text-text-muted hover:bg-accent-subtle hover:text-text",
  subtle: "bg-surface text-text hover:bg-accent-subtle",
  inverse: "text-on-accent hover:bg-on-accent/10",
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, loading, variant = "ghost", disabled, className, children, type = "button", ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cx(
        "inline-flex h-11 w-11 items-center justify-center rounded-pill",
        "transition-colors duration-[var(--motion-fast)] disabled:opacity-50",
        iconVariants[variant],
        className,
      )}
      {...rest}
    >
      <span className={cx(loading && "animate-spin")} aria-hidden="true">
        {children}
      </span>
    </button>
  );
});
