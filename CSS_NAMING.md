# EduWing Hub — CSS 네이밍 가이드

> 기준 파일: `src/index.css`  
> Figma 참조: EduWing-Hub (node 35:964), FieldCell Library (node 167:1305)

---

## 1. 네이밍 규칙 요약

| 패턴 | 설명 | 예시 |
|---|---|---|
| `ew-*` | 모든 컴포넌트 클래스의 접두사 | `ew-btn`, `ew-table` |
| `ew-{component}` | 컴포넌트 블록 | `ew-input`, `ew-board` |
| `ew-{component}--{modifier}` | BEM modifier (상태/변형) | `ew-btn--primary`, `ew-cell--selected` |
| `ew-{component}-{element}` | 컴포넌트 내부 요소 | `ew-thumbnail-info`, `ew-calendar-header` |
| `--color-*` | CSS 커스텀 프로퍼티 (토큰) | `--color-primary`, `--color-border-table` |

---

## 2. Design Token (`--color-*`, `--font-*`, `--shadow-*`)

### Color — Primary
| 변수명 | 값 | 용도 |
|---|---|---|
| `--color-primary` | `#3B82F6` | 주요 액션 색상 |
| `--color-primary-hover` | `#2563EB` | 호버 상태 |
| `--color-primary-light` | `#E0E9FE` | 파란 배지 배경 |
| `--color-primary-bg` | `#F0F5FF` | 선택된 행 배경 |

### Color — Semantic
| 변수명 | 값 | 용도 |
|---|---|---|
| `--color-error` | `#EF4444` | 에러 텍스트/아이콘 |
| `--color-error-light` | `#FEF2F2` | 에러 배지 배경 |
| `--color-error-border` | `#FF7070` | 에러 테두리, danger 버튼 |
| `--color-success` | `#22C55E` | 성공/진행중 상태 |
| `--color-success-light` | `#F0FDF4` | 초록 배지 배경 |
| `--color-warning` | `#F59E0B` | 경고 상태 |
| `--color-warning-light` | `#FFF7ED` | 노란 배지 배경 |

### Color — Neutral (배경)
| 변수명 | 값 | 용도 |
|---|---|---|
| `--color-bg-white` | `#FFFFFF` | 기본 배경 |
| `--color-bg-gray` | `#F5F7FA` | 필터바, 입력 배경 |
| `--color-bg-table-head` | `#F8F9FB` | 테이블 헤더 배경 |
| `--color-bg-disabled` | `#F3F4F6` | 비활성 상태 배경 |

### Color — Text
| 변수명 | 값 | 용도 |
|---|---|---|
| `--color-text-primary` | `#1A1D23` | 메인 텍스트 |
| `--color-text-dark` | `#263238` | 테이블 셀 텍스트 |
| `--color-text-medium` | `#434446` | 중간 강조 텍스트 |
| `--color-text-sub` | `#6B7280` | 보조 텍스트, 헤더 레이블 |
| `--color-text-muted` | `#8C99AB` | 흐린 텍스트, 줄임표 |
| `--color-text-placeholder` | `#808080` | 입력 placeholder |
| `--color-text-nav` | `#646E7D` | 네비게이션 텍스트 |

### Color — Border
| 변수명 | 값 | 용도 |
|---|---|---|
| `--color-border-default` | `#D1D5DB` | 기본 입력 테두리 |
| `--color-border-hover` | `#9CA3AF` | 호버 테두리 |
| `--color-border-focus` | `#3B82F6` | 포커스 테두리 |
| `--color-border-table` | `#E2E5EA` | 테이블 구분선 |
| `--color-border-light` | `#E5EAF0` | 페이지네이션 버튼 테두리 |
| `--color-border-divider` | `#E6EFF5` | 네비게이션 하단선 |

### Shadow
| 변수명 | 용도 |
|---|---|
| `--shadow-filter` | 필터바 그림자 |
| `--shadow-card` | 카드 그림자 |

### Font
| 변수명 | 폰트 | 용도 |
|---|---|---|
| `--font-sans` | Inter + Noto Sans KR + Roboto | 기본 전체 |
| `--font-ko` | Noto Sans KR | 한글 전용 |
| `--font-en` | Inter | 영문/숫자 전용 |
| `--font-input` | Roboto | 입력 필드 전용 |

---

## 3. 컴포넌트별 클래스 목록

### Input — `ew-input`
| 클래스 | 상태/역할 |
|---|---|
| `ew-input` | 기본 (Normal) |
| `ew-input:hover` | 호버 |
| `ew-input:focus` | 포커스 (파란 링) |
| `ew-input--error` | 에러 (빨간 테두리) |
| `ew-input:disabled` | 비활성 |
| `ew-input-error-msg` | 에러 메시지 텍스트 |

