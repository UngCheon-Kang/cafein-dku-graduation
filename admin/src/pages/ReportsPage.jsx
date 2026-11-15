import { useEffect, useState } from "react";
import { Table, Tag, Button, Space, Radio, Modal, message, Typography, List, Image, Descriptions } from "antd";
import { getReports, handleReport, suspendUser, getReportedChat, getReportDetail, removeProfileImage } from "../api/admin";

const { Text } = Typography;

const typeColor = { FEED: "blue", COMMENT: "geekblue", REVIEW: "purple", CHAT_ROOM: "cyan", USER: "gold" };
const typeLabel = { FEED: "피드", COMMENT: "댓글", REVIEW: "리뷰", CHAT_ROOM: "채팅", USER: "프로필" };
const reasonColor = { SPAM: "orange", ABUSE: "red", OBSCENE: "magenta", ETC: "default" };
const reasonLabel = { SPAM: "스팸", ABUSE: "욕설/폭력", OBSCENE: "음란", ETC: "기타" };
const resolutionLabel = {
  CONTENT_HIDDEN: "콘텐츠 숨김",
  PROFILE_IMAGE_REMOVED: "프로필 이미지 삭제",
  USER_SUSPENDED: "작성자 정지",
};

const cafeLabel = (t) => (t === "REVIEW" ? "카페" : "관련 카페");
const SIZE = 20;

