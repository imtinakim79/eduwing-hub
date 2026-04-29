# 프론트엔드 앱에서 데이터 소유 관계 정리하기

## 1. 도입부

> "학생 명단을 한번 삭제하면 복구가 안되잖아? 캠프 삭제는 학생 명단이 있으면 안되고, 에이전시 삭제는 어때?"

EduWing Hub 프로젝트는 백엔드 없이 React + localStorage만으로 운영되는 어드민 앱이다. 기능이 늘어날수록 "이 데이터를 누가 쓰고, 누가 읽고, 삭제하면 어디가 깨지는가"를 명확하게 정리할 필요가 생겼다.

> "작업 내역을 정리해줘 — 학생 삭제, 캠프 삭제, 에이전시 삭제 각각 어떻게 처리할지"

이 질문에서 출발해 엔티티별 **쓰기 주체 / 읽는 곳 / 삭제 시 영향 범위**를 한눈에 볼 수 있는 소유 관계 지도를 만들었다. 이 구조를 명확히 잡아두면 나중에 Supabase 연동 시 어느 테이블이 어느 컴포넌트에 대응하는지 바로 매핑할 수 있다.

---

## 2. 본문 — 데이터 소유 관계 정리 방법

### Step 1. 엔티티 목록과 저장 위치를 먼저 파악한다

백엔드가 없는 앱이라도 "어디에 저장되는가"는 반드시 명시해야 한다.

| 엔티티 | 저장 위치 | 생성 주체 |
|---|---|---|
| `agents[]` | `localStorage: ew-agents` | AgentBoardPage |
| `students[]` | `localStorage: ew-students` | AddStudentPage |
| `camps[]` | `camps.json` + `localStorage: ew-camps` | CampCreatePage |
| `camp_records[]` | `students[]`에 embedded | CampDetailPage(배정), StudentDetailPage(상세) |
| `ClassLevel[]` | `localStorage: ew-classes-{campId}` | CampClassTab |
| Timetable | `localStorage: ew-timetable-{campId}-{classId}` | CampTimetableEdit |

> 핵심 원칙: **저장 위치가 다르면 삭제 로직도 달라야 한다.**

---

### Step 2. 필드별로 "쓰는 곳"과 "읽는 곳"을 분리해서 표로 정리한다

단순히 CRUD를 나열하는 것이 아니라, **어느 컴포넌트가 이 필드를 수정하는가 / 어느 컴포넌트가 이 필드를 화면에 표시하는가**를 분리한다.

#### agents[]

| 필드 | 쓰기 주체 | 읽는 곳 |
|---|---|---|
| id, name, contact_name, contact_phone, contact_email | AgentBoardPage (인라인 편집) | AddStudentPage (드롭다운), StudentBoardPage (Agent 컬럼), CampUserBoardPage (Agent 컬럼) |

#### students[]

| 필드                                             | 쓰기 주체                                     | 읽는 곳                                                              |
| ---------------------------------------------- | ----------------------------------------- | ----------------------------------------------------------------- |
| name_ko                                        | AddStudentPage                            | StudentBoardPage (이름 컬럼), StudentDetailPage, CampUserBoardPage    |
| name_en                                        | AddStudentPage                            | StudentBoardPage (이름 컬럼), StudentDetailPage, CampUserBoardPage    |
| gender                                         | AddStudentPage, StudentBoardPage (인라인 변경) | StudentBoardPage, StudentDetailPage, CampUserBoardPage            |
| birth_date                                     | AddStudentPage, StudentBoardPage (인라인 변경) | StudentBoardPage                                                  |
| age                                            | AddStudentPage, StudentBoardPage (인라인 변경) | StudentBoardPage, StudentDetailPage, CampUserBoardPage (Adult 판단) |
| guardian (name, relation, contact, email)      | AddStudentPage                            | StudentDetailPage, CampUserBoardPage (Adult 컬럼)                   |
| camp_records[].stay.roomtype                   | StudentDetailPage 캠프탭 → 호텔 섹션 룸타입 선택      | StudentDetailPage (호텔 섹션), CampUserBoardPage (Hotel 컬럼)           |
| camp_records[].stay.check_in / check_out       | StudentDetailPage 캠프탭 → 호텔 섹션 날짜 선택       | StudentDetailPage (호텔 섹션)                                         |
| camp_records[].flight.편명 / 여권                  | StudentDetailPage 캠프탭 → 항공 섹션             | StudentDetailPage (항공 섹션), CampUserBoardPage (Flight 컬럼)          |
| camp_records[].flight.pickDrop / pickDropPlace | StudentDetailPage 캠프탭 → 항공 섹션             | StudentDetailPage (항공 섹션), CampUserBoardPage (Pick&Drop 컬럼)       |
| camp_records[].payment_deadline                | CampUserBoardPage (Payment Deadline 인라인 변경) | CampUserBoardPage (Payment Deadline 컬럼)                            |
| ew-family-{studentId}                          | StudentDetailPage 캠프탭 → 가족 섹션             | StudentDetailPage (가족 섹션 표시), CampUserBoardPage (Family info 컬럼)  |

