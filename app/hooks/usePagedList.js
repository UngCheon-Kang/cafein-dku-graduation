import { useState, useRef, useCallback } from 'react';

// 페이지네이션(무한스크롤) 공용 훅.
// fetchPage(page) 는 { content, last } 를 반환해야 함 (api.js의 페이지 함수들).
export function usePagedList() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const pageRef = useRef(0);
  const lastRef = useRef(false);
  const busyRef = useRef(false);
  const fetchRef = useRef(null);

  // 첫 페이지 로드(또는 새로고침). fetchPage 를 저장해두면 loadMore 가 이어서 사용.
  const reset = useCallback(async (fetchPage, opts) => {
    const refresh = opts && opts.refresh;
    fetchRef.current = fetchPage;
    if (busyRef.current) return;
    busyRef.current = true;
    if (refresh) setRefreshing(true); else setLoading(true);
    try {
      const { content, last } = await fetchPage(0);
      setItems(Array.isArray(content) ? content : []);
      pageRef.current = 0;
      lastRef.current = !!last;
    } catch (e) {
      console.log('목록 로드 실패:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
      busyRef.current = false;
    }
  }, []);

  // 스크롤 끝 → 다음 페이지 이어붙이기 (중복 id 제거)
  const loadMore = useCallback(async () => {
    if (busyRef.current || lastRef.current || !fetchRef.current) return;
    busyRef.current = true;
    setLoadingMore(true);
    try {
      const next = pageRef.current + 1;
      const { content, last } = await fetchRef.current(next);
      const page = Array.isArray(content) ? content : [];
      setItems((prev) => {
        const ids = new Set(prev.map((x) => x && x.id));
        return [...prev, ...page.filter((x) => x && x.id != null && !ids.has(x.id))];
      });
      pageRef.current = next;
      lastRef.current = !!last;
    } catch (e) {
      console.log('추가 로드 실패:', e.message);
    } finally {
      setLoadingMore(false);
      busyRef.current = false;
    }
  }, []);

  return { items, setItems, loading, refreshing, loadingMore, reset, loadMore };
}
