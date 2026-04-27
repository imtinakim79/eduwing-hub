# EduWing Hub — Claude 참조 문서

> 이 파일은 Claude가 매 대화 시작 시 자동으로 읽습니다.
> UI 구현 중심 프로젝트. 백엔드 없이 프론트 단독(App.tsx 상태 + localStorage) 운영.
> 추후 Supabase 연동 예정 — api/ 레이어를 교체하는 방식으로 전환 계획.

---

## 기술 스택

- React + TypeScript + Vite
- 스타일: 인라인 style 객체만 사용 (Tailwind 없음)
- CSS 변수: `var(--font-ko)`, `var(--font-en)`, `var(--color-primary)` 등
- 상태관리: App.tsx useState (전역), localStorage (세션 간 유지)
- 언어: 한국어 + 영어 공통 지원 목표

---

## 페이지 구조 & 네비게이션

Figma 파일 키: `XmgyfWmnLUpJCz6EYPv4hE`
Figma URL 패턴: `https://www.figma.com/design/XmgyfWmnLUpJCz6EYPv4hE/EduWing-Hub?node-id={node-id}`

```
App.tsx (page 상태로 라우팅)
├── students        → StudentBoardPage      [Figma:49:5613 ]
├── addStudent      → AddStudentPage        [Figma:329:1983] (신규/수정 겸용, editStudentId로 구분)
├── studentDetail   → StudentDetailPage     [Figma:448:1991]
├── camps           → CampBoardPage         [Figma:472:5113]
├── campDetail      → CampDetailPage        [Figma:496:2735]
├── campCreate      → CampCreatePage         [Figma:488:2855](신규/수정 겸용)
├── camptimetableDetail      → (미구현)      [Figma:511:3144]
├── camptimetableCreate      → (미구현)      [Figma:529:5774](신규/수정 겸용)
├── gallery         → CellGalleryPage       [Figma:         ] (삭제함)
└── dashboard/agent/board/account → ComingSoon
```

**네비게이션 흐름:**

| 현재 페이지        | 액션      | 이동 페이지                    | 전달값                   |
| ------------- | ------- | ------------------------- | --------------------- |
| students      | + 버튼    | addStudent                | -                     |
| students      | 행 클릭    | studentDetail             | studentId             |
| addStudent    | 저장 (신규) | students                  | -                     |
| addStudent    | 저장 (수정) | studentDetail             | studentId             |
| addStudent    | 뒤로      | students 또는 studentDetail | -                     |
| studentDetail | 수정 버튼   | addStudent                | editStudentId         |
| studentDetail | 뒤로      | students                  | -                     |
| camps         | 행 클릭    | campDetail                | campId                |
| camps         | + 버튼    | campCreate                | tab: '학생명단'           |
| campDetail    | 뒤로      | camps                     | -                     |
| campDetail    | 정보수정    | campCreate                | tab: 현재 activeCampTab |
| campCreate    | 저장      | camps                     | -                     |

**App.tsx navigate() 시그니처:**
```ts
navigate(page, { campId?, studentId?, editId?, tab? })
```

**App.tsx 전역 상태 목록:**

| 상태                | 타입          | 역할           |
| ----------------- | ----------- | ------------ |
| `page`            | `Page`      | 현재 활성 페이지    |
| `activeCampId`    | `string`    | 현재 열린 캠프 ID  |
| `activeStudentId` | `string`    | 현재 열린 학생 ID  |
| `editStudentId`   | `string`    | 수정 중인 학생 ID  |
| `activeCampTab`   | `CampTab`   | 캠프 페이지의 활성 탭 |
| `students`        | `Student[]` | 전체 학생 목록     |

**`CampTab` 타입** (`src/App.tsx`에서 export):
```ts
export type CampTab = '학생명단' | '시간표' | '숙박정보' | '스탭&강사';
```

| 탭 | Figma 노드 | 구현 상태 | 컴포넌트 |
|---|---|---|---|
| 학생명단 | `534:5316` | ✅ 구현 | `CampUserBoardPage` |
| 시간표 | `511:3204` (상세) / `529:5820` (생성) | ✅ 구현 | `CampTimetableView` / `CampTimetableEdit` |
| 숙박정보 | - | ✅ 구현 | `CampAccommodationTab` |
| 스탭&강사 | - | ✅ 구현 | `CampStaffTab` |

