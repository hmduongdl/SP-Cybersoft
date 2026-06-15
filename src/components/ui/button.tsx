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
                    'inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60',
                    {
                        'bg-indigo-600 text-white hover:bg-indigo-500': variant === 'primary',
                        'bg-slate-800 text-slate-100 border border-slate-700 hover:bg-slate-700': variant === 'secondary',
                        'bg-transparent text-slate-200 hover:bg-slate-800/80': variant === 'ghost',
                    }
                ),
                className
            )}
            {...props}
        />
    );
}
