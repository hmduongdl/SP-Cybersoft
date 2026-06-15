'use client';

import { useEffect, useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';
import {
    AlertTriangle,
    CalendarDays,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Edit2,
    ExternalLink,
    Image as ImageIcon,
    Loader2,
    Plus,
    RefreshCw,
    Trash2,
    X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { formatDateTime, getLocalDateKey, postTaskSchema } from '@/lib/posts';

type PostTaskFormValues = z.input<typeof postTaskSchema>;

interface ManagedPost {
    id: string;
    title: string;
    description: string;
    originalUrl: string;
    thumbnailUrl: string | null;
    scheduledAt: string;
    successfulCheckins: number;
    totalEmployees: number;
}

interface DensityState {
    count: number;
    limit: number;
    reachedLimit: boolean;
    message: string | null;
}

const hourOptions = Array.from({ length: 24 }, (_, hour) => {
    const value = `${String(hour).padStart(2, '0')}:00`;
    return value;
});

const weekDays = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

function toDateTimeValue(dateKey: string, time: string) {
    return `${dateKey}T${time}`;
}

function getInitialDateKey() {
    return getLocalDateKey(new Date());
}

function getCalendarDays(month: Date) {
    const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
    const firstWeekday = (firstDay.getDay() + 6) % 7;
    const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const cells: Array<Date | null> = Array(firstWeekday).fill(null);

    for (let day = 1; day <= daysInMonth; day += 1) {
        cells.push(new Date(month.getFullYear(), month.getMonth(), day));
    }

    while (cells.length % 7 !== 0) {
        cells.push(null);
    }

    return cells;
}

export function PostTaskAdmin() {
    const [posts, setPosts] = useState<ManagedPost[]>([]);
    const [loadingPosts, setLoadingPosts] = useState(true);
    const [saving, setSaving] = useState(false);
    const [selectedDate, setSelectedDate] = useState(getInitialDateKey);
    const [selectedTime, setSelectedTime] = useState('09:00');
    const [calendarOpen, setCalendarOpen] = useState(false);
    const [calendarMonth, setCalendarMonth] = useState(() => new Date());
    const [density, setDensity] = useState<DensityState | null>(null);
    const [checkingDensity, setCheckingDensity] = useState(false);
    const [editingPostId, setEditingPostId] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        reset,
        setValue,
        formState: { errors },
    } = useForm<PostTaskFormValues>({
        resolver: zodResolver(postTaskSchema),
        defaultValues: {
            title: '',
            originalUrl: '',
            thumbnailUrl: '',
            description: '',
            scheduledAt: toDateTimeValue(selectedDate, selectedTime),
        },
    });

    const calendarDays = useMemo(() => getCalendarDays(calendarMonth), [calendarMonth]);

    async function loadPosts() {
        setLoadingPosts(true);
        try {
            const response = await fetch('/api/posts', { cache: 'no-store' });
            const data = await response.json();
            setPosts(data.posts ?? []);
        } finally {
            setLoadingPosts(false);
        }
    }

    useEffect(() => {
        loadPosts();
    }, []);

    useEffect(() => {
        setValue('scheduledAt', toDateTimeValue(selectedDate, selectedTime), {
            shouldValidate: true,
            shouldDirty: true,
        });
    }, [selectedDate, selectedTime, setValue]);

    useEffect(() => {
        let active = true;

        async function checkDensity() {
            setCheckingDensity(true);
            try {
                const response = await fetch(`/api/posts/density?date=${selectedDate}`, {
                    cache: 'no-store',
                });
                const data = await response.json();

                if (active) {
                    setDensity(data);
                }
            } finally {
                if (active) {
                    setCheckingDensity(false);
                }
            }
        }

        checkDensity();

        return () => {
            active = false;
        };
    }, [selectedDate]);

    async function onSubmit(values: PostTaskFormValues) {
        setSaving(true);
        setNotice(null);

        try {
            const response = await fetch(editingPostId ? `/api/posts/${editingPostId}` : '/api/posts', {
                method: editingPostId ? 'PATCH' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values),
            });

            if (!response.ok) {
                setNotice('Không thể lưu bài viết. Vui lòng kiểm tra dữ liệu và thử lại.');
                return;
            }

            setNotice(editingPostId ? 'Đã cập nhật bài viết.' : 'Đã tạo task bài viết mới.');
            clearForm();
            await loadPosts();
        } finally {
            setSaving(false);
        }
    }

    function clearForm() {
        setEditingPostId(null);
        const today = getInitialDateKey();
        setSelectedDate(today);
        setSelectedTime('09:00');
        reset({
            title: '',
            originalUrl: '',
            thumbnailUrl: '',
            description: '',
            scheduledAt: toDateTimeValue(today, '09:00'),
        });
    }

    function editPost(post: ManagedPost) {
        const scheduledAt = new Date(post.scheduledAt);
        const dateKey = getLocalDateKey(scheduledAt);
        const time = `${String(scheduledAt.getHours()).padStart(2, '0')}:00`;

        setEditingPostId(post.id);
        setSelectedDate(dateKey);
        setSelectedTime(time);
        setCalendarMonth(new Date(scheduledAt.getFullYear(), scheduledAt.getMonth(), 1));
        reset({
            title: post.title,
            originalUrl: post.originalUrl,
            thumbnailUrl: post.thumbnailUrl ?? '',
            description: post.description,
            scheduledAt: toDateTimeValue(dateKey, time),
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    async function deletePost(postId: string) {
        const confirmed = window.confirm('Xóa task bài viết này?');

        if (!confirmed) {
            return;
        }

        await fetch(`/api/posts/${postId}`, { method: 'DELETE' });
        await loadPosts();
    }

    return (
        <div className="space-y-6">
            <Card className="rounded-2xl">
                <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Admin Panel</p>
                        <h2 className="mt-2 text-2xl font-semibold text-white">
                            {editingPostId ? 'Sửa task bài viết' : 'Tạo task bài viết mới'}
                        </h2>
                    </div>
                    {editingPostId ? (
                        <Button type="button" variant="secondary" onClick={clearForm}>
                            <X className="mr-2 h-4 w-4" />
                            Hủy sửa
                        </Button>
                    ) : null}
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
                    <div className="space-y-4">
                        <Field label="Tiêu đề" error={errors.title?.message}>
                            <input
                                {...register('title')}
                                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition focus:border-indigo-400"
                                placeholder="Ví dụ: Chia sẻ bài tuyển dụng Backend Engineer tháng này"
                            />
                        </Field>

                        <Field label="Link bài viết gốc Facebook" error={errors.originalUrl?.message}>
                            <input
                                {...register('originalUrl')}
                                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition focus:border-indigo-400"
                                placeholder="https://www.facebook.com/..."
                            />
                        </Field>

                        <Field label="Link ảnh Thumbnail" error={errors.thumbnailUrl?.message}>
                            <div className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3">
                                <ImageIcon className="h-4 w-4 shrink-0 text-slate-500" />
                                <input
                                    {...register('thumbnailUrl')}
                                    className="w-full bg-transparent text-sm text-white outline-none"
                                    placeholder="https://..."
                                />
                            </div>
                        </Field>

                        <Field label="Lời nhắn / Yêu cầu kèm theo" error={errors.description?.message}>
                            <textarea
                                {...register('description')}
                                className="min-h-28 w-full resize-none rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm leading-6 text-white outline-none transition focus:border-indigo-400"
                                placeholder="Hãy share kèm hashtag #YourCompany"
                            />
                        </Field>
                    </div>

                    <div className="space-y-4">
                        <Field label="Ngày giờ hiển thị bài viết" error={errors.scheduledAt?.message as string}>
                            <input type="hidden" {...register('scheduledAt')} />
                            <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
                                <div className="relative">
                                    <button
                                        type="button"
                                        onClick={() => setCalendarOpen((open) => !open)}
                                        className="flex w-full items-center justify-between rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-left text-sm text-white outline-none transition hover:border-slate-500"
                                    >
                                        <span>{selectedDate}</span>
                                        <CalendarDays className="h-4 w-4 text-slate-400" />
                                    </button>

                                    {calendarOpen ? (
                                        <div className="absolute z-20 mt-2 w-full min-w-[300px] rounded-2xl border border-slate-700 bg-slate-950 p-4 shadow-2xl">
                                            <div className="mb-4 flex items-center justify-between">
                                                <button
                                                    type="button"
                                                    className="rounded-lg p-2 text-slate-300 hover:bg-slate-800"
                                                    onClick={() =>
                                                        setCalendarMonth(
                                                            new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1)
                                                        )
                                                    }
                                                    aria-label="Tháng trước"
                                                >
                                                    <ChevronLeft className="h-4 w-4" />
                                                </button>
                                                <p className="text-sm font-medium text-white">
                                                    Tháng {calendarMonth.getMonth() + 1}/{calendarMonth.getFullYear()}
                                                </p>
                                                <button
                                                    type="button"
                                                    className="rounded-lg p-2 text-slate-300 hover:bg-slate-800"
                                                    onClick={() =>
                                                        setCalendarMonth(
                                                            new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1)
                                                        )
                                                    }
                                                    aria-label="Tháng sau"
                                                >
                                                    <ChevronRight className="h-4 w-4" />
                                                </button>
                                            </div>

                                            <div className="grid grid-cols-7 gap-1 text-center text-xs text-slate-500">
                                                {weekDays.map((day) => (
                                                    <span key={day} className="py-1">
                                                        {day}
                                                    </span>
                                                ))}
                                            </div>
                                            <div className="mt-2 grid grid-cols-7 gap-1">
                                                {calendarDays.map((day, index) => {
                                                    const dateKey = day ? getLocalDateKey(day) : null;
                                                    const active = dateKey === selectedDate;

                                                    return (
                                                        <button
                                                            key={dateKey ?? `empty-${index}`}
                                                            type="button"
                                                            disabled={!day}
                                                            onClick={() => {
                                                                if (!dateKey) return;
                                                                setSelectedDate(dateKey);
                                                                setCalendarOpen(false);
                                                            }}
                                                            className={cn(
                                                                'aspect-square rounded-lg text-sm text-slate-300 transition disabled:cursor-default disabled:opacity-0',
                                                                active
                                                                    ? 'bg-indigo-600 text-white'
                                                                    : 'hover:bg-slate-800 hover:text-white'
                                                            )}
                                                        >
                                                            {day?.getDate()}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ) : null}
                                </div>

                                <select
                                    value={selectedTime}
                                    onChange={(event) => setSelectedTime(event.target.value)}
                                    className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition focus:border-indigo-400"
                                >
                                    {hourOptions.map((time) => (
                                        <option key={time} value={time}>
                                            {time}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </Field>

                        <div
                            className={cn(
                                'rounded-2xl border p-4 text-sm',
                                density?.reachedLimit
                                    ? 'border-amber-400/40 bg-amber-500/10 text-amber-100'
                                    : 'border-slate-800 bg-slate-900/70 text-slate-300'
                            )}
                        >
                            <div className="flex items-start gap-3">
                                {density?.reachedLimit ? (
                                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
                                ) : checkingDensity ? (
                                    <Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-slate-400" />
                                ) : (
                                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
                                )}
                                <div>
                                    <p className="font-medium">
                                        {checkingDensity
                                            ? 'Đang kiểm tra mật độ lịch...'
                                            : `${density?.count ?? 0}/${density?.limit ?? 2} bài đã lên lịch trong ngày`}
                                    </p>
                                    {density?.message ? <p className="mt-2 leading-6">{density.message}</p> : null}
                                </div>
                            </div>
                        </div>

                        {notice ? (
                            <div className="rounded-2xl border border-indigo-400/30 bg-indigo-500/10 px-4 py-3 text-sm text-indigo-100">
                                {notice}
                            </div>
                        ) : null}

                        <Button type="submit" disabled={saving} className="w-full py-3">
                            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                            {editingPostId ? 'Lưu thay đổi' : 'Tạo task bài viết'}
                        </Button>
                    </div>
                </form>
            </Card>

            <Card className="rounded-2xl">
                <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Data Table</p>
                        <h2 className="mt-2 text-2xl font-semibold text-white">Bài viết đã lên lịch</h2>
                    </div>
                    <Button type="button" variant="secondary" onClick={loadPosts} disabled={loadingPosts}>
                        <RefreshCw className={cn('mr-2 h-4 w-4', loadingPosts ? 'animate-spin' : '')} />
                        Làm mới
                    </Button>
                </div>

                <div className="overflow-hidden rounded-2xl border border-slate-800">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[900px] border-collapse text-left text-sm">
                            <thead className="bg-slate-950 text-xs uppercase tracking-[0.18em] text-slate-500">
                                <tr>
                                    <th className="px-4 py-4 font-medium">Bài viết</th>
                                    <th className="px-4 py-4 font-medium">Ngày đăng</th>
                                    <th className="px-4 py-4 font-medium">Check-in</th>
                                    <th className="px-4 py-4 font-medium">Link</th>
                                    <th className="px-4 py-4 text-right font-medium">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800 bg-slate-900/40">
                                {loadingPosts ? (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                                            Đang tải danh sách bài viết...
                                        </td>
                                    </tr>
                                ) : posts.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                                            Chưa có bài viết nào được lên lịch.
                                        </td>
                                    </tr>
                                ) : (
                                    posts.map((post) => (
                                        <tr key={post.id} className="text-slate-200">
                                            <td className="px-4 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
                                                        {post.thumbnailUrl ? (
                                                            // eslint-disable-next-line @next/next/no-img-element
                                                            <img
                                                                src={post.thumbnailUrl}
                                                                alt=""
                                                                className="h-full w-full object-cover"
                                                            />
                                                        ) : (
                                                            <ImageIcon className="h-5 w-5 text-slate-500" />
                                                        )}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="truncate font-medium text-white">{post.title}</p>
                                                        <p className="mt-1 line-clamp-1 text-slate-400">{post.description}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 text-slate-300">{formatDateTime(post.scheduledAt)}</td>
                                            <td className="px-4 py-4">
                                                <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-sm font-medium text-emerald-200">
                                                    {post.successfulCheckins}/{post.totalEmployees}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4">
                                                <a
                                                    href={post.originalUrl}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="inline-flex items-center gap-2 text-indigo-300 hover:text-indigo-200"
                                                >
                                                    Mở bài viết
                                                    <ExternalLink className="h-4 w-4" />
                                                </a>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => editPost(post)}
                                                        className="rounded-lg border border-slate-700 p-2 text-slate-300 transition hover:border-indigo-400 hover:text-white"
                                                        aria-label="Sửa bài viết"
                                                    >
                                                        <Edit2 className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => deletePost(post.id)}
                                                        className="rounded-lg border border-slate-700 p-2 text-slate-300 transition hover:border-rose-400 hover:text-rose-200"
                                                        aria-label="Xóa bài viết"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </Card>
        </div>
    );
}

function Field({
    children,
    error,
    label,
}: {
    children: React.ReactNode;
    error?: string;
    label: string;
}) {
    return (
        <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-200">{label}</span>
            {children}
            {error ? <span className="mt-2 block text-sm text-rose-300">{error}</span> : null}
        </label>
    );
}
