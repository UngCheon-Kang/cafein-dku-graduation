import { useState } from "react";
import { Form, Input, Button, Card, message } from "antd";
import { login } from "../api/admin";
import { setAdminToken } from "../api/token";

export default function LoginPage({ onLogin }) {
  const [loading, setLoading] = useState(false);

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const data = await login(values.email, values.password);
      setAdminToken(data.accessToken);
      message.success("로그인 성공");
      onLogin();
    } catch (e) {
      message.error("로그인 실패: 이메일/비밀번호를 확인하세요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", justifyContent: "center", marginTop: 120 }}>
      <Card title="카공 관리자 로그인" style={{ width: 380 }}>
        <Form onFinish={onFinish} layout="vertical">
          <Form.Item
            name="email"
            label="이메일"
            rules={[{ required: true, message: "이메일을 입력하세요" }]}
          >
            <Input placeholder="admin@example.com" autoComplete="username" />
          </Form.Item>
          <Form.Item
            name="password"
            label="비밀번호"
            rules={[{ required: true, message: "비밀번호를 입력하세요" }]}
          >
            <Input.Password autoComplete="current-password" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} block>
            로그인
          </Button>
        </Form>
      </Card>
    </div>
  );
}
