import { z } from 'zod';

export const DAILY_POST_LIMIT = 2;

export const postTaskSchema = z.object({
    title: z.string().trim().min(10, 'Tiêu đề phải có tối thiểu 10 ký tự.'),
    url: z.string().trim().url('Link bài viết gốc phải là URL hợp lệ.'),
    thumbnail_url: z
        .string()
        .trim()
        .url('Link ảnh thumbnail phải là URL hợp lệ.')
        .or(z.literal(''))
        .or(z.null())
        .optional(),
    description: z.string().trim().optional().or(z.literal('')),
    start_at: z.coerce.date('Vui lòng chọn ngày giờ hiển thị bài viết.'),
    team: z.string().optional().nullable(),
    author: z.string().optional().nullable(),
});


export type PostTaskInput = z.infer<typeof postTaskSchema>;

export function getLocalDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

export function getDayRange(dateKey: string): { start: Date; end: Date } {
    const start = new Date(`${dateKey}T00:00:00`);
    const end = new Date(start);
    end.setDate(start.getDate() + 1);

    return { start, end };
}

export function formatDateTime(date: Date | string): string {
    return new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    }).format(new Date(date));
}