export default function ReportsPage() {
  const [status, setStatus] = useState("PENDING");
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);   // 0-based
  const [total, setTotal] = useState(0);

  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getReports(status, page, SIZE);
      const content = Array.isArray(data) ? data : (data.content ?? []);
      setReports(content);
      setTotal(Array.isArray(data) ? data.length : (data.totalElements ?? content.length));
    } catch (e) {
      if (e?.response?.status === 403) message.error("관리자 권한이 없는 계정입니다.");
      else if (e?.response?.status === 401) message.error("로그인이 만료되었습니다. 다시 로그인하세요.");
      else message.error("신고 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, page]);

  const changeStatus = (v) => {
    setPage(0);
    setStatus(v);
  };

  const confirmAction = (title, onOk) => {
    Modal.confirm({ title, okText: "확인", cancelText: "취소", okType: "danger", onOk });
  };

  const act = async (reportId, action) => {
    try {
      await handleReport(reportId, action);
      message.success("처리되었습니다.");
      load();
    } catch (e) {
      message.error(e?.response?.data?.message || "처리에 실패했습니다.");
    }
  };

  const suspend = async (userId, reportId) => {
    try {
      await suspendUser(userId, reportId);
      message.success("작성자를 정지했습니다.");
      load();
    } catch (e) {
      message.error("정지에 실패했습니다.");
    }
  };

  const removeImage = async (userId, reportId) => {
    try {
      await removeProfileImage(userId, reportId);
      message.success("프로필 이미지를 삭제하고 처리했습니다.");
      load();
    } catch (e) {
      message.error("처리에 실패했습니다.");
    }
  };

  const openChat = async (reportId) => {
    setChatOpen(true);
    setChatLoading(true);
    try {
      setChatMessages(await getReportedChat(reportId));
    } catch (e) {
      message.error("채팅을 불러오지 못했습니다.");
      setChatMessages([]);
    } finally {
      setChatLoading(false);
    }
  };

  const openDetail = async (row) => {
    if (row.targetType === "CHAT_ROOM") return openChat(row.id);
    setDetailOpen(true);
    setDetailLoading(true);
    setDetail(null);
    try {
      setDetail(await getReportDetail(row.id));
    } catch (e) {
      message.error("상세 내용을 불러오지 못했습니다.");
    } finally {
      setDetailLoading(false);
    }
  };

  const columns = [
    { title: "유형", dataIndex: "targetType", width: 80, render: (t) => <Tag color={typeColor[t]}>{typeLabel[t] || t}</Tag> },
    { title: "사유", dataIndex: "reason", width: 100, render: (r) => <Tag color={reasonColor[r]}>{reasonLabel[r] || r}</Tag> },
    {
      title: "미리보기", dataIndex: "preview", width: 260, ellipsis: true,
      render: (p, row) => <a onClick={() => openDetail(row)}>{p || "(내용 보기)"}</a>,
    },
    { title: "작성자", dataIndex: "authorNickname", width: 120, ellipsis: true, render: (n) => n || <Text type="secondary">-</Text> },
    { title: "신고자", dataIndex: "reporterNickname", width: 120, ellipsis: true },
    { title: "상세사유", dataIndex: "detail", width: 140, ellipsis: true, render: (d) => d || <Text type="secondary">-</Text> },
    { title: "시각", dataIndex: "createdAt", width: 165, render: (d) => (d ? new Date(d).toLocaleString() : "-") },
    {
      title: "작업", key: "action", width: 300, fixed: "right",
      render: (_, row) => {
        if (row.status === "REJECTED") return <Tag>반려</Tag>;
        if (row.status === "RESOLVED") return <Tag color="green">{resolutionLabel[row.resolutionAction] || "처리 완료"}</Tag>;
        const t = row.targetType;
        const canHide = t === "FEED" || t === "COMMENT" || t === "REVIEW";
        return (
          <Space wrap>
            {t === "CHAT_ROOM" && <Button size="small" onClick={() => openChat(row.id)}>채팅 보기</Button>}
            {canHide && (
              <Button size="small" danger onClick={() => confirmAction("이 콘텐츠를 숨길까요?", () => act(row.id, "RESOLVE_HIDE"))}>숨김 처리</Button>
            )}
            {t === "USER" && row.reason === "OBSCENE" && (
              <Button size="small" danger onClick={() => confirmAction("이 유저의 프로필 이미지를 삭제할까요?", () => removeImage(row.authorId, row.id))}>프로필 이미지 삭제</Button>
            )}
            <Button size="small" onClick={() => act(row.id, "REJECT")}>반려</Button>
            {row.authorId && (
              <Button size="small" danger onClick={() => confirmAction("작성자를 정지할까요?", () => suspend(row.authorId, row.id))}>작성자 정지</Button>
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <>
      <Radio.Group value={status} onChange={(e) => changeStatus(e.target.value)} optionType="button" style={{ marginBottom: 16 }}>
        <Radio.Button value="PENDING">대기</Radio.Button>
        <Radio.Button value="RESOLVED">처리됨</Radio.Button>
        <Radio.Button value="REJECTED">반려</Radio.Button>
      </Radio.Group>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={reports}
        loading={loading}
        tableLayout="fixed"
        scroll={{ x: 1285 }}
        pagination={{
          current: page + 1,
          pageSize: SIZE,
          total,
          showSizeChanger: false,
          onChange: (p) => setPage(p - 1),
        }}
      />

      {/* 채팅 뷰어 */}
      <Modal title="신고된 채팅방 (읽기 전용)" open={chatOpen} onCancel={() => setChatOpen(false)} footer={null} width={520}>
        {chatLoading ? (
          <Text>불러오는 중…</Text>
        ) : (
          <List
            dataSource={chatMessages}
            locale={{ emptyText: "메시지가 없습니다." }}
            renderItem={(m) => (
              <List.Item>
                <div>
                  <Space size={8}>
                    <Text strong>{m.senderNickname}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {m.createdAt ? new Date(m.createdAt).toLocaleString() : ""}
                    </Text>
                  </Space>
                  <div>{m.content}</div>
                </div>
              </List.Item>
            )}
          />
        )}
      </Modal>

      {/* 상세 보기 (피드/리뷰/댓글/프로필) */}
      <Modal title="신고 상세" open={detailOpen} onCancel={() => setDetailOpen(false)} footer={null} width={640}>
        {detailLoading || !detail ? (
          <Text>불러오는 중…</Text>
        ) : (
          <>
            <Descriptions
              bordered
              column={1}
              size="small"
              labelStyle={{ width: 90, whiteSpace: "nowrap", verticalAlign: "top" }}
              contentStyle={{ wordBreak: "break-all" }}
            >
              <Descriptions.Item label="유형">{typeLabel[detail.targetType] || detail.targetType}</Descriptions.Item>
              <Descriptions.Item label={detail.targetType === "USER" ? "대상 유저" : "작성자"}>{detail.authorNickname || "-"}</Descriptions.Item>
              {detail.createdAt && (
                <Descriptions.Item label="작성일">{new Date(detail.createdAt).toLocaleString()}</Descriptions.Item>
              )}
              {detail.status && (
                <Descriptions.Item label="상태">
                  {detail.status === "NORMAL" ? <Tag color="green">정상</Tag> : <Tag color="red">{detail.status}</Tag>}
                </Descriptions.Item>
              )}
              {detail.cafeName && (
                <Descriptions.Item label={cafeLabel(detail.targetType)}>{detail.cafeName}</Descriptions.Item>
              )}
              {detail.feedTitle && <Descriptions.Item label="소속 피드">{detail.feedTitle}</Descriptions.Item>}
              {typeof detail.score === "number" && (
                <Descriptions.Item label="평점">
                  {detail.score} · WiFi {detail.wifiScore} · 콘센트 {detail.outletScore} · 좌석 {detail.seatScore} · 소음 {detail.noiseScore}
                </Descriptions.Item>
              )}
              {detail.title && <Descriptions.Item label="제목">{detail.title}</Descriptions.Item>}
              {detail.content && (
                <Descriptions.Item label="내용">
                  <div style={{ whiteSpace: "pre-wrap" }}>{detail.content}</div>
                </Descriptions.Item>
              )}
            </Descriptions>

            {detail.imageUrls?.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <Image.PreviewGroup>
                  <Space wrap>
                    {detail.imageUrls.map((u, i) => (
                      <Image key={i} width={130} height={130} style={{ objectFit: "cover" }} src={u} />
                    ))}
                  </Space>
                </Image.PreviewGroup>
              </div>
            )}
          </>
        )}
      </Modal>
    </>
  );
}
