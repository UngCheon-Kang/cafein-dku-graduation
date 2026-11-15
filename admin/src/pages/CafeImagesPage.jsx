import { useEffect, useState } from "react";
import { Table, Button, Input, Modal, Upload, message, Image, Space, Typography, Radio, Popconfirm } from "antd";
import { getCafes, getCafesWithoutImage, getCafeImages, getUploadUrl, uploadToS3, setCafeImages, hideCafe, setCafeSource, getHiddenCafes, unhideCafe } from "../api/admin";
import heic2any from "heic2any";

// HEIC/HEIF면 브라우저에서 JPEG로 변환 (브라우저는 HEIC를 못 읽음)
async function toJpegIfHeic(file) {
  const isHeic = /heic|heif/i.test(file.type || "") || /\.(heic|heif)$/i.test(file.name || "");
  if (!isHeic) return file;
  const blob = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.85 });
  const out = Array.isArray(blob) ? blob[0] : blob;
  const base = (file.name || "image").replace(/\.[^.]+$/, "");
  return new File([out], base + ".jpg", { type: "image/jpeg" });
}

// 어떤 이미지든 긴 변 1600px로 축소 + JPEG 재인코딩(canvas).
// 3MB 업로드 상한 초과 실패 방지 + 허용 안 되는 포맷(gif/avif 등)도 jpeg로 통일.
function downscaleToJpeg(file, maxDim = 2048, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      const long = Math.max(width, height);
      if (long > maxDim) {
        const r = maxDim / long;
        width = Math.round(width * r);
        height = Math.round(height * r);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d").drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error("이미지 처리에 실패했습니다."));
          const base = (file.name || "image").replace(/\.[^.]+$/, "");
          resolve(new File([blob], base + ".jpg", { type: "image/jpeg" }));
        },
        "image/jpeg",
        quality
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("이미지를 읽지 못했습니다."));
    };
    img.src = url;
  });
}

// 업로드 전 처리: HEIC→JPEG 변환 후 축소/재인코딩
async function processForUpload(file) {
  const jpeg = await toJpegIfHeic(file);
  try {
    return await downscaleToJpeg(jpeg);
  } catch (e) {
    return jpeg; // 처리 실패 시 변환본이라도 업로드 시도
  }
}

const { Text } = Typography;

