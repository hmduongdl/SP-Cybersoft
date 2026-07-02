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
    background: "linear-gradient(135deg,#3b82f6,#8b5cf6)",
    textAlign: "center" as const,
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
  message: {
    margin: "0 0 12px",
    color: "#374151",
    fontSize: "16px",
    lineHeight: "1.6",
  },
  spacer: {
    margin: 0,
    fontSize: "8px",
    lineHeight: "8px",
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
