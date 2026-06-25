# Kế Hoạch Tích Hợp SEO Tool (Rank Math) Vào Next.js Project

## 1. Tổng Quan

### 1.1. SEO-tool-for-rank-math-master (Nguồn)

Một ứng dụng Python FastAPI với 3 công cụ SEO chính, sử dụng **OpenAI API** (tương thích Ollama/Groq):

| Công cụ | Mô tả | Prompt |
|---|---|---|
| **Article Writer** | Viết bài blog chuẩn SEO (HTML) với từ khóa, giọng văn, cấu trúc heading | `PROMPT_ARTICLE_WRITER` |
| **Table Generator** | Chuyển thông số thô thành bảng HTML WordPress | `PROMPT_TABLE_GENERATOR` |
| **Meta Tags Generator** | Tạo Title & Meta Description chuẩn SEO, preview Google | `PROMPT_META_GENERATOR` |

Cấu trúc thư mục gốc:

```
SEO-tool-for-rank-math-master/
├── main.py                  # FastAPI routes (/, /article, /table, /meta)
├── prompts.py               # 3 prompt templates
├── services/
│   └── openai_service.py    # OpenAI client, 3 handler functions
├── templates/
│   ├── base.html            # Layout chung (Tailwind CDN, glass morphism)
│   ├── index.html           # Dashboard với 3 feature cards
│   ├── article_writer.html  # Form + output article writer
│   ├── table_generator.html # Form + output + preview table
│   └── meta_generator.html  # Form + Google preview + character count
├── requirements.txt
├── vercel.json
└── .env
```

### 1.2. Next.js Project Hiện Tại (Đích)

- **Route**: `/seo-tools` (public, auth-guarded)
- **Component**: [seo-tools-client.tsx](src/app/seo-tools/seo-tools-client.tsx)
- **6 tool cards** đã có UI:
  - ✅ **Meta Analyzer** (available) — chỉ URL scraping, chưa hoàn chỉnh
  - ⏳ **Keyword Density** (soon)
  - ⏳ **Heading Structure** (soon)
  - ⏳ **Page Speed Insights** (soon)
  - ⏳ **Sitemap Generator** (soon)
  - ⏳ **Link Checker** (soon)
- **API liên quan**: `/api/admin/og-scraper` (OG tags scraping, admin-only)

---

## 2. Phân Tích Tương Quan

### 2.1. So sánh tính năng

| Tính năng từ Python App | Đã có trong Next.js? | Ghi chú |
|---|---|---|
| SEO Article Writer (AI) | ❌ Chưa | Cần API + component mới |
| HTML Table Generator (AI) | ❌ Chưa | Cần API + component mới |
| Meta Tags Generator (AI) | ⚠️ Meta Analyzer chỉ scrape URL, không *generate* | Cần mở rộng |
| Google Preview | ❌ Chưa | Cần component mới |
| Copy HTML/Text | ❌ Chưa | Cần thêm vào output |

### 2.2. Kiến trúc AI

Python app dùng OpenAI SDK (compatible). Next.js có thể dùng trực tiếp `openai` npm package ở server-side API routes.

```python
# Python (current)
client = OpenAI(api_key=api_key, base_url=base_url)
response = client.chat.completions.create(model=..., messages=[...])
```

```typescript
// Next.js (target)
import OpenAI from 'openai';
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const response = await openai.chat.completions.create({ model: ..., messages: [...] });
```

### 2.3. Prompt hiện tại (cần giữ nguyên logic)

3 prompts trong `prompts.py`:
- `PROMPT_ARTICLE_WRITER` — viết blog HTML, yêu cầu heading, keyword density ~1.5-2%, >=800 từ
- `PROMPT_TABLE_GENERATOR` — chuyển text thô → `<table>` với class WordPress
- `PROMPT_META_GENERATOR` — tạo title (50-60 ký tự) + description (150-160 ký tự), trả về JSON

---

## 3. Kiến Trúc Tích Hợp Đề Xuất

### 3.1. Sơ đồ luồng dữ liệu