- `CampDetailPage`와 `CampCreatePage`가 공유하는 탭 타입
- 탭 전환 시 `navigate('campDetail', { tab: '시간표' })` 형태로 호출
- `NavState`에 포함되어 브라우저 뒤로가기 시 탭 위치도 복원됨
- 각 페이지는 내부 `useState` 없이 `activeTab` / `onTabChange` props로만 제어

---

## 엔티티 관계

### 전체 관계 구조 (B안 — Supabase 구조 선제 반영)

```
students ──────────────────────────────────────────── camps
  id (PK)                                               id (PK)
  name_ko / name_en                                     name
  gender / birth_date / age                             location / country
  guardian { name, relation, contact, email }           accommodation        ← 기본 숙소명
  history { joined_date, agent_id }                     accommodation_options[]  ← 선택 가능한 룸타입 목록
                                                        start_date / end_date
           ↓                                            capacity / status
     student_camps (조인 테이블, M:N)                   staff[] / teachers[]
       student_id  FK → students.id                     timetable  (별도 저장)
       camp_id     FK → camps.id
       ──── 학생×캠프 고유 데이터 ────
       selected_room_type   ← camp.accommodation_options 중 선택
       hotel_check_in / hotel_check_out
       flight_outbound { flight_no, departure, arrival, datetime }
       flight_return   { flight_no, departure, arrival, datetime }
       passport_no / passport_name
       status  (enrolled | cancelled | waitlist)
```

### 3계층 데이터 분류

| 계층 | 소유 엔티티 | 데이터 내용 | 변경 주체 |
|---|---|---|---|
| **학생 프로필** | `students` | 이름·나이·보호자·에이전트 | AddStudentPage |
| **캠프 마스터** | `camps` | 기간·지역·숙소 옵션 목록·스탭·강사·시간표 | CampCreatePage |
| **참여 기록** | `student_camps` | 등록 상태·선택 룸타입·항공편·여권 | StudentDetailPage (캠프탭) |

---

### 필드별 생성 시점 정의

각 필드가 **어느 페이지의 어느 탭**에서 최초 생성/편집되는지 명시한다.

#### camps 테이블 — CampCreatePage에서 작성

| 필드 | 탭 | 설명 |
|---|---|---|
| `name` `id` `location` `country` `accommodation` `capacity` `status` `start_date` `end_date` | 기본 정보 (탭 외부) | 캠프 헤더 폼에서 직접 입력 |
| `timetable` | 시간표 탭 | 주차별 일정 격자 입력 → localStorage `ew-timetable-{cid}` |
| `accommodation_options[]` | 숙박정보 탭 | 호텔명·룸타입·가격 옵션 목록 정의 → localStorage `ew-hotels-{cid}` |
| `staff[]` `teachers[]` | 스탭&강사 탭 | 캠프 담당 스탭·강사 목록 → localStorage `ew-campstaff-{cid}` |

> `accommodation_options`는 캠프가 **제공 가능한 룸타입 목록**을 정의하는 것이지,
> 학생별 선택값이 아니다. 학생 선택은 아래 `student_camps`에 저장된다.

#### student_camps 테이블 — StudentDetailPage에서 작성

학생이 특정 캠프 탭을 열었을 때 입력하는 데이터. 캠프마다 별도로 존재한다.

| 필드 | 입력 위치 | 설명 |
|---|---|---|
| `student_id` `camp_id` `status` | CampDetailPage 학생명단 탭 | 학생을 캠프에 등록할 때 레코드 생성 |
| `selected_room_type` | StudentDetailPage > 캠프탭 > 호텔 정보 | `camp.accommodation_options` 중 하나 선택 |
| `hotel_check_in` `hotel_check_out` | StudentDetailPage > 캠프탭 > 호텔 정보 | 학생 개인 체크인/아웃 날짜 |
| `flight_outbound` | StudentDetailPage > 캠프탭 > 항공 정보 | 출발편 (편명·출발지·도착지·일시) |
| `flight_return` | StudentDetailPage > 캠프탭 > 항공 정보 | 귀국편 (편명·출발지·도착지·일시) |
| `passport_no` `passport_name` | StudentDetailPage > 캠프탭 > 항공 정보 | 여권번호·여권상 이름 |

