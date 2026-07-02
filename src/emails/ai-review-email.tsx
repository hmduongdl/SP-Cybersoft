import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

interface AiReviewEmailProps {
  userName?: string | null;
  itemTitle: string;
  itemType: string;
  statusLabel: string;
  analysis: string;
  reviewUrl: string;
  extractedTitle?: string | null;
}

export function AiReviewEmail({
  userName,
  itemTitle,
  itemType,
  statusLabel,
  analysis,
  reviewUrl,
  extractedTitle,
}: AiReviewEmailProps) {
  return (
    <Html lang="vi">
      <Head />
      <Preview>AI đã phân tích xong bài: {itemTitle}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Section style={styles.header}>
            <Text style={styles.eyebrow}>SP-Cybersoft</Text>
            <Heading as="h1" style={styles.heading}>
              AI đã duyệt xong bài của bạn
            </Heading>
          </Section>

          <Section style={styles.content}>
            <Text style={styles.greeting}>Chào {userName || "bạn"},</Text>
            <Text style={styles.message}>
              Hệ thống AI vừa hoàn tất phân tích bài <strong>{itemTitle}</strong>.
            </Text>

            <Section style={styles.summaryBox}>
              <Text style={styles.label}>Loại bài</Text>
              <Text style={styles.value}>{itemType}</Text>
              <Text style={styles.label}>Kết quả</Text>
              <Text style={styles.value}>{statusLabel}</Text>
              {extractedTitle ? (
                <>
                  <Text style={styles.label}>AI nhận diện bài viết</Text>
                  <Text style={styles.value}>{extractedTitle}</Text>
                </>
              ) : null}
              <Text style={styles.label}>Phân tích của AI</Text>
              <Text style={styles.analysis}>{analysis}</Text>
            </Section>

            <Button href={reviewUrl} style={styles.button}>
              Xem bài phân tích
            </Button>

            <Text style={styles.linkText}>Hoặc mở link này: {reviewUrl}</Text>
          </Section>

          <Hr style={styles.hr} />

          <Section style={styles.footer}>
            <Text style={styles.footerText}>
              Email được gửi tự động từ hệ thống <strong>SP-Cybersoft</strong>.
              <br />
              Vui lòng không trả lời trực tiếp email này.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const styles = {
  body: {
    margin: 0,
    padding: "24px 0",
    backgroundColor: "#f4f4f5",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  container: {
    width: "600px",
    maxWidth: "100%",
    overflow: "hidden",
    borderRadius: "12px",
    backgroundColor: "#ffffff",
    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
  },
  header: {
    padding: "32px 40px",
    backgroundColor: "#111827",
    textAlign: "center" as const,
  },
  eyebrow: {
    margin: "0 0 8px",
    color: "#93c5fd",
    fontSize: "13px",
    fontWeight: 700,
    letterSpacing: "0.02em",
  },
  heading: {
    margin: 0,
    color: "#ffffff",
    fontSize: "24px",
    fontWeight: 700,
    lineHeight: "1.3",
  },
  content: {
    padding: "32px 40px",
  },
  greeting: {
    margin: "0 0 12px",
    color: "#111827",
    fontSize: "16px",
    lineHeight: "1.6",
  },
  message: {
    margin: "0 0 20px",
    color: "#374151",
    fontSize: "16px",
    lineHeight: "1.6",
  },
  summaryBox: {
    margin: "0 0 24px",
    padding: "18px",
    borderRadius: "10px",
    backgroundColor: "#f9fafb",
    border: "1px solid #e5e7eb",
  },
  label: {
    margin: "0 0 4px",
    color: "#6b7280",
    fontSize: "12px",
    fontWeight: 700,
    textTransform: "uppercase" as const,
  },
  value: {
    margin: "0 0 14px",
    color: "#111827",
    fontSize: "15px",
    fontWeight: 700,
    lineHeight: "1.5",
  },
  analysis: {
    margin: 0,
    color: "#374151",
    fontSize: "14px",
    lineHeight: "1.6",
    whiteSpace: "pre-line" as const,
  },
  button: {
    display: "inline-block",
    padding: "12px 18px",
    borderRadius: "8px",
    backgroundColor: "#2563eb",
    color: "#ffffff",
    fontSize: "14px",
    fontWeight: 700,
    textDecoration: "none",
  },
  linkText: {
    margin: "16px 0 0",
    color: "#6b7280",
    fontSize: "12px",
    lineHeight: "1.5",
    wordBreak: "break-all" as const,
  },
  hr: {
    margin: 0,
    borderColor: "#e5e7eb",
  },
  footer: {
    padding: "20px 40px",
    backgroundColor: "#f9fafb",
    textAlign: "center" as const,
  },
  footerText: {
    margin: 0,
    color: "#9ca3af",
    fontSize: "13px",
    lineHeight: "1.5",
  },
};
