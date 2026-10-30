export const cn = (...parts) => parts.filter(Boolean).join(" ");



export function Row({ as: El = "div", nowrap = false, className, ...props }) {
    return (
        <El
            className={cn(
                "flex items-center gap-2",
                nowrap ? "flex-nowrap" : "flex-wrap",
                className,
            )}
            {...props}
        />
    );
}


export const twoCol = "grid grid-cols-2 items-end gap-2";



export function Card({
    as: El = "section",
    compact = false,
    highlight = false,
    className,
    ...props
}) {
    return (
        <El
            className={cn(
                "rounded-2xl border bg-card",
                highlight ? "border-warn/70" : "border-line",
                compact ? "p-3.5" : "p-4",
                className,
            )}
            {...props}
        />
    );
}

export function CardTitle({ className, ...props }) {
    return (
        <h3
            className={cn(
                "mb-3 text-label font-semibold text-muted",
                className,
            )}
            {...props}
        />
    );
}

export function Hint({ className, ...props }) {
    return <p className={cn("mt-2 text-xs text-dim", className)} {...props} />;
}



const btnBase =
    "cursor-pointer touch-manipulation rounded-control font-medium " +
    "disabled:cursor-not-allowed disabled:opacity-40 enabled:hover:brightness-115";

const btnSize = {
    md: "min-h-11 px-4 py-2 text-body",
    sm: "min-h-10 flex-1 px-2.5 py-1.5 text-caption",
};

const btnTone = {
    default: "bg-line text-ink",
    accent: "border border-accent bg-accent text-on-accent",
    success: "border border-success bg-success text-on-success",
    danger: "border border-danger bg-danger text-on-danger",
};

export function Btn({
    tone = "default",
    size = "md",
    className,
    type = "button",
    ...props
}) {
    return (
        <button
            type={type}
            className={cn(btnBase, btnSize[size], btnTone[tone], className)}
            {...props}
        />
    );
}

export function Field({ label, className, children }) {
    return (
        <label
            className={cn(
                "flex min-w-0 flex-col gap-1 text-caption text-muted",
                className,
            )}
        >
            {label}
            {children}
        </label>
    );
}


export function Input({ className, ...props }) {
    return (
        <input
            className={cn(
                "min-h-11 w-full rounded-control border border-line-strong bg-surface px-3 py-2.5",
                "text-base text-ink placeholder:text-dim",
                className,
            )}
            {...props}
        />
    );
}



const dotTone = {
    idle: "bg-dim",
    on: "bg-live",
    wait: "bg-warn animate-blink",
};

export function Dot({ tone = "idle", color, big = false, pulse = false }) {
    return (
        <span
            className={cn(
                "flex-none rounded-full motion-reduce:animate-none",
                big ? "size-3.5" : "size-2.5",
                color ?? dotTone[tone],
                pulse && "animate-breathe",
            )}
        />
    );
}

const pillTone = {
    default: "border-line bg-card",
    admin: "border-warn/40 bg-warn/12 text-amber-300",
};

export function Pill({ tone = "default", className, ...props }) {
    return (
        <span
            className={cn(
                "inline-flex items-center gap-2 rounded-full border px-5 py-3 text-caption uppercase font-bold",
                pillTone[tone],
                className,
            )}
            {...props}
        />
    );
}

export function Tag({ className, ...props }) {
    return (
        <span
            className={cn(
                "rounded-full bg-line px-2 py-0.5 text-micro text-soft",
                className,
            )}
            {...props}
        />
    );
}

const bannerTone = {
    default: "text-muted",
    warn: "text-amber-200",
    error: "text-rose-200",
};

export function Banner({ tone = "default", className, ...props }) {
    return (
        <div
            className={cn(
                "rounded-xl text-sm mt-2",
                bannerTone[tone],
                className,
            )}
            {...props}
        />
    );
}