#### camps[]

| 필드                                              | 쓰기 주체                                  | 읽는 곳                                                                                                          | 비고                      |
| ----------------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ----------------------- |
| name                                            | CampCreatePage                         | CampBoardPage, CampDetailPage 헤더, StudentBoardPage (캠프 컬럼 표시), StudentDetailPage (캠프탭 제목·기본정보), DashboardPage | 직접 입력                   |
| location                                        | CampCreatePage                         | CampBoardPage, CampDetailPage 헤더, StudentDetailPage (기본정보), DashboardPage                                     | 직접 입력                   |
| capacity                                        | CampCreatePage                         | CampBoardPage, CampDetailPage 헤더, StudentDetailPage (기본정보), DashboardPage                                     | 직접 입력                   |
| status                                          | CampCreatePage, CampBoardPage (인라인 변경) | CampBoardPage, CampDetailPage 헤더, StudentBoardPage (뱃지 판단), StudentDetailPage (기본정보 뱃지), DashboardPage        | 직접 입력                   |
| students[].history.current_camp_id              | CampDetailPage Students 탭 (배정 시 갱신)    | StudentBoardPage (캠프 컬럼), DashboardPage                                                                       | students[]에 embedded 저장 |
| accommodation (Hotel.name)                      | CampAccommodationTab → onHotelsChange  | CampDetailPage 헤더, StudentDetailPage (기본정보)                                                                   | camp.accommodation에 동기화 |
| ew-hotels-{campId} (roomTypes[].name, extraBed) | CampAccommodationTab                   | StudentDetailPage 룸타입 드롭다운                                                                                    | DisabledInput           |
| start_date, end_date                            | CampTimetableEdit → onDateRangeChange  | CampBoardPage, CampDetailPage 헤더, StudentDetailPage (기본정보), DashboardPage                                     | DisabledInput           |
| staff[]                                         | CampStaffTab → onStaffChange           | CampBoardPage (스탭 컬럼), CampDetailPage 헤더, StudentDetailPage (기본정보)                                            | DisabledInput           |

---

### Step 3. 삭제 시 영향 범위(Cascade)를 사전에 정의한다

삭제가 발생했을 때 **연쇄 삭제해야 할 것 / 막아야 할 것 / 무결성 경고를 띄워야 할 것**을 미리 구분한다.

```
[학생 삭제]
  ✅ students[]에서 제거
  ✅ ew-family-{studentId} 삭제 (같은 캠프 동반 가족)
  ✅ ew-classes-{campId}의 studentIds[]에서 제거
  ✅ 삭제 즉시 제거하지 않고 → ew-trash-students로 이동 (복구 가능)

[캠프 삭제]
  ❌ 해당 캠프에 current_camp_id로 배정된 학생이 있으면 삭제 차단
  ✅ 학생이 없을 경우: ew-classes-{campId}, ew-campstaff-{campId},
       ew-hotels-{campId}, ew-timetable-{campId}-* 전부 삭제

[에이전시 삭제]
  ❌ history.agent_id가 해당 에이전시를 가리키는 학생이 있으면 삭제 차단
  ✅ 학생이 없을 경우: agents[]에서 제거
```

