"use client";

import { useEffect, useState } from "react";

const FB_SDK_URL = "https://connect.facebook.net/vi_VN/sdk.js";
const FB_SDK_ID = "facebook-jssdk";

export function useFacebookSDK() {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check if SDK is already loaded on the client side
    if (window.FB) {
      setLoaded(true);
      return;
    }

    // Save previous asynchronous initializations if any
    const prevInit = window.fbAsyncInit;

    // Configure asynchronous init callback called when SDK script executes
    window.fbAsyncInit = function () {
      if (prevInit) prevInit();

      const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || "";
      if (!appId) {
        console.error(
          "Facebook SDK Error: NEXT_PUBLIC_FACEBOOK_APP_ID is not defined. " +
          "Please verify your environment variables on Vercel or in your local environment."
        );
      }
      window.FB.init({
        appId: appId,
        cookie: true,
        xfbml: true,
        version: "v18.0", // version API tối thiểu v18.0 trở lên
      });
      setLoaded(true);
    };

    // If SDK script tag already exists in HTML document, avoid duplicate script tag injection
    if (document.getElementById(FB_SDK_ID)) {
      return;
    }

    // Load asynchronously (non-blocking)
    const script = document.createElement("script");
    script.id = FB_SDK_ID;
    script.src = FB_SDK_URL;
    script.async = true;
    script.defer = true;
    script.crossOrigin = "anonymous";
    script.onerror = () => {
      setError(new Error("Failed to load Facebook JavaScript SDK."));
    };

    document.body.appendChild(script);
  }, []);

  return { loaded, error };
}

/**
 * Hàm tiện ích sharePost kích hoạt Share Dialog popup của Facebook SDK.
 * @param url Đường dẫn bài viết cần chia sẻ.
 * @returns Promise trả về phản hồi từ Facebook SDK, hoặc reject nếu có lỗi/popup bị chặn/hủy bỏ.
 */
export function sharePost(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      return reject(new Error("Facebook SDK can only be used on client-side."));
    }

    if (!window.FB) {
      return reject(new Error("Facebook JavaScript SDK has not loaded yet."));
    }

    window.FB.ui(
      {
        method: "share",
        href: url,
      },
      (response) => {
        // Reject nếu phản hồi không xác định, có mã lỗi hoặc tin nhắn lỗi từ popup
        if (!response || response.error_message || response.error_code) {
          reject(
            new Error(
              response?.error_message || "Hành động chia sẻ bị hủy bỏ hoặc popup bị chặn."
            )
          );
        } else {
          resolve(response);
        }
      }
    );
  });
}
