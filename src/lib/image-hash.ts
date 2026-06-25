/**
 * Perceptual hash (Average Hash — aHash) dùng sharp.
 *
 * Nguyên lý:
 *  - Scale ảnh xuống 8×8 greyscale → 64 pixels
 *  - So sánh mỗi pixel với giá trị trung bình → chuỗi 64 bit
 *  - Encode thành hex 16 ký tự
 *
 * Hamming distance ≤ 8 → ảnh rất giống nhau / trùng lặp.
 */

import sharp from "sharp";

/**
 * Tính Average Hash của ảnh từ Buffer.
 * Trả về null nếu ảnh không đọc được (bỏ qua lỗi nhẹ, không block flow).
 */
export async function computeAHash(buffer: Buffer): Promise<string | null> {
  try {
    const { data } = await sharp(buffer)
      .resize(8, 8, { fit: "fill" })
      .greyscale()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const pixels = Array.from(data as Uint8Array);
    const avg = pixels.reduce((s, v) => s + v, 0) / 64;

    // 64 bits: 1 nếu pixel >= avg, 0 nếu không
    let bits = "";
    for (let i = 0; i < 64; i++) {
      bits += pixels[i] >= avg ? "1" : "0";
    }

    // BigInt parse nhị phân rồi ra hex 16 ký tự
    return BigInt("0b" + bits)
      .toString(16)
      .padStart(16, "0");
  } catch {
    return null;
  }
}

/**
 * Hamming distance giữa 2 hex hash.
 * Thấp hơn = giống nhau hơn. Threshold thực tế: ≤ 8 là trùng lặp.
 */
export function hammingDistance(a: string, b: string): number {
  if (a.length !== b.length) return 64;
  try {
    let xor = BigInt("0x" + a) ^ BigInt("0x" + b);
    let dist = 0;
    while (xor > 0n) {
      dist += Number(xor & 1n);
      xor >>= 1n;
    }
    return dist;
  } catch {
    return 64;
  }
}

export const PHASH_DUPLICATE_THRESHOLD = 8;