---

### Button — `ew-btn`

#### 사이즈 modifier
| 클래스 | 높이 | 폰트 |
|---|---|---|
| `ew-btn--xsm` | 26px | 12px |
| `ew-btn--sm` | 32px | 12px |
| `ew-btn--md` | 40px | 13px |
| `ew-btn--lg` | 48px | 14px |

#### 색상 modifier
| 클래스 | 설명 |
|---|---|
| `ew-btn--primary` | 파란 배경, 흰 텍스트 |
| `ew-btn--secondary` | 흰 배경, 파란 텍스트, 테두리 |
| `ew-btn--danger` | 회색 배경, 빨간 텍스트/테두리 |
| `ew-btn--ghost` | 연회색 배경, 파란 텍스트 |
| `ew-btn:disabled` | 투명도 0.4, 클릭 불가 |

---

### Tag / Badge — `ew-tag`
| 클래스 | 색상 | 용도 예시 |
|---|---|---|
| `ew-tag--blue` | 파란 배지 | Male, 진행중 |
| `ew-tag--green` | 초록 배지 | 완료, 활성 |
| `ew-tag--yellow` | 노란 배지 | 경고, 준비중 |
| `ew-tag--red` | 빨간 배지 | 에러, 종료 |
| `ew-tag--gray` | 회색 배지 | 비활성, 기타 |

---

### Checkbox — `ew-checkbox`
| 클래스 | 상태 |
|---|---|
| `ew-checkbox` | 기본 |
| `ew-checkbox:checked` | 체크됨 (파란 배경 + 흰 체크) |

---

### Table / Board — `ew-board`, `ew-table`
| 클래스 | 설명 |
|---|---|
| `ew-board` | 테이블을 감싸는 카드 컨테이너 |
| `ew-table` | `<table>` 요소 |
| `ew-table th` | 헤더 셀 스타일 (자동 적용) |
| `ew-table td` | 데이터 셀 스타일 (자동 적용) |
| `row-selected` | 선택된 행 (파란 좌측 테두리 + 연파랑 bg) |
| `ew-cell--selected` | 편집 포커스 셀 (진파랑 하단 3px 테두리) |
| `ew-cell--interactive` | overflow visible 필요한 셀 (드롭다운/캘린더 있는 셀) |

---

### Avatar — `ew-avatar`
| 클래스 | 설명 |
|---|---|
| `ew-avatar` | 원형 프로필 이니셜 (32×32, 색상은 JS로 동적 지정) |

---

### Nav — `ew-nav`
| 클래스 | 설명 |
|---|---|
| `ew-nav` | 상단 네비게이션 바 (높이 68px) |

---

### Filter Bar — `ew-filter-bar`
| 클래스 | 설명 |
|---|---|
| `ew-filter-bar` | 필터 영역 컨테이너 |
| `ew-filter-input-wrap` | 검색 입력 래퍼 (둥근 알약형) |
| `ew-filter-input-wrap .search-icon` | 검색 아이콘 (absolute 좌측) |
| `ew-filter-select-wrap` | 셀렉트 드롭다운 래퍼 |
| `ew-filter-select-wrap .arrow` | 드롭다운 화살표 (absolute 우측) |

---

### Pagination — `ew-page-btn`
| 클래스 | 상태 |
|---|---|
| `ew-page-btn` | 기본 페이지 버튼 |
| `ew-page-btn.active` | 현재 페이지 (파란 배경) |
| `ew-page-btn:hover` | 호버 (회색 배경) |
| `ew-page-btn.dots` | `…` 줄임 버튼 (테두리 없음) |

---

## 4. FieldCell 전용 클래스 (Figma node 167:1305)

### 공통 셀 — `ew-cell`
| 클래스 | 상태/설명 |
|---|---|
| `ew-cell` | 기본 셀 (48px 높이) |
| `ew-cell--empty` | 비어있는 셀 (placeholder 색상) |
| `ew-cell--hover` / `:hover` | 호버 (`#FAFBFC` 배경) |
| `ew-cell--selected` | 선택/포커스 (연파랑 bg + 파란 하단 테두리) |
| `ew-cell--error` | 에러 (빨간 테두리) |
| `ew-cell--disable` | 비활성 (회색 bg, 클릭 불가) |

