# EduWing Hub — Figma Property → CSS 매핑 문서

> Figma 파일: EduWing-Hub (`XmgyfWmnLUpJCz6EYPv4hE`, node 35:964)  
> 기준 CSS: `src/index.css`  
> ⚠️ `?` 표시 항목은 확인 후 수정 필요

---

## 1. Button

### Property (타입) 매핑
| Figma Property | 현재 CSS 클래스 | 설명 | 확인 |
|---|---|---|---|
| `default` | `ew-btn--secondary` | 흰 배경, 파란 테두리 | ✅ |
| `point` | `ew-btn--primary` | 파란 배경, 흰 텍스트 | ✅ |
| `point-red` | `ew-btn--danger` | 회색 배경, 빨간 테두리/텍스트 (#FF7070) | ✅ |
| `modify` | `ew-btn--ghost` | 연회색 배경, 파란 텍스트 | ✅ |
| _(Figma 없음)_ | `ew-btn--danger` | 빨간 테두리, 삭제용 | — |

### State 매핑
| Figma State | CSS 처리 |
|---|---|
| `nomal` | 기본 클래스 |
| `hover` | `:hover` |
| `pushed` | `:active` |
| `disable` | `:disabled` |

### Size 매핑
| Figma Size | CSS 클래스 |
|---|---|
| `xsm` | `ew-btn--xsm` (h: 26px) |
| `sm` | `ew-btn--sm` (h: 32px) |
| `md` | `ew-btn--md` (h: 40px) |
| `lg` | `ew-btn--lg` (h: 48px) |

---

## 2. FieldCell

### Type 매핑

> **셀 클래스** = 셀 자체 스타일 / **오버레이 클래스** = 클릭 시 나타나는 팝업 스타일

| Figma Type | 셀 클래스 | 오버레이 클래스 | 오버레이 형태 |
|---|---|---|---|
| `Text` | `ew-cell--text` | — | 인라인 input 전환 |
| `DropdownSingle` | `ew-cell--interactive` | `ew-dropdown-overlay` | 단일 선택 목록 |
| `DropdownMulti` | `ew-cell--interactive` | `ew-dropdown-multi-overlay` | 다중 선택 목록 (체크박스) |
| `Calendar` | `ew-cell--interactive` | `ew-calendar-overlay` | 단일 월 달력 |
| `CalendarRange` | `ew-cell--interactive` | `ew-calendar-range-overlay` | 두 달 나란히 |
| `CalendarTime` | `ew-cell--interactive` | `ew-calendar-overlay` + `ew-calendar-time-row` | 달력 + 시간 입력 |
| `Gender` | `ew-cell--interactive` | `ew-gender-overlay` | Male / Female 선택 |
| `UserThumbnail` | `ew-cell--thumbnail` | — | 아바타 / 영문명(1행) / 한글명(2행) — 세로 스택 |
| `CampUserThumbnail` | `ew-cell--camp-thumbnail` | — | 아바타 / [영문+한글 가로](1행) / [나이·성별 가로](2행) |
| `ParentsInfo` | `ew-cell--parents` | — | 보호자 이름/관계/연락처 |
| `Tag` | `ew-cell--tag` | — | 태그 wrap 나열 |
| `Headline` | `ew-cell--headline` | — | 정렬 화살표 포함 헤더 |
| `button` | — | — | `ew-btn` 직접 사용 (링크 이동)

### State 매핑
| Figma State | CSS 클래스 |
|---|---|
| `Empty` | `ew-cell--empty` |
| `Default` | `ew-cell` (기본) |
| `Hover` | `ew-cell--hover` |
| `Selected` | `ew-cell--selected` |
| `Error` | `ew-cell--error` |
| `Disable` | `ew-cell--disable` |

---

## 3. Tag / Badge

| Figma Property | CSS 클래스 |
|---|---|
| `Tag_blue` | `ew-tag--blue` |
| `Tag_green` | `ew-tag--green` |
| `Tag_yellow` | `ew-tag--yellow` |
| `Tag_red` | `ew-tag--red` |
| `Tag_black` | `ew-tag--gray` (? 검정→회색 처리) |

---

## 4. Filter

### Property 매핑
| Figma Property | 용도 |
|---|---|
| `ID/Name` | 텍스트 검색 입력 (`ew-filter-input-wrap`) |
| `Camp` | 캠프 드롭다운 (`ew-filter-select-wrap`) |
| `Agent` | 에이전트 드롭다운 (`ew-filter-select-wrap`) |
| `Gender` | 성별 드롭다운 (`ew-filter-select-wrap`) |

### State 매핑
| Figma State | CSS 처리 |
|---|---|
| `Default` | 기본 |
| `Hover` | `:hover` |
| `Focus` / `selected` | `:focus` / 선택 시 |

---

## 5. Checkbox

| Figma Variant | Figma State | CSS 처리 |
|---|---|---|
| `Default` | `Default` | `ew-checkbox` |
| `Default` | `hover` | `ew-checkbox:hover` |
| `Default` | `Uncheck` | `ew-checkbox` (기본과 동일?) |
| `Default` | `disable` | `ew-checkbox:disabled` |
| `check` | `Default` | `ew-checkbox:checked` |
| `check` | `hover` | `ew-checkbox:checked:hover` |

---

## 6. Switch

| Figma Property | Figma Size | CSS 클래스 | 확인 |
|---|---|---|---|
| `off` | `lg` | `ew-switch ew-switch--lg` | ✅ |
| `on` | `lg` | `ew-switch ew-switch--lg` + `input:checked` | ✅ |
| `off` | `sm` | `ew-switch ew-switch--sm` | ✅ |
| `on` | `sm` | `ew-switch ew-switch--sm` + `input:checked` | ✅ |

---

## 7. Menu (NavItem)

| Figma Property | CSS 클래스 | 확인 |
|---|---|---|
| `nomal` | `ew-nav-menu` | ✅ |
| `hover` | `ew-nav-menu:hover` | ✅ |
| `Seleted` | `ew-nav-menu.active` | ✅ |

---

## 8. Setting / Notification 아이콘

| Figma Property | Figma State | CSS / 컴포넌트 |
|---|---|---|
| `settings` | `normal` | `/icon/settings.svg` / `--icon-settings` / `ew-icon--settings` | ✅ |
| `settings` | `hover` | `/icon/settings_hover.svg` / `--icon-settings-hover` / `:hover` | ✅ |
| `settings` | `selected` | `/icon/settings_selected.svg` / `--icon-settings-selected` / `.active` | ✅ |
| `notification` | `normal` | `/icon/notification.svg` / `--icon-notification` / `ew-icon--notification` | ✅ |
| `notification` | `hover` | `/icon/notification_hover.svg` / `--icon-notification-hover` / `:hover` | ✅ |
| `notification` | `selected` | `/icon/notification_selected.svg` / `--icon-notification-selected` / `.active` | ✅ |

---

## 9. 아이콘 (`/public/icon/`)

| Figma Property 이름 | 로컬 파일 | CSS 변수 |
|---|---|---|
| `arrow_fill_right` | `arrow_fill_right.svg` | `--icon-arrow-fill-right` |
| `arrow_fill_bottom` | `arrow_fill_bottom.svg` | `--icon-arrow-fill-down` |
| `arrow_fill_left` | `arrow_fill_left.svg` | `--icon-arrow-fill-left` |
| `arrow_fill_top` | `arrow_fill_top.svg` | `--icon-arrow-fill-up` |
| `close` | `close.svg` | `--icon-close` |
| `more` | `more.svg` | `--icon-more` |
| `arrow_bottom` | `arrow_bottom.svg` | `--icon-arrow-down` |
| `arrow2_right` | `arrow2_right.svg` | `--icon-arrow-right` |
| `arrow3_up` | `arrow3_up.svg` | `--icon-arrow-up` |
| `reload` | `reload.svg` | `--icon-reload` |
| `link` | `link.svg` | `--icon-link` |
| `ecu_dot` | `ecu_dot.svg` | `--icon-ecu-dot` |
| `ecu_dot_plus` | `ecu_dot_plus.svg` | `--icon-ecu-dot-plus` |
| `Clock_selected` | `Clock_selected.svg` | `--icon-clock-selected` |
| `Clock` | `Clock.svg` | `--icon-clock` |
| `arrowup` | `arrowup.svg` | `--icon-sort-up` |
| `arrowdown` | `arrowdown.svg` | `--icon-sort-down` |
| `Calendar` | `Calendar.svg` | `--icon-calendar` |
| `Calendar_selected` | `Calendar_selected.svg` | `--icon-calendar-selected` |
| `plus` | `plus.svg` | `--icon-plus` |
| `delect` | `delete.svg` | `--icon-delete` |
| `export` | `export.svg` | `--icon-export` |
| `Import` | `import.svg` | `--icon-import` |
| `Modify` | `modify.svg` | `--icon-modify` |

---

## 10. Tab / TabBar  (Figma node 529:5690)

| Figma Property | CSS 클래스 | 설명 |
|---|---|---|
| `Defualt` | `ew-tab` | 텍스트 #646E7D, 인디케이터 투명 |
| `Selected` | `ew-tab.active` | 텍스트 #3B82F6, 인디케이터 파란 2px |
| _(hover)_ | `ew-tab:hover` | 텍스트 #1A1D23 |
| _(컨테이너)_ | `ew-tab-bar` | flex row, border-bottom |

---

## 11. Login / Logout  (Figma node 50:6311)

| Figma Property | CSS 클래스 | 설명 |
|---|---|---|
| `Logout` (비로그인) | `ew-login-btn` | #E7F0FF 배경, "Login" 텍스트 버튼 (162×66) |
| `Login` (로그인됨) | `ew-user-profile` | 아바타 + 이름/역할 가로 배치 |
| — | `ew-user-profile-info` | 이름·역할 세로 스택 |
| — | `ew-user-profile-name` | 닉네임 (15px) |
| — | `ew-user-profile-role` | 역할 (14px, #717171) |

---

## 12. Mobile Menu Button  (Figma node 112:1175)

| Figma State | CSS 클래스 | 설명 |
|---|---|---|
| `list` (햄버거) | `ew-mobile-menu-btn` | 20px 가로선 3개, gap 5px |
| `close` (X) | `ew-mobile-menu-btn.is-open` | 1·3번 선 회전 ±45°, 2번 선 사라짐 |

> HTML: `<button class="ew-mobile-menu-btn"><span></span><span></span><span></span></button>`

---

## 13. 미생성 컴포넌트 목록

아직 CSS가 없는 Figma 컴포넌트입니다.

| Figma 컴포넌트 | 우선순위 |
|---|---|
| Button `point-red` (구 `point-bk`) | ✅ `ew-btn--danger` 로 처리 |
| Switch (on/off, lg/sm) | ✅ 완료 |
| Tab / TabBar | ✅ 완료 |
| Login / Logout | ✅ 완료 |
| Mobile Menu | ✅ 완료 |
