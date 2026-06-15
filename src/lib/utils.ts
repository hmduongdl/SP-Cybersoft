export function cn(...classes: Array<string | undefined | false | null>) {
    return classes.filter(Boolean).join(' ');
}

export function formatPercentage(value: number) {
    return `${Math.round(value * 100)}%`;
}
