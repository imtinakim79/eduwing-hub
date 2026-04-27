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
├── campCreate      → CampCreatePage        [Figma:488:2855] (신규/수정 겸용)
└── dashboard/agent/board/account → ComingSoon
```

**네비게이션 흐름:**

| 현재 페이지   | 액션       | 이동 페이지          | 전달값                  |
|-------------|----------|-------------------|----------------------|
| students    | + 버튼     | addStudent        | -                    |
| students    | 행 클릭     | studentDetail     | studentId            |
| addStudent  | 저장 (신규)  | students          | -                    |
| addStudent  | 저장 (수정)  | studentDetail     | studentId            |
| addStudent  | 뒤로       | students 또는 studentDetail | -           |
| studentDetail | 수정 버튼  | addStudent        | editStudentId        |
| studentDetail | 뒤로      | students          | -                    |
| camps       | 행 클릭     | campDetail        | campId               |
| camps       | + 버튼     | campCreate        | tab: 'Students'      |
| campDetail  | 뒤로       | camps             | -                    |
| campDetail  | 정보수정    | campCreate        | tab: 현재 activeCampTab |
| campCreate  | 저장       | camps             | -                    |

**App.tsx navigate() 시그니처:**
```ts
navigate(page, { campId?, studentId?, editId?, tab? })
```

**App.tsx 전역 상태 목록:**

| 상태 | 타입 | 역할 |
|---|---|---|
| `page` | `Page` | 현재 활성 페이지 |
| `activeCampId` | `string` | 현재 열린 캠프 ID |
| `activeStudentId` | `string` | 현재 열린 학생 ID |
| `editStudentId` | `string` | 수정 중인 학생 ID |
| `activeCampTab` | `CampTab` | 캠프 페이지의 활성 탭 |
| `students` | `Student[]` | 전체 학생 목록 |

**`CampTab` 타입** (`src/App.tsx`에서 export):
```ts
export type CampTab = 'Students' | 'Accommodation' | 'Staff' | 'Class' | 'Timetable';
```

| 탭 | 구현 상태 | 컴포넌트 |
|---|---|---|
| Students | ✅ | `CampUserBoardPage` |
| Accommodation | ✅ | `CampAccommodationTab` |
| Staff | ✅ | `CampStaffTab` |
| Class | ✅ | `CampClassTab` |
| Timetable | ✅ | `CampTimetableView` / `CampTimetableEdit` (클래스별 분리) |

- `CampDetailPage`와 `CampCreatePage`가 공유하는 탭 타입
- `NavState`에 포함되어 브라우저 뒤로가기 시 탭 위치도 복원됨
- 각 페이지는 내부 `useState` 없이 `activeTab` / `onTabChange` props로만 제어
- **Timetable 탭은 Class 탭에 클래스가 하나 이상 있어야 활성화됨**

---

## 엔티티 관계

### 전체 관계 구조

```
agents                    students ──────────────────────────── camps
  id (PK)          ┌────── id (PK)                               id (PK)
  name             │       name_ko / name_en                     name / location / country
  contact_name     │       gender / birth_date / age             accommodation
  contact_phone    │       guardian { name, relation,            accommodation_options[]
  contact_email    │                  contact, email }           start_date / end_date
        ↑          │       history {                             capacity / status
        └──────────┘         joined_date,                        staff[]
    agent_id (M:1)           agent_id  FK → agents.id                ↓
                           }                              ew-classes-{campId}
                                    ↓                      ClassLevel[]
                             student_camps (M:N)             id, name
                               student_id FK → students.id   teacher
                               camp_id    FK → camps.id      studentIds[]  ← 배정된 학생 목록
                               stay { roomtype, check_in/out }
                               flight { 편명, 여권, 출발/귀국 }
                               status (enrolled | cancelled | waitlist)
```

- 에이전트는 학생을 캠프에 연결해주는 업체. 학생 1명은 에이전트 1개에 귀속 (M:1)
- 에이전트 마스터는 AgentBoardPage에서 독립 관리. 학생·캠프와 직접 연결되지 않음
- ClassLevel은 camps에 종속 (1:N). 학생 배정은 studentIds[]로 참조

### 데이터 생성 의존성 순서

```
[독립 생성 — 서로 순서 무관]

에이전트 등록              캠프 생성 (CampCreatePage)          학생 등록 (AddStudentPage)
(AgentBoardPage)           ├─ Accommodation 탭 (호텔·룸타입)    └─ 에이전트 선택
                           ├─ Staff 탭 (스탭 배정)
                           ├─ Class 탭 (클래스·강사 정의)  ← 먼저 있어야 Timetable 활성화
                           └─ Timetable 탭 (클래스별 시간표)

                ↓ 캠프 + 학생 둘 다 있어야 가능
         캠프에 학생 배정 (CampDetailPage Students 탭)  ← 유일한 배정 경로
            └─ 클래스 배정 (CampDetailPage Class 탭)
            └─ 학생 참여 정보 입력 (StudentDetailPage 캠프탭)
                 · 룸타입 선택  ← Accommodation 탭 옵션이 먼저 있어야 함
                 · 항공편 / 여권
