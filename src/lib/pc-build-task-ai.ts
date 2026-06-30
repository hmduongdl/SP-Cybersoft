import { aibox, MODEL_CHAT_FLASH } from "@/lib/aibox";

export interface GeneratedPcBuildTask {
  customer_need: string;
  max_budget: number;
  requirements: string;
}

export async function generateDailyPcBuildTasks(count = 3): Promise<GeneratedPcBuildTask[]> {
  try {
    const response = await aibox.chat.completions.create({
      model: MODEL_CHAT_FLASH,
      temperature: 0.8,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `Bạn là AI hỗ trợ ra đề bài thực hành Build PC cho nhân viên.
Hãy tạo ${count} đề bài đa dạng với ngân sách khác nhau (khoảng 10 - 50 triệu VND).
Các đề bài cần đơn giản, thực tế:
- Nhu cầu khách hàng (customer_need): Nhu cầu sử dụng chung như chơi game, thiết kế đồ họa, văn phòng nhẹ, lập trình, học tập...
- Ngân sách tối đa (max_budget): Số tiền tối đa tính bằng VND.
- Yêu cầu cấu hình khác (requirements): Các thông số cấu hình cơ bản, ví dụ: CPU Intel Core i3/i5/i7 hoặc AMD Ryzen 3/5/7, dung lượng RAM (8GB, 16GB hay 32GB), dung lượng ổ cứng SSD (256GB, 512GB hay 1TB), có cần card đồ họa rời (VGA) hay không.
BẮT BUỘC: KHÔNG ĐƯỢC chỉ định chi tiết mã cụ thể hay tên hãng sản xuất của từng linh kiện (như Gigabyte, Asus, MSI, Corsair...). Chỉ đưa ra thông số kỹ thuật tối thiểu hoặc định hướng phân khúc chung.

Trả về định dạng JSON sau:
{
  "tasks": [
    {
      "customer_need": "...",
      "max_budget": 15000000,
      "requirements": "..."
    }
  ]
}`,
        },
      ],
    });

    const raw = response.choices[0]?.message?.content || "";
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed.tasks) && parsed.tasks.length > 0) {
      return parsed.tasks.slice(0, count);
    }
  } catch (err) {
    console.error("[pc-build-task-ai]", err);
  }

  return [];
}
