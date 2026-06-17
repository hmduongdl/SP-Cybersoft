import { type ButtonHTMLAttributes } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'ghost';
}

export function Button({ className, variant = 'primary', ...props }: ButtonProps) {
    return (
        <button
            className={twMerge(
                clsx(
                    'inline-flex items-center justify-center rounded-lg-xl px-4 py-2 text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60',
                    {
                        'gradient-primary text-on-primary hover:opacity-90': variant === 'primary',
                        'bg-surface-container-low text-on-surface-variant hover:bg-surface-container': variant === 'secondary',
                        'bg-transparent text-on-surface-variant hover:bg-surface-container-low/80': variant === 'ghost',
                    }
                ),
                className
            )}
            {...props}
        />
    );
}
