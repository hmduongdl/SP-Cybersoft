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
                    'rounded-xl bg-white border border-slate-100 shadow-[0_2px_12px_-3px_rgba(15,23,42,0.03)] p-6',
                    {
                        'bg-slate-50 border-slate-200': variant === 'highlight',
                    },
                    className
                )
            )}
            {...props}
        />
    );
}