```
User (Browser)                     Next.js Server                     OpenAI API
     │                                  │                                │
     │  POST /api/seo/article           │                                │
     │  { topic, keywords, tone } ──────▶                                │
     │                                  │  POST /v1/chat/completions     │
     │                                  │  [PROMPT_ARTICLE_WRITER] ──────▶
     │                                  │                                │
     │                                  │  ◀────── HTML content ────────│
     │  ◀── { content: "..." } ────────│                                │
     │                                  │                                │
     │  POST /api/seo/meta              │                                │
     │  { topic, keywords } ────────────▶                                │
     │                                  │  POST /v1/chat/completions     │
     │                                  │  [PROMPT_META_GENERATOR] ──────▶
     │                                  │                                │
     │                                  │  ◀────── JSON {title, desc} ──│
     │  ◀── { title, description } ────│                                │
```

### 3.2. Cấu trúc thư mục mới

```
src/
├── app/
│   ├── api/
│   │   └── seo/
│   │       ├── article/route.ts       # POST: generate SEO article
│   │       ├── table/route.ts         # POST: generate HTML table
│   │       └── meta/route.ts          # POST: generate meta tags
│   ├── seo-tools/
│   │   ├── page.tsx                   # (giữ nguyên)
│   │   └── seo-tools-client.tsx       # SỬA: thêm workspace cho từng tool
├── components/
│   └── modules/
│       └── seo-tools/
│           ├── article-writer.tsx      # MỚI: form + output article
│           ├── table-generator.tsx     # MỚI: form + output + preview table
│           ├── meta-generator.tsx      # MỚI: form + Google preview
│           └── meta-analyzer.tsx       # MỚI: tách từ seo-tools-client (optional)
├── lib/
│   └── seo-prompts.ts                 # MỚI: port prompts.py sang TypeScript
```

### 3.3. API Endpoints

#### `POST /api/seo/article`

**Request:**
```json
{
  "topic": "Máy bơm nước Panasonic 200W",
  "keywords": "máy bơm nước, công suất 200W, giá rẻ",
  "tone": "Chuyên nghiệp"
}
```

**Response:**
```json
{
  "content": "<h2>Giới thiệu...</h2><p>...</p>"
}
```

#### `POST /api/seo/table`

**Request:**
```json
{
  "inputText": "Công suất: 200W\nLưu lượng: 30 lít/phút\nĐiện áp: 220V"
}
```

**Response:**
```json
{
  "html": "<table class=\"wp-table\">..."
}
```

#### `POST /api/seo/meta`

**Request:**
```json
{
  "topic": "Giới thiệu dòng máy bơm Panasonic GP-200JXK 200W",
  "keywords": "máy bơm panasonic 200w, máy bơm gia đình"
}
```

**Response:**
```json
{
  "title": "Máy bơm Panasonic 200W Chính Hãng | Giá Tốt Nhất | Song Phương",
  "description": "Máy bơm nước Panasonic 200W công suất mạnh mẽ, vận hành êm ái. Bảo hành chính hãng 12 tháng. Giao hàng toàn quốc. Liên hệ ngay!"
}
```

---

## 4. Kế Hoạch Triển Khai Chi Tiết

### Phase 1: Nền Tảng (1-2 ngày)

| Bước | File | Mô tả |
|---|---|---|
| 1.1 | [seo-prompts.ts](src/lib/seo-prompts.ts) | Port 3 prompts từ Python → TypeScript template literals, giữ nguyên logic |
| 1.2 | [meta/route.ts](src/app/api/seo/meta/route.ts) | API route meta generator, gọi OpenAI |
| 1.3 | [article/route.ts](src/app/api/seo/article/route.ts) | API route article writer, gọi OpenAI |
| 1.4 | [table/route.ts](src/app/api/seo/table/route.ts) | API route table generator, gọi OpenAI |
| 1.5 | `.env.local` | Thêm `OPENAI_API_KEY`, `OPENAI_BASE_URL` (optional), `AI_MODEL_NAME` |

### Phase 2: Components UI (2-3 ngày)

| Bước | File | Mô tả |
|---|---|---|
| 2.1 | [meta-generator.tsx](src/components/modules/seo-tools/meta-generator.tsx) | Form topic+keywords + Google Preview (giống meta_generator.html), copy button |
| 2.2 | [article-writer.tsx](src/components/modules/seo-tools/article-writer.tsx) | Form topic+keywords+tone + output preview (code), copy HTML |
| 2.3 | [table-generator.tsx](src/components/modules/seo-tools/table-generator.tsx) | Form textarea + output code + rendered preview HTML |
| 2.4 | [seo-tools-client.tsx](src/app/seo-tools/seo-tools-client.tsx) | SỬA: thêm workspace cho "meta-generator", "article", "table" tool cards |

### Phase 3: Hoàn Thiện (1-2 ngày)

