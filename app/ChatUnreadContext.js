import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getChatRooms } from './api';
import { getToken } from './auth';

// 하단 탭의 채팅 안읽음 배지를 앱 전역에서 공유한다.
// - 15초마다 폴링(다른 화면에 있을 때 새 메시지 반영용)
// - 채팅 목록/읽음이 갱신되는 순간 setChatUnread / refresh로 즉시 동기화(지연 제거)
const ChatUnreadContext = createContext({
  chatUnread: 0,
  setChatUnread: () => {},
  refresh: () => {},
});

export function ChatUnreadProvider({ children }) {
  const [chatUnread, setChatUnread] = useState(0);

  const refresh = useCallback(async () => {
    const token = await getToken();
    if (!token) { setChatUnread(0); return; }
    try {
      const rooms = await getChatRooms();
      const total = rooms.reduce((sum, r) => sum + (r.unreadCount || 0), 0);
      setChatUnread(total);
    } catch {}
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 15000); // 15초마다 갱신(백그라운드용)
    return () => clearInterval(id);
  }, [refresh]);

  return (
    <ChatUnreadContext.Provider value={{ chatUnread, setChatUnread, refresh }}>
      {children}
    </ChatUnreadContext.Provider>
  );
}

export function useChatUnread() {
  return useContext(ChatUnreadContext);
}
