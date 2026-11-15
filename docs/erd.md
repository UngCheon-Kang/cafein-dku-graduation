# 데이터베이스 ERD

PostgreSQL + PostGIS. 스키마는 Flyway로 관리하며 현재 V11까지 적용되어 있습니다.
(`backend/src/main/resources/db/migration/`)

## 사용자 · 카페 · 리뷰

```mermaid
erDiagram
    users ||--o{ review : "작성"
    users ||--o{ cafe_bookmark : "북마크"
    users ||--o{ suspension : "이용 정지"
    cafe ||--o{ review : "받음"
    cafe ||--o{ cafe_images : "대표 이미지"
    cafe ||--o{ cafe_bookmark : ""
    review ||--o{ review_image : "첨부"

    users {
        bigint id PK
        varchar email "로그인 ID"
        varchar email_canonical "중복 판정용 (V11)"
        varchar password "소셜 로그인은 null"
        varchar nickname UK
        varchar provider "LOCAL/KAKAO/APPLE/NAVER"
        varchar provider_id "소셜 고유 ID"
        varchar status "ACTIVE/SUSPENDED/DELETED"
        varchar profile_image_key
        varchar push_token
        boolean admin
    }
    cafe {
        bigint id PK
        varchar kakao_place_id UK
        varchar name
        varchar address
        double latitude
        double longitude
        double score "평균 평점"
        integer review_count
        boolean hidden "관리자 숨김 (V9)"
    }
    review {
        bigint id PK
        bigint user_id FK
        bigint cafe_id FK
        text content
        double score
        varchar wifi_score "SLOW/NORMAL/FAST"
        varchar outlet_score "FEW/NORMAL/MANY"
        varchar seat_score "FEW/NORMAL/MANY"
        varchar noise_score "QUIET/NORMAL/LOUD"
        varchar status "V4"
    }
```

## 커뮤니티 · 스터디

```mermaid
erDiagram
    users ||--o{ feed : "작성"
    users ||--o{ comment : "작성"
    users ||--o{ feed_like : "좋아요"
    users ||--o{ feed_view : "조회"
    users ||--o{ study_application : "신청"
    cafe ||--o{ feed : "카페 추천글"
    feed ||--o{ feed_image : "첨부"
    feed ||--o{ comment : ""
    feed ||--o{ feed_like : ""
    feed ||--o{ feed_view : ""
    feed ||--o| study_recruit : "스터디 모집"
    study_recruit ||--o{ study_application : ""
    comment ||--o{ comment : "대댓글"

    feed {
        bigint id PK
        bigint user_id FK
        bigint cafe_id FK "카페 추천글만"
        varchar feed_type "FREE/CAFE_REC/STUDY"
        varchar title
        text content
        integer like_count
        integer comment_count
        integer view_count
    }
    feed_view {
        bigint id PK
        bigint feed_id FK
        bigint user_id FK
        date viewed_date "하루 1회만 집계"
    }
    study_recruit {
        bigint id PK
        bigint feed_id FK
        varchar location
        timestamp meet_at
        integer capacity
        integer current_count
        varchar status "RECRUITING/CLOSED"
    }
    study_application {
        bigint id PK
        bigint study_recruit_id FK
        bigint user_id FK
        varchar status "PENDING/ACCEPTED/REJECTED"
    }
```

## 채팅 · 알림 · 신고

```mermaid
erDiagram
    users ||--o{ chat_message : "발신"
    users ||--o{ notification : "수신"
    users ||--o{ report : "신고"
    users ||--o{ block : "차단"
    chat_room ||--o{ chat_message : ""

    chat_room {
        bigint id PK
        bigint user1_id FK
        bigint user2_id FK
        timestamp last_message_at
    }
    chat_message {
        bigint id PK
        bigint chat_room_id FK
        bigint sender_id FK
        text content
        boolean read
    }
    notification {
        bigint id PK
        bigint user_id FK
        varchar type "댓글/좋아요/채팅/스터디"
        bigint target_id
        boolean read
    }
    report {
        bigint id PK
        bigint reporter_id FK
        bigint target_id
        varchar target_type "FEED/COMMENT/CHAT_ROOM"
        varchar reason "SPAM/ABUSE/OBSCENE/ETC"
        varchar status "PENDING/RESOLVED/REJECTED"
        varchar resolution "V7"
    }
    block {
        bigint id PK
        bigint blocker_id FK
        bigint blocked_id FK
    }
```

## 마이그레이션 이력

| 버전 | 내용 |
|---|---|
| V1 | 초기 스키마 |
| V2 | 레거시 image_url 컬럼 제거 |
| V3 | 인덱스 추가 |
| V4 | 리뷰 상태 컬럼 |
| V5 | 이용 정지(suspension) 테이블 |
| V6 | 신고 대상 타입 제약 수정 |
| V7 | 신고 처리 결과 컬럼 |
| V8 | 푸시 토큰 컬럼 |
| V9 | 카페 출처·숨김 컬럼 |
| V10 | 탈퇴 시 소셜 provider_id 해제 |
| V11 | 이메일 별칭 중복가입 차단용 email_canonical |
