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
                    'rounded-3xl bg-surface-container-low p-6 shadow-ambient',
                    {
                        'bg-surface-container-high': variant === 'highlight',
                    },
                    className
                )
            )}
            {...props}
        />
    );
}
