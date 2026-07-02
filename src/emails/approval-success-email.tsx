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

export interface ApprovalSuccessEmailItem {
  title: string;
  itemType: string;
  reviewUrl: string;
  analysis?: string | null;
}

interface ApprovalSuccessEmailProps {
  userName?: string | null;
  items: ApprovalSuccessEmailItem[];
}

export function ApprovalSuccessEmail({ userName, items }: ApprovalSuccessEmailProps) {
  const safeItems = items.length > 0 ? items : [{ title: "Bài nộp", itemType: "Bài duyệt", reviewUrl: "#" }];
  const isSingle = safeItems.length === 1;
  const firstItem = safeItems[0];
  const preview = isSingle
    ? `Bài "${firstItem.title}" đã được duyệt thành công`
    : `${safeItems.length} bài của bạn đã được duyệt thành công`;

  return (
    <Html lang="vi">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Section style={styles.header}>
            <Text style={styles.logoMark}>S</Text>
            <Text style={styles.brand}>SP Cybersoft</Text>
            <Text style={styles.headerMeta}>Hệ thống duyệt bài</Text>
          </Section>

          <Section style={styles.hero}>
            <Text style={styles.badge}>✓ Đạt</Text>
            <Heading as="h1" style={styles.heading}>
              {isSingle ? "Bài của bạn đã được duyệt thành công" : "Các bài của bạn đã được duyệt thành công"}
            </Heading>
          </Section>

          <Section style={styles.content}>
            <Text style={styles.greeting}>
              Chào <strong style={styles.strong}>{userName || "bạn"}</strong>,
            </Text>
            <Text style={styles.message}>
              {isSingle ? (
                <>
                  Đề bài <strong style={styles.strong}>{firstItem.title}</strong> đã được duyệt thành công.
                </>
              ) : (
                <>
                  Các đề bài sau đã được duyệt thành công trong cùng một đợt thông báo.
                </>
              )}
            </Text>

            <Section style={styles.card}>
              {isSingle ? (
                <>
                  <Text style={styles.label}>Loại bài</Text>
                  <Text style={styles.value}>{firstItem.itemType}</Text>
                  <Text style={styles.label}>Mô tả đề bài</Text>
                  <Text style={styles.value}>{firstItem.title}</Text>
                  {firstItem.analysis ? (
                    <>
                      <Text style={styles.label}>Ghi chú duyệt</Text>
                      <Text style={styles.analysis}>{firstItem.analysis}</Text>
                    </>
                  ) : null}
                </>
              ) : (
                <>
                  <Text style={styles.label}>Số lượng đề bài</Text>
                  <Text style={styles.value}>{safeItems.length} đề bài đã được duyệt</Text>
                  <Hr style={styles.cardDivider} />
                  {safeItems.map((item, index) => (
                    <Section key={`${item.reviewUrl}-${index}`} style={styles.itemRow}>
                      <Text style={styles.itemIndex}>{index + 1}</Text>
                      <Section style={styles.itemContent}>
                        <Text style={styles.itemTitle}>{item.title}</Text>
                        <Text style={styles.itemType}>{item.itemType}</Text>
                        <Button href={item.reviewUrl} style={styles.itemLink}>
                          Xem bài
                        </Button>
                      </Section>
                    </Section>
                  ))}
                </>
              )}
            </Section>

            {isSingle ? (
              <>
                <Button href={firstItem.reviewUrl} style={styles.button}>
                  Xem chi tiết bài duyệt
                </Button>
                <Text style={styles.linkText}>Hoặc mở link này: {firstItem.reviewUrl}</Text>
              </>
            ) : null}
          </Section>

          <Section style={styles.footer}>
            <Text style={styles.footerText}>
              Email này được gửi tự động từ hệ thống AI của SP Cybersoft. Vui lòng không phản hồi trực tiếp email này.
            </Text>
            <Text style={styles.copyright}>© 2026 Song Phương Technology · songphuong.vn</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const styles = {
  body: {
    margin: 0,
    padding: "32px 16px",
    backgroundColor: "#0A0E1A",
    fontFamily: "'Manrope','Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif",
  },
  container: {
    width: "600px",
    maxWidth: "100%",
    overflow: "hidden",
    borderRadius: "16px",
    backgroundColor: "#11162A",
    border: "1px solid #1E2540",
  },
  header: {
    position: "relative" as const,
    padding: "28px 40px 24px",
    borderBottom: "1px solid #1E2540",
  },
  logoMark: {
    display: "inline-block",
    width: "34px",
    height: "34px",
    margin: "0 10px 0 0",
    borderRadius: "9px",
    backgroundColor: "#2563EB",
    color: "#ffffff",
    fontSize: "16px",
    fontWeight: 800,
    lineHeight: "34px",
    textAlign: "center" as const,
  },
  brand: {
    display: "inline-block",
    margin: 0,
    color: "#E6E9F5",
    fontSize: "15px",
    fontWeight: 700,
    verticalAlign: "middle",
  },
  headerMeta: {
    margin: "10px 0 0",
    color: "#5B6382",
    fontSize: "12px",
    fontWeight: 500,
  },
  hero: {
    padding: "36px 40px 8px",
  },
  badge: {
    display: "inline-block",
    margin: 0,
    padding: "6px 14px",
    borderRadius: "999px",
    border: "1px solid rgba(34,197,94,0.35)",
    backgroundColor: "rgba(34,197,94,0.12)",
    color: "#4ADE80",
    fontSize: "12px",
    fontWeight: 700,
    letterSpacing: "0.4px",
    textTransform: "uppercase" as const,
  },
  heading: {
    margin: "16px 0 0",
    color: "#F5F6FB",
    fontSize: "22px",
    fontWeight: 700,
    lineHeight: "1.35",
  },
  content: {
    padding: "20px 40px 8px",
  },
  greeting: {
    margin: 0,
    color: "#A6ACC7",
    fontSize: "14px",
    lineHeight: "1.6",
  },
  message: {
    margin: "10px 0 0",
    color: "#A6ACC7",
    fontSize: "14px",
    lineHeight: "1.6",
  },
  strong: {
    color: "#E6E9F5",
  },
  card: {
    margin: "24px 0 0",
    padding: "22px 24px",
    borderRadius: "12px",
    border: "1px solid #1E2540",
    backgroundColor: "#0D1224",
  },
  label: {
    margin: "0 0 4px",
    color: "#5B6382",
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "0.6px",
    textTransform: "uppercase" as const,
  },
  value: {
    margin: "0 0 18px",
    color: "#F5F6FB",
    fontSize: "15px",
    fontWeight: 700,
    lineHeight: "1.5",
  },
  analysis: {
    margin: "8px 0 0",
    color: "#C7CBE0",
    fontSize: "14px",
    lineHeight: "1.65",
    whiteSpace: "pre-line" as const,
  },
  cardDivider: {
    margin: "2px 0 12px",
    borderColor: "#1E2540",
  },
  itemRow: {
    padding: "10px 0",
    borderBottom: "1px solid #1A2036",
  },
  itemIndex: {
    display: "inline-block",
    width: "24px",
    height: "24px",
    margin: "0 12px 0 0",
    borderRadius: "999px",
    backgroundColor: "rgba(34,197,94,0.12)",
    color: "#4ADE80",
    fontSize: "12px",
    fontWeight: 700,
    lineHeight: "24px",
    textAlign: "center" as const,
  },
  itemContent: {
    display: "inline-block",
    width: "calc(100% - 40px)",
    verticalAlign: "top",
  },
  itemTitle: {
    margin: 0,
    color: "#E6E9F5",
    fontSize: "14px",
    fontWeight: 700,
    lineHeight: "1.45",
  },
  itemType: {
    margin: "3px 0 8px",
    color: "#5B6382",
    fontSize: "12px",
    lineHeight: "1.4",
  },
  itemLink: {
    display: "inline-block",
    padding: "7px 10px",
    borderRadius: "8px",
    backgroundColor: "#1A2036",
    color: "#C7CBE0",
    fontSize: "12px",
    fontWeight: 700,
    textDecoration: "none",
  },
  button: {
    display: "block",
    margin: "28px 0 0",
    padding: "14px 24px",
    borderRadius: "10px",
    backgroundColor: "#2563EB",
    color: "#ffffff",
    fontSize: "14px",
    fontWeight: 700,
    textAlign: "center" as const,
    textDecoration: "none",
  },
  linkText: {
    margin: "14px 0 0",
    color: "#5B6382",
    fontSize: "12px",
    lineHeight: "1.5",
    wordBreak: "break-all" as const,
  },
  footer: {
    margin: "20px 0 0",
    padding: "28px 40px 32px",
    borderTop: "1px solid #1E2540",
  },
  footerText: {
    margin: 0,
    color: "#5B6382",
    fontSize: "12px",
    lineHeight: "1.6",
  },
  copyright: {
    margin: "10px 0 0",
    color: "#3E4362",
    fontSize: "12px",
  },
};