```

---

## 필드별 쓰기·읽기 소유 관계

> 각 필드의 **쓰기(생성·수정) 주체**와 **읽는 곳(표시·참조)** 을 모두 기록한다.
> ❌ 는 읽어야 하지만 아직 구현되지 않은 소비처(갭).
> ⚠️ 는 설계 결정이 필요한 항목.

### agents[]  — `ew-agents`

| 필드 | 쓰기 | 읽는 곳 |
|---|---|---|
| id, name, contact_name, contact_phone, contact_email | AgentBoardPage (인라인) | AddStudentPage (드롭다운), StudentBoardPage (에이전트 컬럼), CampUserBoardPage (에이전트 컬럼) |

### students[]  — `ew-students`

| 필드 | 쓰기 | 읽는 곳 |
|---|---|---|
| name_ko, name_en, gender, birth_date, age | AddStudentPage | StudentBoardPage, StudentDetailPage |
| guardian (name, relation, contact, email) | AddStudentPage | StudentDetailPage |
| history.agent_id | AddStudentPage, StudentBoardPage (인라인) | StudentBoardPage, StudentDetailPage, CampUserBoardPage |
| history.current_camp_id / previous_camps | AddStudentPage 저장 로직, StudentBoardPage (인라인) | StudentBoardPage (현재 캠프 컬럼), StudentDetailPage (캠프 탭 목록) |
| **camp_records[].camp_id, status** | **CampDetailPage Students 탭** | CampUserBoardPage, StudentDetailPage, StudentBoardPage |
| camp_records[].stay (roomtype, check_in/out) | StudentDetailPage 캠프탭 호텔정보 | StudentDetailPage |
| camp_records[].flight (편명, 여권) | StudentDetailPage 캠프탭 항공정보 | StudentDetailPage |

> `camp_records[]`는 `Student` 객체에 embedded 저장. 별도 localStorage 키 없음.
> 같은 학생이라도 캠프마다 룸타입·항공편이 다를 수 있다 — `camp_id`로 구분되는 독립 레코드.

### camps[]  — `ew-camps`

| 필드 | 쓰기 | 읽는 곳 | 비고 |
|---|---|---|---|
| name, location, country | CampCreatePage 기본 정보 | CampBoardPage, CampDetailPage 헤더 | 직접 입력 |
| capacity, status | CampCreatePage 기본 정보 / CampBoardPage (status 인라인) | CampBoardPage, CampDetailPage 헤더 | 직접 입력 |
| accommodation | CampAccommodationTab → onHotelsChange 콜백 | CampDetailPage 헤더, StudentDetailPage 호텔 섹션 | DisabledInput — 탭에서만 수정 |
| start_date, end_date | CampTimetableEdit → onDateRangeChange 콜백 | CampBoardPage, CampDetailPage 헤더 | DisabledInput — 탭에서만 수정 |
| staff[] | CampStaffTab → onStaffChange 콜백 | CampBoardPage (스탭 컬럼), CampDetailPage 헤더 | DisabledInput — 탭에서만 수정 |

### ew-classes-{campId}  (ClassLevel[])

| 필드 | 쓰기 | 읽는 곳 |
|---|---|---|
| name | CampClassTab | CampDetailPage Timetable 서브탭, CampBoardPage TimetableModal 서브탭 |
| teacher | CampClassTab | CampDetailPage Timetable 서브탭 (보조텍스트) |
| studentIds[] | CampClassTab (체크박스 배정) | CampClassTab (체크박스 상태) |

**미구현 소비처 (갭):**
- ❌ `name`, `studentIds[]` → CampUserBoardPage 학생명단에 "소속 클래스" 컬럼 없음
- ❌ `name`, `studentIds[]` → StudentDetailPage 캠프 섹션에 "소속 클래스" 표시 없음
- ❌ `teacher` → CampDetailPage 헤더 및 CampUserBoardPage에 강사 표시 없음

### ew-campstaff-{campId}

| 필드 | 쓰기 | 읽는 곳 |
|---|---|---|
| staffIds[] | CampStaffTab | StaffCompletedView, camp.staff[] 동기화 |

### ew-hotels-{campId}  (Hotel[])

| 필드 | 쓰기 | 읽는 곳 |
|---|---|---|
| Hotel.name | CampAccommodationTab | HotelCompletedView, camp.accommodation 동기화 |
| Hotel.roomTypes[].name, extraBed | CampAccommodationTab | StudentDetailPage 룸타입 드롭다운 옵션 |

### ew-timetable-{campId}-{classId}  /  ew-timetable-range-{campId}-{classId}

| 필드 | 쓰기 | 읽는 곳 |
|---|---|---|
| data (TimetableData), merges[] | CampTimetableEdit | CampTimetableView (CampDetailPage), CampBoardPage TimetableModal |
| range (start, end) | CampTimetableEdit | CampTimetableView (주차 생성), camp.start_date/end_date 동기화 |

> 시간표는 클래스별로 독립 저장. classId 없이 campId만 있으면 `ew-timetable-{campId}` (하위호환).

### localStorage 키 전체 목록 (현행)

```
ew-camps                           → camps[] 전체 목록 (App.tsx)
ew-students                        → students[] 전체 목록 (App.tsx)
ew-agents                          → agents[] 전체 목록 (App.tsx)
ew-tab-status-{cid}                → 탭별 편집 저장/취소 상태 (TabCard.tsx)
ew-classes-{cid}                   → ClassLevel[] — 클래스명·강사·학생 배정 (CampClassTab)
ew-timetable-{cid}-{classId}       → 시간표 data + merges (CampTimetableEdit)
ew-timetable-range-{cid}-{classId} → 시간표 기간 start/end (CampTimetableEdit)
ew-hotels-{cid}                    → accommodation_options[] (CampAccommodationTab)
ew-campstaff-{cid}                 → staffIds[] (CampStaffTab)
ew-family-{sid}                    → 가족 구성원 목록 (StudentDetailPage — 입력 UI 미구현)
```

---

## 엔티티 스키마 & Supabase 대응

### 현재 저장 위치

| Entity | 현재 저장 | 생성 주체 | Supabase 테이블 |
|---|---|---|---|
| Agent | App.tsx useState + `ew-agents` | AgentBoardPage | `agents` |
| Student | App.tsx useState + `ew-students` | AddStudentPage | `students` |
| Camp | camps.json 목업 + App.tsx useState + `ew-camps` | CampCreatePage | `camps` |
| StudentCamp | Student.camp_records[] (ew-students에 embedded) | CampDetailPage(배정), StudentDetailPage(상세) | `student_camps` |
| ClassLevel | `ew-classes-{cid}` | CampClassTab | `camp_classes` (예정) |
| Timetable | `ew-timetable-{cid}-{classId}` | CampTimetableEdit | `camp_schedules` (예정) |

### Supabase 전환 시 SQL 대응

```sql
students      (id PK, name_ko, name_en, gender, birth_date, age, agent_id, joined_date, guardian jsonb)
camps         (id PK, name, location, country, accommodation, accommodation_options jsonb,
               capacity, status, start_date, end_date, staff text[])
