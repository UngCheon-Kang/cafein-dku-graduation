# 시스템 아키텍처

![시스템 구조](architecture.webp)

## 전체 구조

```mermaid
flowchart TB
    subgraph client["클라이언트"]
        APP["모바일 앱<br/>React Native · Expo"]
        ADMIN["관리자 웹<br/>React · Vite"]
    end

    NGINX["Nginx<br/>리버스 프록시 · TLS 종료<br/>crccafe.com"]

    subgraph ec2["AWS EC2 (Ubuntu · Docker Compose)"]
        API["Spring Boot API 서버<br/>REST · WebSocket(STOMP)"]
        REDIS[("Redis<br/>토큰 · 인증코드 · Rate Limit")]
    end

    RDS[("AWS RDS<br/>PostgreSQL + PostGIS")]
    S3[("AWS S3<br/>이미지 저장")]
    SES["AWS SES<br/>인증 메일 발송"]

    subgraph ext["외부 API"]
        KAKAO["카카오 로컬 API<br/>카페 검색"]
        OAUTH["카카오 · 애플 · 네이버<br/>소셜 로그인"]
        PUSH["Expo Push<br/>푸시 알림"]
    end

    APP -->|HTTPS / WSS| NGINX
    ADMIN -->|HTTPS| NGINX
    NGINX --> API
    API --- REDIS
    API --> RDS
    API --> SES
    API --> KAKAO
    API --> OAUTH
    API --> PUSH
    APP -.->|presigned URL 직접 업로드| S3
    API -->|presigned URL 발급| S3
```

## 요청 흐름

### 이미지 업로드
서버를 거치지 않고 앱이 S3에 직접 올려 서버 부하와 트래픽을 줄였습니다.

```mermaid
sequenceDiagram
    participant A as 모바일 앱
    participant S as API 서버
    participant S3 as AWS S3
    A->>S: 업로드 URL 요청 (폴더·파일형식)
    S->>S: 폴더/확장자 검증
    S-->>A: presigned URL 발급
    A->>S3: 이미지 직접 업로드
    A->>S: 리뷰 저장 (imageKey 전달)
    S-->>A: 저장 완료
```

### 이메일 회원가입
인증에 성공해야 사용자 레코드를 만들기 때문에, 미인증 계정이 DB에 쌓이지 않습니다.

```mermaid
sequenceDiagram
    participant A as 모바일 앱
    participant S as API 서버
    participant R as Redis
    participant M as AWS SES
    A->>S: 가입 요청 (이메일·비밀번호·닉네임)
    S->>S: 중복 확인 (별칭·gmail 점 정규화)
    S->>R: 가입 대기 정보 저장 (TTL 5분)
    S->>M: 인증코드 메일 발송
    A->>S: 인증코드 입력
    S->>R: 코드 검증 (시도 횟수 제한)
    S->>S: 사용자 생성 (DB INSERT)
    S-->>A: 가입 완료
```

### 실시간 채팅
상대가 접속 중이면 WebSocket으로 즉시 전달하고, 아니면 푸시로 알립니다.

```mermaid
sequenceDiagram
    participant A as 사용자 A
    participant S as API 서버 (STOMP)
    participant DB as PostgreSQL
    participant B as 사용자 B
    A->>S: /app 으로 메시지 전송
    S->>DB: 메시지 저장
    S-->>B: /topic 구독자에게 전달
    alt B가 오프라인
        S->>B: Expo Push 알림 발송
    end
```

## 설계 시 고려한 점

| 항목 | 선택 | 이유 |
|---|---|---|
| 이미지 업로드 | S3 presigned URL | 서버를 경유하지 않아 트래픽·메모리 부담이 없음 |
| 위치 기반 조회 | PostGIS 공간 쿼리 | 거리 계산을 DB에서 처리해 전체 조회 후 정렬하는 방식보다 효율적 |
| 지도 렌더링 | supercluster 클러스터링 | 카페 수가 늘어도 마커 렌더링 비용이 일정하게 유지됨 |
| 토큰 관리 | access + refresh 분리, Redis 블랙리스트 | 짧은 만료로 탈취 위험을 줄이고 로그아웃 토큰을 즉시 차단 |
| 인증코드 저장 | Redis TTL | 만료 처리를 DB 정리 작업 없이 자동화 |
| 스키마 관리 | Flyway | 서버 기동 시 자동 마이그레이션, 버전으로 이력 추적 |