### 에러 래퍼
| 클래스 | 설명 |
|---|---|
| `ew-cell-wrap--error` | 에러 셀 + 에러 메시지를 세로로 묶는 래퍼 |
| `ew-cell-error-msg` | 셀 하단 에러 메시지 텍스트 |

### 셀 타입별 modifier
| 클래스 | 설명 |
|---|---|
| `ew-cell--text` | 텍스트 입력 셀 |
| `ew-cell--headline` | 정렬 가능한 헤더 셀 |
| `ew-cell--headline.sorted` | 현재 정렬 중인 헤더 (파란 텍스트) |
| `ew-cell--headline .sort-arrow` | 정렬 방향 화살표 |
| `ew-cell--thumbnail` | 프로필 썸네일 셀 (100px 높이) |
| `ew-cell--parents` | 보호자 정보 셀 (100px 높이) |
| `ew-cell--tag` | 태그/배지 나열 셀 |

### 썸네일 셀 내부 요소
| 클래스 | 설명 |
|---|---|
| `ew-thumbnail-card` | 아바타 + 정보 가로 배치 래퍼 |
| `ew-thumbnail-info` | 이름/메타 세로 배치 래퍼 |
| `ew-thumbnail-name-ko` | 한글 이름 (13px bold) |
| `ew-thumbnail-name-en` | 영문 이름 (11px, sub 색상) |
| `ew-thumbnail-meta` | 기타 메타 정보 (11px) |

### 보호자 셀 내부 요소
| 클래스 | 설명 |
|---|---|
| `ew-parents-name` | 보호자 이름 |
| `ew-parents-relation` | 관계 (Father/Mother) |
| `ew-parents-contact` | 연락처 |

### Tag 셀 내부 요소
| 클래스 | 설명 |
|---|---|
| `ew-tag-area` | 태그들을 wrap 배치하는 컨테이너 |

---

## 5. Overlay 컴포넌트

### Dropdown Overlay
| 클래스 | 설명 |
|---|---|
| `ew-dropdown-overlay` | 드롭다운 팝업 컨테이너 |
| `ew-dropdown-item` | 드롭다운 항목 |
| `ew-dropdown-item.selected` | 선택된 항목 (파란 텍스트) |
| `ew-dropdown-divider` | 항목 구분선 |

### Calendar Picker Overlay
| 클래스 | 설명 |
|---|---|
| `ew-calendar-overlay` | 단일 날짜 선택 팝업 |
| `ew-calendar-header` | 월/년 헤더 영역 |
| `ew-calendar-nav-btn` | 이전/다음 월 버튼 |
| `ew-calendar-nav-btn.prev` | 이전 버튼 (좌측) |
| `ew-calendar-nav-btn.next` | 다음 버튼 (우측) |
| `ew-calendar-month-title` | "April 2026" 텍스트 |
| `ew-calendar-grid` | 날짜 그리드 영역 |
| `ew-calendar-day-headers` | 요일 헤더 행 (S M T W ...) |
| `ew-calendar-day-header` | 개별 요일 레이블 |
| `ew-calendar-days` | 날짜 버튼 그리드 |
| `ew-calendar-day` | 개별 날짜 버튼 |
| `ew-calendar-day.selected` | 선택된 날짜 (파란 원) |
| `ew-calendar-day.today` | 오늘 날짜 (파란 텍스트) |
| `ew-calendar-day.other-month` | 이전/다음 달 날짜 (흐린 색) |
| `ew-calendar-today-btn` | "Today" 바로가기 버튼 |

### Calendar Range Overlay
| 클래스 | 설명 |
|---|---|
| `ew-calendar-range-overlay` | 기간 선택 팝업 (두 달 나란히) |
| `ew-calendar-range-day.in-range` | 선택 범위 내 날짜 (연파랑 배경) |
| `ew-calendar-range-day.range-start` | 시작 날짜 (반원 파랑) |
| `ew-calendar-range-day.range-end` | 종료 날짜 (반원 파랑) |
| `ew-calendar-apply-btn` | 기간 적용 버튼 |

### Calendar Time (날짜+시간)
| 클래스 | 설명 |
|---|---|
| `ew-calendar-time-row` | 시간 입력 행 |
| `ew-time-input` | 시간 입력 필드 (HH / mm) |
| `ew-time-separator` | 시:분 구분자 `:` |

### Gender Overlay
| 클래스 | 설명 |
|---|---|
| `ew-gender-overlay` | 성별 선택 팝업 |
| `ew-gender-item` | 성별 항목 |
| `ew-gender-item.male` | Male (파란 텍스트) |
| `ew-gender-item.female` | Female (핑크 텍스트) |
