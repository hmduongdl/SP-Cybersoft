import type { HTMLAttributes } from 'react';
import { twMerge } from 'tailwind-merge';
import { clsx } from 'clsx';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
    variant?: 'default' | 'highlight';
}

export function Card({ className, variant = 'default', ...props }: CardProps) {
    return (
        <div
            className={twMerge(
                clsx(
                    'rounded-3xl border border-slate-800/70 bg-slate-950/80 p-6 shadow-soft backdrop-blur-xl',
                    {
                        'border-emerald-500/20 bg-slate-900/95': variant === 'highlight',
                    },
                    className
                )
            )}
            {...props}
        />
    );
}
