import { aibox, MODEL_CHAT_FLASH } from "@/lib/aibox";

export interface GeneratedExercise {
  title: string;
  description: string;
  requirements: {
    budget: number;
    useCase: string;
    constraints: string[];
    hints: string[];
  };
  difficulty: "easy" | "medium" | "hard";
}

export async function generateDailyExercises(count = 3): Promise<GeneratedExercise[]> {
  try {
    const response = await aibox.chat.completions.create({
      model: MODEL_CHAT_FLASH,
      temperature: 0.8,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `Bạn là giảng viên hướng dẫn Build PC. Hãy sinh bài tập thực hành lắp PC.
Hãy tạo đúng ${count} bài tập đa dạng với ngân sách khác nhau (khoảng 8 - 50 triệu VND).
Các bài tập cần đơn giản, thực tế:
- Tiêu đề (title), mô tả ngắn (description)
- Yêu cầu kỹ thuật: ngân sách (budget), mục đích sử dụng (useCase), các ràng buộc cấu hình tối thiểu (constraints) như loại CPU (i3/i5/i7), dung lượng RAM (8GB/16GB/32GB), dung lượng SSD (256GB/512GB/1TB), có cần VGA rời hay không.
- Gợi ý thêm (hints)

BẮT BUỘC: KHÔNG ĐƯỢC chỉ định chi tiết mã cụ thể hay tên hãng sản xuất của từng linh kiện (như Gigabyte, Asus, MSI, Corsair...). Chỉ đưa ra thông số kỹ thuật tối thiểu hoặc định hướng phân khúc chung.

Trả về định dạng JSON sau:
{
  "exercises": [
    {
      "title": "...",
      "description": "...",
      "requirements": {
        "budget": 15000000,
        "useCase": "...",
        "constraints": ["...", "..."],
        "hints": ["...", "..."]
      },
      "difficulty": "easy"
    }
  ]
}`,
        },
      ],
    });

    const raw = response.choices[0]?.message?.content || "";
    const parsed = JSON.parse(raw);
    const exercises = parsed.exercises as GeneratedExercise[];
    if (Array.isArray(exercises) && exercises.length > 0) {
      return exercises.slice(0, count);
    }
  } catch (err) {
    console.error("[pc-exercise-ai] generation failed:", err);
  }

  return [];
}

export async function reviewPcSubmission(params: {
  exerciseTitle: string;
  exerciseDescription: string;
  partsAnswer: unknown;
  explanation: string;
}): Promise<{ score: number; feedback: string }> {
  try {
    const response = await aibox.chat.completions.create({
      model: MODEL_CHAT_FLASH,
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `Bạn là giám khảo chấm bài tập Build PC. Bạn sẽ đánh giá cấu hình PC do nhân viên tự chọn dựa trên đề bài đã cho.
Đánh giá các khía cạnh:
1. Tổng tiền có vượt ngân sách của đề bài không.
2. Các linh kiện tự chọn (CPU, RAM, SSD, VGA...) có đáp ứng đúng ràng buộc tối thiểu và nhu cầu của đề bài hay không.
3. Độ tương thích cơ bản (ví dụ: Mainboard hỗ trợ socket của CPU đó, nguồn đủ công suất).
Trả về JSON: { "score": number (0-100), "feedback": "nhận xét ngắn gọn bằng tiếng Việt giải thích điểm số" }`,
        },
        {
          role: "user",
          content: `Đề bài: ${params.exerciseTitle}\n${params.exerciseDescription}\n\nBài làm:\nCấu hình linh kiện: ${JSON.stringify(params.partsAnswer)}\nGiải thích: ${params.explanation}`,
        },
      ],
    });

    const raw = response.choices[0]?.message?.content || "";
    const parsed = JSON.parse(raw);
    return {
      score: typeof parsed.score === "number" ? parsed.score : 0,
      feedback: typeof parsed.feedback === "string" ? parsed.feedback : "",
    };
  } catch (err) {
    console.error("[pc-exercise-ai] review failed:", err);
    return { score: 0, feedback: "Lỗi hệ thống khi chấm bài tự động." };
  }
}