| Bước | Mô tả |
|---|---|
| 3.1 | Loading skeleton cho từng tool |
| 3.2 | Error handling (network error, AI error, validation) |
| 3.3 | Toast thông báo thành công / thất bại |
| 3.4 | Kiểm tra responsive UI |

---

## 5. Chi Tiết Implement

### 5.1. Port Prompts (seo-prompts.ts)

```typescript
// src/lib/seo-prompts.ts
export const PROMPT_ARTICLE_WRITER = `
Bạn là một chuyên gia SEO hàng đầu của Song Phương. Nhiệm vụ của bạn là viết một bài blog chuẩn SEO dựa trên các thông tin sau:
- Chủ đề: {topic}
- Từ khóa chính: {keywords}
- Giọng văn: {tone}

Yêu cầu bài viết:
1. Định dạng HTML (chỉ phần body content, không cần head/body tags).
2. Sử dụng thẻ <h2>, <h3> hợp lý để tạo cấu trúc rõ ràng.
3. Mật độ từ khóa chính khoảng 1.5-2%.
4. Độ dài tối thiểu 800 từ.
5. Nội dung hấp dẫn, cung cấp giá trị thực sự cho người đọc.
6. Tối ưu hóa cho công cụ tìm kiếm nhưng vẫn tự nhiên.
7. Sử dụng thẻ <p> cho đoạn văn, <ul>/<ol> cho danh sách.
8. Đảm bảo từ khóa xuất hiện trong 100 từ đầu tiên.
`;

export function buildArticlePrompt(topic: string, keywords: string, tone: string) {
  return PROMPT_ARTICLE_WRITER.replace('{topic}', topic)
    .replace('{keywords}', keywords)
    .replace('{tone}', tone);
}
```

### 5.2. API Route Mẫu (meta/route.ts)

