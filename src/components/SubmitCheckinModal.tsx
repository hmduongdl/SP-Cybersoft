"use client";

import React, { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { UploadCloud, X, Link, Check, Loader2, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Post {
  id: string;
  title: string;
  description?: string;
  originalUrl: string;
  thumbnailUrl?: string | null;
  scheduledAt: string;
  status: string;
}

interface SubmitCheckinModalProps {
  post: Post;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function SubmitCheckinModal({ post, isOpen, onClose, onSuccess }: SubmitCheckinModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isChecked1, setIsChecked1] = useState(false);
  const [isChecked2, setIsChecked2] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clean up ObjectURL to prevent memory leaks
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setFile(null);
      setPreviewUrl(null);
      setIsChecked1(false);
      setIsChecked2(false);
      setIsLoading(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      validateAndSetFile(selectedFile);
    }
  };

  const validateAndSetFile = (selectedFile: File) => {
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png"];
    if (!allowedTypes.includes(selectedFile.type)) {
      toast.error("Định dạng file không hợp lệ. Chỉ chấp nhận .jpg, .jpeg, .png.");
      return;
    }

    const maxSizeBytes = 5 * 1024 * 1024; // 5MB
    if (selectedFile.size > maxSizeBytes) {
      toast.error("Dung lượng file vượt quá giới hạn 5MB.");
      return;
    }

    setFile(selectedFile);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(URL.createObjectURL(selectedFile));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      validateAndSetFile(droppedFile);
    }
  };

  const handleRemoveFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !isChecked1 || !isChecked2) return;

    try {
      setIsLoading(true);
      const toastId = toast.loading("Đang nộp ảnh bằng chứng và phân tích EXIF...");

      const formData = new FormData();
      formData.append("postId", post.id);
      formData.append("image", file);

      const res = await fetch("/api/checkin/submit", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Gửi bằng chứng thất bại.");
      }

      toast.success(data.message || "Nộp bài thành công!", { id: toastId });
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Đã xảy ra lỗi khi nộp bài. Vui lòng thử lại.");
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid = file && isChecked1 && isChecked2 && !isLoading;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md transition-opacity duration-300 animate-in fade-in">
      
      {/* Modal Container */}
      <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden flex flex-col relative border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 mb-2">
              Nộp Minh Chứng
            </span>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white line-clamp-1">
              {post.title}
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto max-h-[75vh]">
          
          {/* Post Details & Link */}
          <div className="flex gap-4 p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
            {post.thumbnailUrl ? (
              <img 
                src={post.thumbnailUrl} 
                alt={post.title} 
                className="w-16 h-16 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shadow-sm flex-shrink-0"
              />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-400 dark:text-slate-500 flex-shrink-0">
                <ImageIcon className="w-6 h-6" />
              </div>
            )}
            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 line-clamp-1">
                Link bài viết cần chia sẻ:
              </p>
              <a 
                href={post.originalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1 mt-1 font-medium break-all"
              >
                <Link className="w-3 h-3 flex-shrink-0" />
                {post.originalUrl}
              </a>
            </div>
          </div>

          {/* Drag & Drop Upload Zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              "border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-300 relative flex flex-col items-center justify-center min-h-[180px]",
              isDragging 
                ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20" 
                : "border-slate-200 dark:border-slate-800 hover:border-indigo-400 hover:bg-slate-50/50 dark:hover:bg-slate-800/20",
              previewUrl && "border-solid border-slate-200 dark:border-slate-800 p-2"
            )}
          >
            <input 
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".jpg,.jpeg,.png"
              className="hidden"
            />

            {previewUrl ? (
              <div className="relative w-full h-48 rounded-xl overflow-hidden group">
                <img 
                  src={previewUrl} 
                  alt="Screenshot preview" 
                  className="w-full h-full object-contain bg-slate-50 dark:bg-slate-900"
                />
                <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button
                    type="button"
                    onClick={handleRemoveFile}
                    className="p-2 bg-red-600 text-white rounded-full hover:bg-red-500 transition-colors shadow-lg scale-90 group-hover:scale-100 duration-200"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-full text-indigo-600 dark:text-indigo-400 inline-block">
                  <UploadCloud className="w-8 h-8 mx-auto" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    Kéo thả ảnh hoặc click để chọn file
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Chấp nhận file .jpg, .jpeg, .png (Tối đa 5MB)
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Responsibility Checklist */}
          <div className="space-y-4">
            <label className="flex items-start gap-3.5 cursor-pointer group select-none">
              <input
                type="checkbox"
                checked={isChecked1}
                onChange={(e) => setIsChecked1(e.target.checked)}
                className="sr-only"
              />
              <div className={cn(
                "w-5.5 h-5.5 rounded-md border flex items-center justify-center flex-shrink-0 transition-all duration-200 mt-0.5",
                isChecked1 
                  ? "bg-indigo-600 border-indigo-600 text-white" 
                  : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 group-hover:border-indigo-400"
              )}>
                {isChecked1 && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </div>
              <span className="text-sm text-slate-600 dark:text-slate-300 leading-snug">
                Tôi cam đoan đã chia sẻ bài viết này ở chế độ công khai trên trang cá nhân.
              </span>
            </label>

            <label className="flex items-start gap-3.5 cursor-pointer group select-none">
              <input
                type="checkbox"
                checked={isChecked2}
                onChange={(e) => setIsChecked2(e.target.checked)}
                className="sr-only"
              />
              <div className={cn(
                "w-5.5 h-5.5 rounded-md border flex items-center justify-center flex-shrink-0 transition-all duration-200 mt-0.5",
                isChecked2 
                  ? "bg-indigo-600 border-indigo-600 text-white" 
                  : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 group-hover:border-indigo-400"
              )}>
                {isChecked2 && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </div>
              <span className="text-sm text-slate-600 dark:text-slate-300 leading-snug">
                Tôi đồng ý để hệ thống kiểm tra dữ liệu hình ảnh (EXIF/Metadata) phục vụ mục đích minh bạch hóa.
              </span>
            </label>
          </div>

          {/* Footer Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-5 py-3 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700/80 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={!isFormValid}
              className={cn(
                "flex-[2] flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-white transition-all duration-200 shadow-md",
                isFormValid 
                  ? "bg-indigo-600 hover:bg-indigo-500 shadow-indigo-200 dark:shadow-none cursor-pointer" 
                  : "bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed shadow-none"
              )}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Đang gửi...
                </>
              ) : (
                "Gửi Bằng Chứng"
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