camp_classes  (id PK, camp_id FK→camps.id, name, teacher, student_ids text[])
student_camps (id PK, student_id FK→students.id, camp_id FK→camps.id,
               selected_room_type text, hotel_check_in date, hotel_check_out date,
               flight_outbound jsonb, flight_return jsonb,
               passport_no text, passport_name text, status text)

-- 특정 캠프 학생 목록 + 클래스 정보
SELECT s.*, sc.*, cc.name AS class_name
FROM student_camps sc
JOIN students s ON s.id = sc.student_id
LEFT JOIN camp_classes cc ON cc.camp_id = sc.camp_id AND sc.student_id = ANY(cc.student_ids)
WHERE sc.camp_id = :campId AND sc.status = 'enrolled';
```

> `students.history.current_camp_id` / `previous_camps`는 과도기적 표현.
> Supabase 전환 시 `student_camps` 테이블로 완전 대체된다.

### 데이터 실존 원칙

- `camps.json` 목업 데이터 포함. localStorage `ew-camps`가 없으면 초기값으로 사용
- localStorage 값이 있으면 우선 적용, 병합 방식으로 처리
- 학생의 `current_camp_id` / `previous_camps`에는 실제 존재하는 캠프 ID만 참조 가능

### student_camps 조회 패턴

```
[CampDetailPage Students 탭]
  students.filter(s => s.camp_records.some(r => r.camp_id === campId))
  → 해당 캠프에 등록된 학생 목록

[StudentDetailPage 캠프 탭]
  student.camp_records (현재 캠프 + 이전 캠프 이력)
  → 각 탭: 선택한 룸타입, 항공편, 여권 정보 표시
```

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

---

## 새 기능 추가 시 설명 템플릿

```
기능: [기능명]
- 트리거: [어느 페이지의 어느 버튼]
- 쓰는 곳: [데이터 저장 위치]
- 읽는 곳: [이 데이터를 표시하는 페이지들]
- 연결: [엔티티 간 관계]
- Figma: [node ID 있으면 기재]
```

---

## 작업 원칙

- 구현 전 반드시 계획을 먼저 제시하고 승인을 받는다.

---

## 현재 미구현 / 갭

### 구현 갭 (데이터는 있지만 읽는 곳 없음)

| 우선순위 | 갭 | 영향 |
|---|---|---|
| 낮음 | CampUserBoardPage → StudentDetailPage 딥링크 (campId 전달, 해당 캠프 탭 자동 선택) | 캠프 컨텍스트 없이 열려 current_camp_id 탭으로 fallback |
### 데이터 입력 UI 미구현

없음 — 현재 모든 입력 UI 구현 완료.

### 기타 예정

- Supabase 연동 (UI 완성 후) — `api/` 레이어 교체 방식
- 다국어(i18n) 처리
