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
                    'rounded-xl bg-surface-mid border border-slate-100 shadow-[0_2px_12px_-3px_rgba(15,23,42,0.03)] p-6',
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

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
    return <div className={twMerge(clsx('flex flex-col gap-1.5 pb-4', className))} {...props} />;
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
    return <h3 className={twMerge(clsx('font-manrope text-base font-bold text-on-surface', className))} {...props} />;
}

export function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
    return <p className={twMerge(clsx('font-inter text-sm text-on-muted', className))} {...props} />;
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
    return <div className={twMerge(clsx('', className))} {...props} />;
}