실제 구현 코드 (App.tsx):

```tsx
// 에이전시 삭제 — 학생 있으면 차단
onAgentDelete={ids => {
  const blocked = ids.filter(id =>
    students.some(s => s.history?.agent_id === id)
  );
  if (blocked.length > 0) {
    const names = blocked.map(id => agents.find(a => a.id === id)?.name ?? id).join(', ');
    alert(`[${names}] 에이전시에 소속된 학생이 있습니다.`);
    return;
  }
  const next = agents.filter(a => !ids.includes(a.id));
  setAgents(next);
}}

// 학생 삭제 — 휴지통으로 이동 + cascade
onStudentDelete={(ids: string[]) => {
  // 클래스 배정에서 제거
  const affectedCampIds = new Set(
    students.filter(s => ids.includes(s.id))
      .flatMap(s => s.camp_records?.map(r => r.camp_id) ?? [])
  );
  affectedCampIds.forEach(campId => {
    const raw = localStorage.getItem(`ew-classes-${campId}`);
    if (!raw) return;
    const classes = JSON.parse(raw);
    const updated = classes.map((c: { studentIds: string[] }) => ({
      ...c,
      studentIds: c.studentIds.filter((sid: string) => !ids.includes(sid)),
    }));
    localStorage.setItem(`ew-classes-${campId}`, JSON.stringify(updated));
  });
  // 휴지통으로
  const deleted = students
    .filter(s => ids.includes(s.id))
    .map(s => ({ ...s, deletedAt: new Date().toISOString() }));
  saveTrashed([...trashedStudents, ...deleted]);
  saveStudents(students.filter(s => !ids.includes(s.id)));
}}
```

---

### Step 4. Dead code를 주기적으로 점검한다

소유 관계 지도를 그리다 보면 "읽히는 곳이 없는 export"나 "선언만 하고 사용하지 않는 변수"가 드러난다.

이번 작업에서 발견된 예:

| 파일 | 항목 | 이유 |
|---|---|---|
| `CampUserBoardPage.tsx` | `CampUserBoardCompleted` 함수 | App Platform 배포 후 사용처 없어짐 |
| `CampUserBoardPage.tsx` | `rawStudentsArr`, `allCamps` 변수 | props로 데이터를 받는 구조로 바뀐 뒤 잔존 |

TypeScript incremental 캐시가 이 오류를 숨기는 경우가 있으므로, 주기적으로 `--incremental false` 옵션으로 풀 체크를 실행한다:

```bash
npx tsc -p tsconfig.app.json --noEmit --incremental false
```

---

## 3. 마무리 — 인사이트 요약

**① "쓰는 곳"과 "읽는 곳"을 분리하면 삭제 로직 설계가 쉬워진다**
어떤 필드를 누가 수정하는지 명확히 하면, 삭제 시 어디를 같이 지워야 하는지(cascade) 혹은 막아야 하는지(block)가 자연스럽게 결정된다.

**② 삭제는 "차단 → 경고 → 연쇄 삭제" 3단계로 설계한다**
무조건 삭제하거나 무조건 막는 것이 아니라, 의존 관계가 있으면 먼저 해소하도록 유도하고, 없을 때만 연쇄 삭제를 실행한다. 학생 삭제는 휴지통(soft delete)으로 처리해 복구 경로를 남긴다.

**③ DisabledInput 패턴으로 쓰기 주체를 명확히 제한한다**
`accommodation`, `start_date`, `staff[]` 같은 필드는 CampCreatePage에서 직접 편집하지 못하고 각 전용 탭(Accommodation, Timetable, Staff)에서만 수정 가능하다. 이 패턴은 데이터 소유 주체를 UI 레벨에서도 강제한다.

**④ 이 구조는 Supabase 전환의 설계도가 된다**
localStorage 키(`ew-students`, `ew-classes-{campId}` 등)와 필드별 소유 관계를 정리해두면, 나중에 Supabase `students`, `camp_classes` 테이블로 교체할 때 어느 컴포넌트의 어느 함수를 API 호출로 바꿔야 하는지 바로 매핑된다.
