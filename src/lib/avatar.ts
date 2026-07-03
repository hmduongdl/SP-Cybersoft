export const DEFAULT_AVATAR_URL = "/images/default-avatar.jpg";

export function getAvatarUrl(src?: string | null) {
  return src && src.trim() ? src : DEFAULT_AVATAR_URL;
}
