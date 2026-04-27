# [Internal] 에듀윙월드 시스템 개발용 초정밀 명세서 (v1.0)

이 문서는 AI(Claude Code 등)가 실제 소스 코드를 작성하기 위한 상세 기획 및 데이터 매핑 가이드입니다. 이미지 시안의 모든 인터랙션과 필드를 데이터 구조화하였습니다.

---

## 1. UI/UX 컴포넌트 상세 명세

### 1.1 입력 필드(Input) 및 상태 관리 (Ref: image_18aa69.jpg, image_18ab02.jpg)
모든 입력 컴포넌트는 다음 5가지 상태를 CSS로 구현해야 합니다.
* **Normal:** Border: #D1D5DB, BG: #FFFFFF.
* **Hover:** Border: #9CA3AF.
* **Focus (Active):** Border: #3B82F6, Ring-offset: 2px.
* **Error:** Border: #EF4444, 하단에 에러 메시지(Text-red-500) 출력.
* **Disabled:** BG: #F3F4F6, Cursor: not-allowed.

### 1.2 공통 버튼 및 태그
* **Primary Button:** #3B82F6 (Blue-500), White text.
* **Secondary/Action Tags:**
    * 성별: Male(Blue 칩), Female(Pink 칩).
    * 에이전트: Agent 명칭별 고유 컬러 지정.
    * 상태: 진행중(Green), 종료(Gray).

---

## 2. 데이터 베이스 구조 (JSON Schema 상세)

### 2.1 students.json (학생 정보)
```json
{
  "id": "UUID",
  "profile_img_url": "string",
  "name_ko": "string",
  "name_en": "string (Uppercase 권장)",
  "gender": "Male | Female",
  "birth_date": "YYYY-MM-DD",
  "age": "number (자동 계산)",
  "guardian": {
    "name": "string",
    "relation": "Father | Mother | Etc",
    "contact": "string (010-0000-0000)",
    "email": "string"
  },
  "history": {
    "joined_date": "YYYY-MM-DD",
    "agent_id": "string",
    "previous_camps": ["string"],
    "current_camp_id": "string"
  }
}
```

### 2.2 camps.json (캠프 마스터)
* **Schedule Data 구조:**
    * `week`: number (1~4주차)
    * `days`: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    * `sessions`: ["Morning", "Lunch", "Afternoon", "Dinner", "Night"]
    * `content`: { "title": "string", "color": "hex_code" }

---

## 3. 화면별 상세 기능 명세

### 3.1 학생 관리 리스트 (Ref: image_18a2aa.png)
* **상단 액션:** [학생 추가], [삭제], [엑셀 업로드], [엑셀 다운로드] 버튼 배치.
* **테이블 컬럼:** 체크박스, 학생(프로필/이름), 성별, 나이, 생일, 보호자, 연락처, Email, 가입일, Agent, 참여중인 캠프, 참여 기간.
* **인터랙션:** 행(Row) 클릭 시 '학생 상세 상세' 페이지로 이동.

### 3.2 학생 상세 및 캠프 세부 설정 (Ref: image_18a35d.jpg)
* **Tab System:** 상단에 참여 캠프 코드별 탭 배치 (클릭 시 하단 데이터 스위칭).
* **Stay Info 섹션:**
    * Check-in/Out 입력 시 `Stay` 기간 자동 계산 (예: 14day).
    * Room Type: 드롭다운.
    * Invoice: 파일 업로드 컴포넌트.
* **Flight Info 섹션:**
    * 여권 번호/영문명 입력 필드.
    * 출발/귀국 편명, 시간(HH:mm), 날짜 입력.
    * **Pick&Drop:** 드롭다운 (신청/미신청).
* **Family Info:** 동반 가족 여권 및 항공 정보 입력 폼 반복 (학생 정보와 동일 구조).

---

## 4. 비즈니스 로직 (Core Logic)

1.  **Age Calculation:** `current_year - birth_year + 1` (한국식) 또는 `만 나이` 선택 옵션.
2.  **Date Validation:** `Stay Info`의 체크인 날짜는 `Camp Basic Info`의 시작일보다 빠를 수 없음.
3.  **JSON Sync:** 모든 수정 사항은 '저장' 버튼 클릭 시 해당 JSON 파일에 비동기(Atomic Write)로 반영.
4.  **Search & Filter:** 리스트 상단에서 '이름', '연락처', '캠프명'으로 실시간 필터링 기능 구현.
