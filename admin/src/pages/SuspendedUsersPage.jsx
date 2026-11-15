import { useEffect, useState } from "react";
import { Table, Button, Modal, message, Tag, Typography, Input } from "antd";
import { getSuspendedUsers, unsuspendUser } from "../api/admin";
import ReportContentLink from "../components/ReportContentLink";

const { Text } = Typography;

const reasonColor = { SPAM: "orange", ABUSE: "red", OBSCENE: "magenta", ETC: "default" };
const reasonLabel = { SPAM: "스팸", ABUSE: "욕설/폭력", OBSCENE: "음란", ETC: "기타" };

export default function SuspendedUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      setUsers(await getSuspendedUsers());
    } catch (e) {
      if (e?.response?.status === 403) message.error("관리자 권한이 없는 계정입니다.");
      else message.error("정지 사용자 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const release = (user) => {
    Modal.confirm({
      title: `${user.nickname} 님의 정지를 해제할까요?`,
      okText: "해제",
      cancelText: "취소",
      onOk: async () => {
        try {
          await unsuspendUser(user.id);
          message.success("정지를 해제했습니다.");
          load();
        } catch (e) {
          message.error("해제에 실패했습니다.");
        }
      },
    });
  };

  const columns = [
    { title: "ID", dataIndex: "id", width: 64 },
    { title: "닉네임", dataIndex: "nickname", width: 130 },
    { title: "이메일", dataIndex: "email", width: 190 },
    {
      title: "정지일", dataIndex: "suspendedAt", width: 155,
      render: (d) => (d ? new Date(d).toLocaleString() : <Text type="secondary">-</Text>),
    },
    {
      title: "사유", dataIndex: "suspendReason", width: 100,
      render: (r) => (r ? <Tag color={reasonColor[r] || "default"}>{reasonLabel[r] || r}</Tag> : <Text type="secondary">-</Text>),
    },
    {
      title: "관련 콘텐츠", key: "content",
      render: (_, u) => (
        <ReportContentLink reportId={u.reportId} targetType={u.targetType} label={u.suspendContentPreview} />
      ),
    },
    {
      title: "작업", key: "action", width: 110,
      render: (_, user) => <Button size="small" onClick={() => release(user)}>정지 해제</Button>,
    },
  ];

  const kw = q.trim().toLowerCase();
  const filtered = kw
    ? users.filter(
        (u) =>
          (u.nickname || "").toLowerCase().includes(kw) ||
          (u.email || "").toLowerCase().includes(kw)
      )
    : users;

  return (
    <>
      <Input.Search
        placeholder="닉네임 또는 이메일 검색"
        allowClear
        onChange={(e) => setQ(e.target.value)}
        style={{ width: 300, marginBottom: 16 }}
      />
      <Table
        rowKey="id"
        columns={columns}
        dataSource={filtered}
        loading={loading}
        locale={{ emptyText: "정지된 사용자가 없습니다." }}
        pagination={{ pageSize: 20 }}
        scroll={{ x: 1000 }}
      />
    </>
  );
}
