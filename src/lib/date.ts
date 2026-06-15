export function getCurrentQuarter(): number {
    const month = new Date().getMonth() + 1;
    return Math.ceil(month / 3);
}

export function isWeekend(date: Date): boolean {
    const day = date.getDay();
    return day === 0 || day === 6;
}

export function formatDate(date: Date, locale = 'vi-VN'): string {
    return new Intl.DateTimeFormat(locale, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    }).format(date);
}