> **핵심 원칙**: 같은 학생이라도 캠프마다 룸타입·항공편이 다를 수 있다.
> `student_camps`는 `(student_id, camp_id)` 복합키로 구분된 독립 레코드다.

#### 현재 localStorage 키 매핑

```
ew-timetable-{cid}          → camps.timetable
ew-timetable-range-{cid}    → camps.start_date / end_date (시간표용 기간)
ew-hotels-{cid}             → camps.accommodation_options[]
ew-campstaff-{cid}          → camps.staff[] / teachers[]
ew-hotel-{sid}-{cid}        → student_camps.selected_room_type + check_in/out
ew-flight-{sid}-{cid}       → student_camps.flight_outbound + flight_return + passport
ew-family-{sid}             → (별도 테이블 예정, camps와 무관한 학생 가족 정보)
```

---

### student_camps 조회 패턴

```
[CampDetailPage 학생명단 탭]
  student_camps.filter(sc => sc.camp_id === campId)
  → 해당 캠프에 등록된 학생 목록

[StudentDetailPage 캠프 탭]
  student_camps.filter(sc => sc.student_id === studentId)
  → 해당 학생이 참여한 캠프 이력 (시간순)
  → 각 탭: 선택한 룸타입, 항공편, 여권 정보 표시
```

### Supabase 전환 시 SQL 대응

```sql
-- 테이블 정의
students         (id PK, name_ko, name_en, gender, birth_date, age, agent_id, joined_date, guardian jsonb)
camps            (id PK, name, location, country, accommodation, accommodation_options jsonb,
                  capacity, status, start_date, end_date, staff text[], teachers text[])
student_camps    (id PK, student_id FK→students.id, camp_id FK→camps.id,
                  selected_room_type text, hotel_check_in date, hotel_check_out date,
                  flight_outbound jsonb, flight_return jsonb,
                  passport_no text, passport_name text, status text)

-- 특정 캠프 학생 목록
SELECT s.*, sc.*
FROM student_camps sc JOIN students s ON s.id = sc.student_id
WHERE sc.camp_id = :campId AND sc.status = 'enrolled';

-- 학생의 캠프 참여 이력
SELECT c.*, sc.*
FROM student_camps sc JOIN camps c ON c.id = sc.camp_id
WHERE sc.student_id = :studentId
ORDER BY c.start_date ASC;

-- 캠프 룸타입 선택
UPDATE student_camps SET selected_room_type = :roomType
WHERE student_id = :studentId AND camp_id = :campId;
```

### 엔티티 스키마 위치 (현재 구현)

| Entity | 현재 저장 위치 | 생성 페이지 | Supabase 테이블 |
|---|---|---|---|
| Student | `students.json` + App.tsx useState | AddStudentPage | `students` |
| Camp | `camps.json` (목업) + App.tsx useState + localStorage(`ew-camps`) | CampCreatePage | `camps` |
| StudentCamp | localStorage `ew-hotel-{sid}-{cid}`, `ew-flight-{sid}-{cid}` | StudentDetailPage | `student_camps` |

> **현재 `students.json`의 `history.current_camp_id` / `history.previous_camps`는 과도기적 표현이다.**
> Supabase 전환 시 이 필드는 제거되고 `student_camps` 테이블로 완전 대체된다.
> 프론트에서 "현재 캠프"는 `student_camps WHERE status='enrolled' ORDER BY camp.start_date DESC LIMIT 1`로 도출한다.

### 데이터 실존 원칙

- `camps.json` 목업 데이터를 포함. localStorage `ew-camps` 가 비어 있을 때 초기값으로 사용
- localStorage `ew-camps` 가 있으면 우선 적용 (사용자 편집 내용 유지), 병합 방식으로 처리
- 학생의 `current_camp_id` / `previous_camps` 에는 실제 존재하는 캠프 ID만 참조 가능

### 캠프 변경 시 자동 이력 관리 규칙 (과도기)

`current_camp_id` 가 변경될 때마다 아래 로직이 자동 실행된다:

```
1. 기존 current_camp_id → previous_camps[] 끝에 추가 (생성 순서 = 참여 순서)
2. 새 current_camp_id 가 previous_camps 에 있으면 제거 (중복 방지)
3. previous_camps 는 오래된 캠프부터 최근 캠프 순으로 정렬 유지
```

