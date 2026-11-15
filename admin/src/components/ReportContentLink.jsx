import { useState } from "react";
import { Modal, Descriptions, Tag, Image, Space, Typography, List, message } from "antd";
import { getReportDetail, getReportedChat } from "../api/admin";

const { Text } = Typography;

const typeLabel = { FEED: "피드", COMMENT: "댓글", REVIEW: "리뷰", CHAT_ROOM: "채팅", USER: "프로필" };
const typeColor = { FEED: "blue", COMMENT: "geekblue", REVIEW: "purple", CHAT_ROOM: "cyan", USER: "gold" };
const cafeLabel = (t) => (t === "REVIEW" ? "카페" : "관련 카페");

// 신고 id + 타입을 받아, 클릭하면 그 콘텐츠 상세(또는 채팅)를 모달로 보여주는 링크
export default function ReportContentLink({ reportId, targetType, label }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState(null);
  const [chat, setChat] = useState(null);

  if (!reportId) return <Text type="secondary">-</Text>;

  const isChat = targetType === "CHAT_ROOM";

  const openIt = async () => {
    setOpen(true);
    setLoading(true);
    setDetail(null);
    setChat(null);
    try {
      if (isChat) setChat(await getReportedChat(reportId));
      else setDetail(await getReportDetail(reportId));
    } catch (e) {
      message.error("내용을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Space size={6}>
        {targetType && <Tag color={typeColor[targetType]}>{typeLabel[targetType] || targetType}</Tag>}
        <a onClick={openIt}>{label || "(내용 보기)"}</a>
      </Space>

      <Modal
        title={isChat ? "신고된 채팅방 (읽기 전용)" : "관련 콘텐츠"}
        open={open}
        onCancel={() => setOpen(false)}
        footer={null}
        width={isChat ? 520 : 640}
      >
        {loading ? (
          <Text>불러오는 중…</Text>
        ) : isChat ? (
          <List
            dataSource={chat || []}
            locale={{ emptyText: "메시지가 없습니다." }}
            renderItem={(m) => (
              <List.Item>
                <div>
                  <Space size={8}>
                    <Text strong>{m.senderNickname}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>{m.createdAt ? new Date(m.createdAt).toLocaleString() : ""}</Text>
                  </Space>
                  <div>{m.content}</div>
                </div>
              </List.Item>
            )}
          />
        ) : detail ? (
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
              {detail.createdAt && <Descriptions.Item label="작성일">{new Date(detail.createdAt).toLocaleString()}</Descriptions.Item>}
              {detail.status && (
                <Descriptions.Item label="상태">
                  {detail.status === "NORMAL" ? <Tag color="green">정상</Tag> : <Tag color="red">{detail.status}</Tag>}
                </Descriptions.Item>
              )}
              {detail.cafeName && <Descriptions.Item label={cafeLabel(detail.targetType)}>{detail.cafeName}</Descriptions.Item>}
              {detail.feedTitle && <Descriptions.Item label="소속 피드">{detail.feedTitle}</Descriptions.Item>}
              {typeof detail.score === "number" && (
                <Descriptions.Item label="평점">
                  {detail.score} · WiFi {detail.wifiScore} · 콘센트 {detail.outletScore} · 좌석 {detail.seatScore} · 소음 {detail.noiseScore}
                </Descriptions.Item>
              )}
              {detail.title && <Descriptions.Item label="제목">{detail.title}</Descriptions.Item>}
              {detail.content && (
                <Descriptions.Item label="내용"><div style={{ whiteSpace: "pre-wrap" }}>{detail.content}</div></Descriptions.Item>
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
        ) : null}
      </Modal>
    </>
  );
}
