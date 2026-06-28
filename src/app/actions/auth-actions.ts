"use server";

import { signIn } from "@/auth";
import { AuthError } from "next-auth";
import { isRedirectError } from "next/dist/client/components/redirect-error";

export interface AuthState {
  error?: string;
  success?: boolean;
}

export async function authenticate(
  prevState: AuthState | null | undefined,
  formData: FormData
): Promise<AuthState> {
  try {
    const username = (formData.get("username") || formData.get("email")) as string;
    const password = formData.get("password") as string;

    if (!username || !password) {
      return {
        error: "Vui lòng nhập đầy đủ thông tin đăng nhập.",
      };
    }

    await signIn("credentials", {
      username: username.trim(),
      password: password,
      redirectTo: "/",
    });

    return { success: true };
  } catch (error: any) {
    // We MUST re-throw the redirect error so Next.js can handle the redirect
    if (isRedirectError(error)) {
      throw error;
    }

     // Check for locked account first
    if (error.message === "ACCOUNT_LOCKED") {
      return { error: "Tài khoản của bạn đã bị khoá. Vui lòng liên hệ quản trị viên để được hỗ trợ." };
    }

    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { error: "Tên đăng nhập hoặc mật khẩu không chính xác!" };
        default:
          return { error: "Đã xảy ra lỗi hệ thống, vui lòng thử lại sau." };
      }
    }

    // Fallback error checks
    if (error.type === "CredentialsSignin" || error.message?.includes("CredentialsSignin")) {
      return { error: "Tên đăng nhập hoặc mật khẩu không chính xác!" };
    }

    console.error("Login error:", error);
    return {
      error: "Đã xảy ra lỗi hệ thống, vui lòng thử lại sau.",
    };
  }
}