적용 위치:
- `AddStudentPage` → `handleSave()` 내부
- `StudentBoardPage` → `applyEdit()` `case 'current_camp_id'` 블록

> Supabase 전환 후에는 이 로직이 제거되고 `student_camps` INSERT/UPDATE로 대체된다.

### StudentDetailPage 캠프 탭 표시 순서

```ts
const campIds = [...student.history.previous_camps, student.history.current_camp_id]
// → [현재 캠프, 직전 캠프..., 가장 오래된 캠프]
```

- 탭은 참여 순서대로 오른쪽 → 왼쪽 배열
- 현재 소속 캠프에만 "참여중지 표시
- 탭 레이블은 camp ID 대신 `campMap[id].name` (캠프 이름) 표시
- 각 탭 내: 해당 캠프에서의 룸타입·항공편·여권 정보 표시 (localStorage `ew-hotel-{sid}-{cid}`, `ew-flight-{sid}-{cid}`)

---

## 데이터 관리 방식

| 데이터 | 저장 위치 | Supabase 대응 테이블 | 범위 |
|---|---|---|---|
| students[] | App.tsx useState (defaultStudents) | `students` | 새로고침 시 리셋 |
| camps[] | camps.json 목업 + App.tsx useState + localStorage(`ew-camps`) | `camps` | 브라우저 유지 |
| Hotel Info (선택 룸타입) | localStorage `ew-hotel-{sid}-{cid}` | `student_camps` | 브라우저 유지 |
| Flight Info | localStorage `ew-flight-{sid}-{cid}` | `student_camps` | 브라우저 유지 |
| Family Info | localStorage `ew-family-{sid}` | (별도 테이블 예정) | 브라우저 유지 |
| Timetable | localStorage `ew-timetable-{cid}` | `camp_schedules` | 브라우저 유지 |
| Camp Staff | localStorage `ew-campstaff-{cid}` | `camps` 또는 별도 | 브라우저 유지 |

---

## 주요 컴포넌트

### 공용 셀 컴포넌트 (`src/components/board/cells.tsx`)
| 컴포넌트 | 용도 |
|---|---|
| `CalendarCell` | 날짜 선택 (오버레이 달력) |
| `CalendarTimeCell` | 날짜+시간 선택 (AM/PM 토글 + Apply) |
| `DropdownCell` | 단일 선택 드롭다운 |
| `MultiDropdownCell` | 다중 선택 드롭다운 |
| `CalendarRangeCell` | 날짜 범위 선택 |
| `GenderCell` | 성별 선택 |
| `TagsCell` | 태그 목록 표시 |
| `ThumbnailCell` | 이름+프로필 이미지 |

**CellBox 패턴** — CalendarCell/DropdownCell은 반드시 CellBox 안에 넣어야 함:
```tsx
// height:100% + margin:'0 -12px' 가 CellBox의 height:CELL_H + padding:'0 12px'에 의존
<CellBox>
  <CalendarCell ... />
</CellBox>
```

### BoardTable (`src/components/board/BoardTable.tsx`)
- 정렬/선택/인라인편집 공통 테이블
- `columns: ColumnDef<T>[]` 로 컬럼 정의
- `onRowClick` 으로 행 클릭 처리

### StudentDetailPage 섹션
| 섹션 | 저장 키 | 내용 |
|---|---|---|
| Hotel Info. | `ew-hotel-{sid}-{cid}` | checkIn/checkOut/rooms |
| Flight Info. | `ew-flight-{sid}-{cid}` | passportNo/Name, 출발편/귀국편 |
| Family Info. | `ew-family-{sid}` | 가족 구성원 목록 |

---

## 새 기능 추가 시 설명 템플릿

```
기능: [기능명]
- 트리거: [어느 페이지의 어느 버튼]
- 쓰는 곳: [데이터 저장 위치]
- 읽는 곳: [이 데이터를 표시하는 페이지들]
- 연결: [엔티티 간 관계, 예: Camp.id → Student.history.current_camp_id]
- Figma: [node ID 있으면 기재]
```

---

## 현재 미구현 (예정)

- 캠프 데이터 App.tsx 상태로 통합 (현재 정적 JSON, CampCreatePage 저장 미연결)
- Supabase 연동 (UI 완성 후)
- 다국어(i18n) 처리
