import { useState } from "react";
import { Layout, Menu, Button } from "antd";
import ReportsPage from "./pages/ReportsPage";
import SuspendedUsersPage from "./pages/SuspendedUsersPage";
import CafeImagesPage from "./pages/CafeImagesPage";

const { Header, Sider, Content } = Layout;

const MENU = [
  { key: "reports", label: "신고 관리" },
  { key: "suspended", label: "정지 사용자" },
  { key: "cafes", label: "카페 이미지" },
];
const TITLE = { reports: "신고 관리", suspended: "정지 사용자", cafes: "카페 이미지" };

export default function ConsoleLayout({ onLogout }) {
  const [page, setPage] = useState("reports");
  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider theme="light" width={200}>
        <div style={{ padding: "16px 20px", fontWeight: 600, fontSize: 16 }}>카공 관리자</div>
        <Menu mode="inline" selectedKeys={[page]} items={MENU} onClick={(e) => setPage(e.key)} />
      </Sider>
      <Layout>
        <Header style={{ background: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between", paddingInline: 24 }}>
          <span style={{ fontSize: 18, fontWeight: 600 }}>{TITLE[page]}</span>
          <Button onClick={onLogout}>로그아웃</Button>
        </Header>
        <Content style={{ padding: 24 }}>
          {page === "reports" && <ReportsPage />}
          {page === "suspended" && <SuspendedUsersPage />}
          {page === "cafes" && <CafeImagesPage />}
        </Content>
      </Layout>
    </Layout>
  );
}
