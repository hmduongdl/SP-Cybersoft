import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

interface NotificationEmailProps {
  subject: string;
  message: string;
}

export function NotificationEmail({ subject, message }: NotificationEmailProps) {
  const lines = message.split("\n");

  return (
    <Html lang="vi">
      <Head />
      <Preview>{subject}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Section style={styles.header}>
            <Text style={styles.logoMark}>S</Text>
            <Text style={styles.brand}>SP Cybersoft</Text>
            <Text style={styles.headerMeta}>Hệ thống Thông báo</Text>
          </Section>

          <Section style={styles.hero}>
            <Heading as="h1" style={styles.heading}>
              {subject}
            </Heading>
          </Section>

          <Section style={styles.content}>
            {lines.map((line, index) =>
              line.trim() ? (
                <Text key={index} style={styles.message}>
                  {line}
                </Text>
              ) : (
                <Text key={index} style={styles.spacer}>
                  &nbsp;
                </Text>
              )
            )}
          </Section>

          <Section style={styles.footer}>
            <Text style={styles.footerText}>
              Email này được gửi tự động từ hệ thống SP Cybersoft. Vui lòng không phản hồi trực tiếp email này.
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
  heading: {
    margin: "0",
    color: "#F5F6FB",
    fontSize: "22px",
    fontWeight: 700,
    lineHeight: "1.35",
  },
  content: {
    padding: "12px 40px 8px",
  },
  message: {
    margin: "0 0 12px",
    color: "#A6ACC7",
    fontSize: "15px",
    lineHeight: "1.6",
  },
  spacer: {
    margin: 0,
    fontSize: "8px",
    lineHeight: "8px",
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
