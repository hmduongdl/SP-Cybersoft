"use client";

import React, { useState, useRef } from "react";
import { X, Facebook, UploadCloud, Loader2, CheckCircle2, Image as ImageIcon } from "lucide-react";
import { useFacebookSDK, sharePost } from "@/hooks/useFacebookSDK";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Post = {
  id: string;
  title: string;
  description: string;
  originalUrl: string;
  thumbnailUrl?: string | null;
  scheduledAt: string;
  status: string;
};

type ModalProps = {
  post: Post;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export function PostCheckinModal({ post, isOpen, onClose, onSuccess }: ModalProps) {
  const { loaded } = useFacebookSDK();
  const [isAutoChecking, setIsAutoChecking] = useState(false);
  const [isManualUploading, setIsManualUploading] = useState(false);
  
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // AUTO FLOW
  const handleAutoCheckin = async () => {
    try {
      setIsAutoChecking(true);
      if (!loaded) throw new Error("Facebook SDK chưa được tải xong. Vui lòng thử lại sau giây lát.");
      
      // Open Share Dialog
      await sharePost(post.originalUrl);
      
      toast.loading("Đang tự động xác minh lượt chia sẻ...", { id: "fb-verify" });
      
      const res = await fetch("/api/submissions/auto-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: post.id })
      });
      
      if (!res.ok) throw new Error("Lỗi cập nhật trên server");
      
      toast.success("Xác minh thành công rực rỡ! Bạn đã check-in thành công.", { id: "fb-verify" });
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Hành động chia sẻ bị hủy hoặc có lỗi xảy ra.", { id: "fb-verify" });
    } finally {
      setIsAutoChecking(false);
    }
  };

  // MANUAL FLOW
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const processFile = (file: File) => {
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      toast.error("Chỉ hỗ trợ định dạng JPG hoặc PNG.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Dung lượng ảnh phải dưới 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);
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
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleManualSubmit = async () => {
    if (!previewImage) return;
    try {
      setIsManualUploading(true);
      toast.loading("Đang tải ảnh lên...", { id: "manual-upload" });
      
      const res = await fetch("/api/submissions/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: post.id, base64Image: previewImage })
      });

      if (!res.ok) throw new Error("Lỗi cập nhật trên server");
      
      toast.success("Đã gửi minh chứng thành công! Vui lòng chờ Admin duyệt.", { id: "manual-upload" });
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Lỗi tải ảnh lên. Vui lòng thử lại.", { id: "manual-upload" });
    } finally {
      setIsManualUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
          <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Xác minh Check-in</h3>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[80vh] space-y-8">
          
          {/* Post Info */}
          <div className="flex gap-4">
            <div className="w-24 h-24 shrink-0 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              {post.thumbnailUrl ? (
                <img src={post.thumbnailUrl} alt={post.title} className="w-full h-full object-cover" />
              ) : (
                <ImageIcon className="w-8 h-8 text-slate-400" />
              )}
            </div>
            <div className="flex flex-col gap-1">
              <h4 className="text-lg font-bold text-slate-900 dark:text-white line-clamp-2">{post.title}</h4>
              <a href={post.originalUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-500 hover:text-indigo-600 underline line-clamp-1 break-all">
                {post.originalUrl}
              </a>
              {post.description && (
                <p className="text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-2 rounded-lg mt-2 border border-amber-100 dark:border-amber-800/30">
                  <span className="font-semibold">Lời nhắn:</span> {post.description}
                </p>
              )}
            </div>
          </div>

          <div className="w-full h-px bg-slate-100 dark:bg-slate-800" />

          {/* Action Buttons */}
          <div className="grid md:grid-cols-2 gap-6">
            
            {/* Auto FB Checkin */}
            <div className="flex flex-col gap-4">
              <div className="space-y-1">
                <h5 className="font-semibold text-slate-800 dark:text-slate-200">1. Chia sẻ tự động</h5>
                <p className="text-xs text-slate-500">Hệ thống sẽ bật popup chia sẻ và tự động kiểm tra.</p>
              </div>
              <button
                onClick={handleAutoCheckin}
                disabled={isAutoChecking || isManualUploading}
                className="w-full py-4 px-6 rounded-2xl font-semibold flex items-center justify-center gap-3 text-white transition-all hover:-translate-y-0.5 shadow-lg shadow-blue-500/30 bg-[#1877F2] hover:bg-[#166FE5] disabled:opacity-50 disabled:hover:translate-y-0"
              >
                {isAutoChecking ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Facebook className="w-6 h-6 fill-white" />
                )}
                Chia sẻ & Tự động Duyệt
              </button>
            </div>

            {/* Manual Upload Checkin */}
            <div className="flex flex-col gap-4">
              <div className="space-y-1">
                <h5 className="font-semibold text-slate-800 dark:text-slate-200">2. Hoặc tải lên thủ công</h5>
                <p className="text-xs text-slate-500">Nếu nút tự động lỗi, hãy tải ảnh chụp màn hình.</p>
              </div>
              
              {!previewImage ? (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    "w-full h-32 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors group",
                    isDragging ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20" : "border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:border-indigo-400"
                  )}
                >
                  <UploadCloud className="w-8 h-8 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Nhấn chọn ảnh hoặc Kéo thả</span>
                  <span className="text-xs text-slate-400">JPG, PNG (Tối đa 5MB)</span>
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/jpeg, image/png" onChange={handleFileChange} />
                </div>
              ) : (
                <div className="relative w-full h-32 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-100 group">
                  <img src={previewImage} alt="Preview" className="w-full h-full object-contain" />
                  <button
                    onClick={() => setPreviewImage(null)}
                    className="absolute top-2 right-2 bg-black/50 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <div className="absolute inset-0 border-2 border-indigo-500 rounded-2xl pointer-events-none" />
                </div>
              )}

              {previewImage && (
                <button
                  onClick={handleManualSubmit}
                  disabled={isAutoChecking || isManualUploading}
                  className="w-full py-3 px-4 rounded-xl font-semibold flex items-center justify-center gap-2 text-white bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 transition-all disabled:opacity-50 shadow-md"
                >
                  {isManualUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                  Gửi xác minh thủ công
                </button>
              )}
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