```typescript
// src/app/api/seo/meta/route.ts
import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { buildMetaPrompt } from '@/lib/seo-prompts';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const model = process.env.AI_MODEL_NAME || 'gpt-4o';

export async function POST(req: Request) {
  try {
    const { topic, keywords } = await req.json();
    if (!topic || !keywords) {
      return NextResponse.json({ error: 'Thiếu thông tin' }, { status: 400 });
    }

    const prompt = buildMetaPrompt(topic, keywords);
    const response = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: 'Bạn là chuyên gia SEO On-page.' },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 500,
    });

    const data = JSON.parse(response.choices[0].message.content ?? '{}');
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

### 5.3. Component Meta Generator

Dựa trên `meta_generator.html`, component mới cần có:
- Form input: topic (textarea), keywords (input)
- Button submit với loading state
- Output:
  - **Google Preview card** (title clickable, URL, description) — giống hệt bản gốc
  - **Title Tag** input readonly + character count (xanh nếu ≤60, đỏ nếu >60) + copy button
  - **Meta Description** textarea readonly + character count (xanh nếu ≤160) + copy button

### 5.4. Component Article Writer

Dựa trên `article_writer.html`:
- Form input: topic (text), keywords (text), tone (select: Chuyên nghiệp / Thân thiện / Bán hàng)
- Output: `<pre>` hiển thị HTML code + copy button

### 5.5. Component Table Generator

Dựa trên `table_generator.html`:
- Form input: textarea lớn để dán thông số thô
- Output: `<pre>` code HTML + copy button
- **HTML Preview**: render thật bảng HTML bên dưới (dùng `dangerouslySetInnerHTML`)

### 5.6. Cập Nhật Tool Grid Trong seo-tools-client.tsx

Sửa tool definitions — thêm 3 tools mới thay thế/song song:

```typescript
const SEO_TOOLS = [
  // Giữ nguyên
  { id: 'meta-analyzer', title: 'Phân tích Meta Tags', status: 'available', ... },
  // THÊM mới
  { id: 'meta-generator', title: 'Tạo Meta Tags', status: 'available', ... },
  { id: 'article-writer', title: 'Viết Bài Chuẩn SEO', status: 'available', ... },
  { id: 'table-generator', title: 'Tạo Bảng Thông Số', status: 'available', ... },
  // Giữ nguyên "soon"
  { id: 'keyword-density', ..., status: 'soon' },
  { id: 'heading-structure', ..., status: 'soon' },
  { id: 'page-speed', ..., status: 'soon' },
  { id: 'sitemap', ..., status: 'soon' },
  { id: 'link-checker', ..., status: 'soon' },
];
```

Render workspace tương ứng theo `activeTool`:

```tsx
{activeTool === 'meta-analyzer' && <MetaAnalyzer ... />}
{activeTool === 'meta-generator' && <MetaGenerator />}
{activeTool === 'article-writer' && <ArticleWriter />}
{activeTool === 'table-generator' && <TableGenerator />}
```

---

## 6. Xử Lý Các Vấn Đề

### 6.1. Authentication

- SEO tools API routes **cần kiểm tra authentication** (giống các API khác)
- Dùng `auth()` từ NextAuth hoặc helper hiện có
- Python app không có auth → đây là điểm cải thiện

### 6.2. Rate Limiting

- Xem xét thêm rate limiting cho AI endpoints để tránh abuse
- Có thể dùng IP-based hoặc user-based rate limit

### 6.3. Error Handling

```python
# Python: mỗi hàm tự xử lý error riêng
generate_seo_article() → return error HTML string
generate_html_table() → return error HTML string
generate_meta_tags() → return {"error": "..."}
```

```typescript
// Next.js: centralized error handling
try {
  // call OpenAI
} catch (e) {
  return NextResponse.json({ error: 'AI service error' }, { status: 502 });
}
```

### 6.4. Loading State

Python app dùng form submit → full page reload.
Next.js cần:
- Loading spinner/skeleton cho từng tool
- Disable button khi đang xử lý
- Toast thông báo kết quả

### 6.5. Biến Môi Trường

| Variable | Mô tả | Required |
|---|---|---|
| `OPENAI_API_KEY` | API key OpenAI (hoặc Ollama/Groq) | ✅ |
| `OPENAI_BASE_URL` | Base URL (để trống nếu dùng OpenAI cloud) | ❌ |
| `AI_MODEL_NAME` | Model name, mặc định `gpt-4o` | ❌ |

---

## 7. Lợi Ích Khi Tích Hợp

| Lợi ích | Mô tả |
|---|---|
| **UI thống nhất** | Dùng chung design system của dự án thay vì Tailwind CDN riêng |
| **Auth tập trung** | Bảo vệ AI endpoints bằng auth hiện có |
| **Không Python runtime** | Không cần maintain server Python riêng, tận dụng Next.js edge/server |
| **SEO Dashboard** | Tích hợp vào luồng công việc hiện tại (posts, analytics) |
| **Mở rộng dễ** | Thêm tool mới (keyword density, heading check) mà không cần codebase riêng |

---

## 8. Tổng Quan Timeline

```
Phase 1 (Nền tảng)     ████████░░░░░░░░░░    2 ngày
Phase 2 (Components)    ██████████████░░░░    3 ngày
Phase 3 (Hoàn thiện)    ██████████████████    2 ngày
                        └───────────────────▶
                        7 ngày (ước lượng)
```

---

## 9. File port từ Python → Next.js

| Python File | Next.js Destination | Ghi chú |
|---|---|---|
| `prompts.py` | [src/lib/seo-prompts.ts](src/lib/seo-prompts.ts) | Port y nguyên prompt + helper build |
| `services/openai_service.py` | [src/app/api/seo/*/route.ts](src/app/api/seo/) | 3 file riêng, xử lý auth + AI call |
| `templates/article_writer.html` | [src/components/modules/seo-tools/article-writer.tsx](src/components/modules/seo-tools/) | React component |
| `templates/meta_generator.html` | [src/components/modules/seo-tools/meta-generator.tsx](src/components/modules/seo-tools/) | React component |
| `templates/table_generator.html` | [src/components/modules/seo-tools/table-generator.tsx](src/components/modules/seo-tools/) | React component |
| `templates/index.html` | Đã có trong [seo-tools-client.tsx](src/app/seo-tools/seo-tools-client.tsx) | Chỉ cần cập nhật tool grid |
| `templates/base.html` | Không cần | Dùng layout hiện tại của dự án |
| `main.py` | Không cần | Routes thay bằng Next.js App Router |

---

## 10. Rủi Ro & Giảm Thiểu

| Rủi ro | Mức | Giải pháp |
|---|---|---|
| OpenAI API key cost | Thấp | Dùng model gpt-4o-mini cho table/meta, caching response |
| AI response time > 10s | Trung bình | Thêm loading skeleton, streaming option (optional) |
| Token limit với article (>800 words) | Thấp | max_tokens=4000, kiểm tra response.truncated |
| Prompt injection | Thấp | Validate input, không cho HTML injection |