export default function CafeImagesPage() {
  const [tab, setTab] = useState("search"); // search | noimage
  const [keyword, setKeyword] = useState("");
  const [cafes, setCafes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const [page, setPage] = useState(0); // 미등록 탭 서버 페이징
  const [total, setTotal] = useState(0);

  const [editCafe, setEditCafe] = useState(null);
  const [fileList, setFileList] = useState([]);
  const [saving, setSaving] = useState(false);
  const [sourceUrl, setSourceUrl] = useState("");

  const searchByName = async (kw) => {
    const q = (kw ?? keyword).trim();
    if (!q) return;
    setKeyword(q);
    setLoading(true);
    setSearched(true);
    try {
      const data = await getCafes(q);
      setCafes(Array.isArray(data) ? data : data.content ?? []);
    } catch (e) {
      message.error("카페를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const loadNoImage = async (p = 0) => {
    setLoading(true);
    setPage(p);
    try {
      const data = await getCafesWithoutImage(p);
      const content = Array.isArray(data) ? data : data.content ?? [];
      setCafes(content);
      setTotal(Array.isArray(data) ? data.length : data.totalElements ?? content.length);
    } catch (e) {
      message.error("미등록 카페를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const loadHidden = async (p = 0) => {
    setLoading(true);
    setPage(p);
    try {
      const data = await getHiddenCafes(p);
      const content = Array.isArray(data) ? data : data.content ?? [];
      setCafes(content);
      setTotal(Array.isArray(data) ? data.length : data.totalElements ?? content.length);
    } catch (e) {
      message.error("숨김 카페를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tab === "noimage") loadNoImage(0);
    else if (tab === "hidden") loadHidden(0);
    else setCafes([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const reload = () => (tab === "noimage" ? loadNoImage(page) : tab === "hidden" ? loadHidden(page) : searchByName(keyword));

  const doHide = async (id) => {
    try {
      await hideCafe(id);
      message.success("카페를 숨겼습니다.");
      reload();
    } catch (e) {
      message.error("숨기기에 실패했습니다.");
    }
  };

  const doUnhide = async (id) => {
    try {
      await unhideCafe(id);
      message.success("카페를 복원했습니다.");
      reload();
    } catch (e) {
      message.error("복원에 실패했습니다.");
    }
  };

  const openEdit = async (cafe) => {
    setEditCafe(cafe);
    setFileList([]);
    setSourceUrl(cafe.sourceUrl || "");
    try {
      const imgs = await getCafeImages(cafe.id); // [{key,url}]
      setFileList(
        imgs.map((im) => ({
          uid: im.key,
          name: im.key.split("/").pop(),
          status: "done",
          url: im.url,
          cafeKey: im.key, // 기존 이미지 표시
        }))
      );
    } catch (e) {
      message.error("현재 사진을 불러오지 못했습니다.");
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const keys = [];
      for (const f of fileList) {
        if (f.cafeKey) {
          keys.push(f.cafeKey); // 남긴 기존 사진
          continue;
        }
        const raw = f.originFileObj || f; // 새로 올린 사진
        const file = await processForUpload(raw); // HEIC 변환 + 축소/재인코딩(3MB 초과 방지)
        const presigned = await getUploadUrl("cafes", file.type);
        keys.push(await uploadToS3(presigned, file));
      }
      await setCafeImages(editCafe.id, keys);
      try { await setCafeSource(editCafe.id, sourceUrl.trim()); } catch (e) { /* 출처 API 배포 전엔 무시 */ }
      message.success("카페 사진을 저장했습니다.");
      setEditCafe(null);
      reload();
    } catch (e) {
      message.error(e?.response?.data?.message || e?.message || "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { title: "카페", dataIndex: "name", width: 200, ellipsis: true },
    { title: "주소", dataIndex: "address", ellipsis: true },
    {
      title: "현재 사진", dataIndex: "imageUrls", width: 200,
      render: (urls) =>
        urls?.length ? (
          <Space>
            {urls.slice(0, 3).map((u, i) => (
              <Image key={i} width={40} height={40} style={{ objectFit: "cover" }} src={u} />
            ))}
            {urls.length > 3 && <Text type="secondary">+{urls.length - 3}</Text>}
          </Space>
        ) : (
          <Text type="secondary">없음</Text>
        ),
    },
    {
      title: "작업", key: "action", width: 200,
      render: (_, c) =>
        tab === "hidden" ? (
          <Button size="small" type="primary" onClick={() => doUnhide(c.id)}>복원</Button>
        ) : (
          <Space>
            <Button size="small" onClick={() => openEdit(c)}>사진 관리</Button>
            <Popconfirm
              title="이 카페를 숨길까요?"
              description="앱에서 안 보이게 됩니다 (되돌릴 수 있음)."
              okText="숨김" cancelText="취소"
              onConfirm={() => doHide(c.id)}
            >
              <Button size="small" danger>삭제</Button>
            </Popconfirm>
          </Space>
        ),
    },
  ];

  return (
    <>
      <Radio.Group value={tab} onChange={(e) => setTab(e.target.value)} optionType="button" style={{ marginBottom: 16 }}>
        <Radio.Button value="search">검색</Radio.Button>
        <Radio.Button value="noimage">미등록 카페</Radio.Button>
        <Radio.Button value="hidden">숨김 카페</Radio.Button>
      </Radio.Group>

      {tab === "search" && (
        <div style={{ marginBottom: 16 }}>
          <Input.Search placeholder="카페 이름으로 검색" allowClear enterButton onSearch={searchByName} style={{ width: 340 }} />
        </div>
      )}

      <Table
        rowKey="id"
        columns={columns}
        dataSource={cafes}
        loading={loading}
        locale={{
          emptyText:
            tab === "noimage"
              ? "사진 미등록 카페가 없습니다."
              : tab === "hidden"
              ? "숨김 처리된 카페가 없습니다."
              : searched
              ? "검색 결과가 없습니다."
              : "카페 이름으로 검색하세요.",
        }}
        pagination={
          tab !== "search"
            ? {
                current: page + 1,
                pageSize: 20,
                total,
                showSizeChanger: false,
                showTotal: (t) => `총 ${t}개`,
                onChange: (p) => (tab === "hidden" ? loadHidden(p - 1) : loadNoImage(p - 1)),
              }
            : { pageSize: 20, showTotal: (t) => `총 ${t}개` }
        }
      />

      <Modal
        title={editCafe ? `${editCafe.name} — 사진 관리` : ""}
        open={!!editCafe}
        onCancel={() => setEditCafe(null)}
        onOk={save}
        confirmLoading={saving}
        okText="저장"
        cancelText="취소"
        width={560}
      >
        <Text type="secondary">
          기존 사진은 그대로 유지됩니다. 지우려면 썸네일에서 삭제하세요. 새 사진을 추가할 수 있고, 총 최대 5장입니다.
        </Text>
        <div style={{ marginTop: 16 }}>
          <Text type="secondary">사진 출처 URL (네이버 블로그 등, 선택)</Text>
          <Input
            placeholder="https://blog.naver.com/..."
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            style={{ marginTop: 6, marginBottom: 16 }}
          />
          <Upload
            listType="picture-card"
            multiple
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
            fileList={fileList}
            beforeUpload={() => false}
            onChange={({ fileList: fl }) => setFileList(fl.slice(0, 5))}
          >
            {fileList.length >= 5 ? null : <div>+ 추가</div>}
          </Upload>
        </div>
      </Modal>
    </>
  );
}
