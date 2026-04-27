// Cell Component Gallery — 셀 디자인 비주얼 확인용
import { useState } from 'react';
import {
  TextCell, CalendarCell, DropdownCell, GenderCell, TagsCell,
  ThumbnailCell, StatusCell, TagList, MultiDropdownCell, CalendarRangeCell,
  avatarColor, initials,
} from '../components/board/cells';

const SECTION: React.CSSProperties = {
  marginBottom: 40,
};
const TITLE: React.CSSProperties = {
  fontSize: 13, fontWeight: 700, color: '#6B7280',
  letterSpacing: '0.08em', textTransform: 'uppercase',
  borderBottom: '1px solid #E5E7EB', paddingBottom: 8, marginBottom: 16,
};
const ROW: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
};
const CELL_WRAP: React.CSSProperties = {
  border: '1px solid #E5E7EB', borderRadius: 6,
  padding: '0 12px', height: 48,
  display: 'flex', alignItems: 'center',
  minWidth: 160, position: 'relative', background: '#fff',
};
const LABEL: React.CSSProperties = {
  fontSize: 11, color: '#9CA3AF', marginBottom: 4,
};

export default function CellGalleryPage() {
  const [openCell, setOpenCell] = useState<string | null>(null);

  // Text
  const [textVal, setTextVal] = useState('Kim Ji-yeon');
  const [, setTextActive] = useState(false);

  // Calendar
  const [calVal, setCalVal] = useState('2025-04-17');

  // Dropdown single
  const [dropVal, setDropVal] = useState('에이전트A');
  const dropOpts = ['에이전트A', '에이전트B', '에이전트C', '에이전트D'];

  // Gender
  const [genderVal, setGenderVal] = useState('Male');

  // Status (캠프)
  const [statusVal, setStatusVal] = useState('진행중');
  const statusOpts = ['진행중', '준비중', '종료'];

  // Multi dropdown
  const [multiVal, setMultiVal] = useState(['캠프A', '캠프C']);
  const multiOpts = ['캠프A', '캠프B', '캠프C', '캠프D', '캠프E'];

  // Calendar range
  const [rangeVal, setRangeVal] = useState('2025-05-01||2025-06-20');

  // Tags
  const tagVals = ['React', 'TypeScript', 'Figma', 'CSS'];

  // TagList
  const tagListItems = ['김민준', '이서연', '박지호'];
  const teacherItems = ['Steve Kim', 'Jenny Park'];

  // Thumbnail

  function handleOpen(id: string) {
    setOpenCell(prev => prev === id ? null : id);
  }

  return (
    <div
      style={{ padding: '32px 48px', minWidth: 900, maxWidth: 1200, margin: '0 auto' }}
      onClick={() => setOpenCell(null)}
    >
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8, color: '#111827' }}>
        Cell Component Gallery
      </h1>
      <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 40 }}>
        Figma FieldCell 기준 — 각 셀을 클릭해서 오버레이 동작을 확인하세요.
      </p>

      {/* ── Text ── */}
      <div style={SECTION}>
        <div style={TITLE}>Text  ·  인라인 input 전환</div>
        <div style={ROW}>
          <div>
            <div style={LABEL}>Default</div>
            <div style={{ ...CELL_WRAP, minWidth: 220 }}>
              <TextCell value={textVal} isActive={false} onSave={setTextVal} />
            </div>
          </div>
          <div>
            <div style={LABEL}>Active (editing)</div>
            <div
              style={{ ...CELL_WRAP, minWidth: 220, outline: '2px solid #3B82F6' }}
              onClick={e => { e.stopPropagation(); setTextActive(true); }}
            >
              <TextCell value={textVal} isActive={true} onSave={v => { setTextVal(v); setTextActive(false); }} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Dropdown Single ── */}
      <div style={SECTION}>
        <div style={TITLE}>DropdownSingle  ·  ew-dropdown-overlay</div>
        <div style={ROW}>
          <div>
            <div style={LABEL}>Closed</div>
            <div style={{ ...CELL_WRAP }} className="ew-cell--interactive">
              <DropdownCell
                value={dropVal} options={dropOpts}
                cellId="dd-closed" openCell={null} setOpenCell={() => {}}
                onChange={() => {}} onCellClick={() => {}} onEditDone={() => {}}
              />
            </div>
          </div>
          <div>
            <div style={LABEL}>Open</div>
            <div style={{ ...CELL_WRAP }} className="ew-cell--interactive" onClick={e => e.stopPropagation()}>
              <DropdownCell
                value={dropVal} options={dropOpts}
                cellId="dd-open" openCell={openCell} setOpenCell={setOpenCell}
                onChange={v => setDropVal(v)} onCellClick={() => handleOpen('dd-open')} onEditDone={() => {}}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Dropdown Multi ── */}
      <div style={SECTION}>
        <div style={TITLE}>DropdownMulti  ·  ew-dropdown-multi-overlay</div>
        <div style={ROW}>
          <div>
            <div style={LABEL}>값 없음</div>
            <div style={{ ...CELL_WRAP, minWidth: 200 }} className="ew-cell--interactive">
              <MultiDropdownCell
                values={[]} options={multiOpts}
                cellId="multi-empty" openCell={null} setOpenCell={() => {}}
                onChange={() => {}} onCellClick={() => {}}
              />
            </div>
          </div>
          <div>
            <div style={LABEL}>태그 표시 / 클릭하면 열림</div>
            <div style={{ ...CELL_WRAP, minWidth: 220 }} className="ew-cell--interactive" onClick={e => e.stopPropagation()}>
              <MultiDropdownCell
                values={multiVal} options={multiOpts}
                cellId="multi-open" openCell={openCell} setOpenCell={setOpenCell}
                onChange={setMultiVal} onCellClick={() => handleOpen('multi-open')}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Calendar ── */}
      <div style={SECTION}>
        <div style={TITLE}>Calendar  ·  ew-calendar-overlay</div>
        <div style={ROW}>
          <div>
            <div style={LABEL}>Closed</div>
            <div style={{ ...CELL_WRAP }} className="ew-cell--interactive">
              <CalendarCell
                dateISO={calVal} displayDate={calVal.slice(2).replace(/-/g, '/')}
                cellId="cal-closed" openCell={null} setOpenCell={() => {}}
                onDateChange={() => {}} onCellClick={() => {}} onEditDone={() => {}}
              />
            </div>
          </div>
          <div>
            <div style={LABEL}>Open (클릭하세요)</div>
            <div style={{ ...CELL_WRAP }} className="ew-cell--interactive" onClick={e => e.stopPropagation()}>
              <CalendarCell
                dateISO={calVal} displayDate={calVal.slice(2).replace(/-/g, '/')}
                cellId="cal-open" openCell={openCell} setOpenCell={setOpenCell}
                onDateChange={v => setCalVal(v)} onCellClick={() => handleOpen('cal-open')} onEditDone={() => setOpenCell(null)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── CalendarRange ── */}
      <div style={SECTION}>
        <div style={TITLE}>CalendarRange  ·  ew-calendar-range-overlay  (두 달 나란히)</div>
        <div style={ROW}>
          <div>
            <div style={LABEL}>클릭 → 두 달 달력 오픈</div>
            <div style={{ ...CELL_WRAP, minWidth: 240 }} className="ew-cell--interactive" onClick={e => e.stopPropagation()}>
              <CalendarRangeCell
                value={rangeVal}
                cellId="range-open" openCell={openCell} setOpenCell={setOpenCell}
                onSave={setRangeVal} onCellClick={() => handleOpen('range-open')}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Gender ── */}
      <div style={SECTION}>
        <div style={TITLE}>Gender  ·  ew-gender-overlay</div>
        <div style={ROW}>
          <div>
            <div style={LABEL}>Male</div>
            <div style={{ ...CELL_WRAP }} className="ew-cell--interactive">
              <GenderCell
                value="Male" cellId="g-male" openCell={null} setOpenCell={() => {}}
                onChange={() => {}} onCellClick={() => {}} onEditDone={() => {}}
              />
            </div>
          </div>
          <div>
            <div style={LABEL}>Female</div>
            <div style={{ ...CELL_WRAP }} className="ew-cell--interactive">
              <GenderCell
                value="Female" cellId="g-female" openCell={null} setOpenCell={() => {}}
                onChange={() => {}} onCellClick={() => {}} onEditDone={() => {}}
              />
            </div>
          </div>
          <div>
            <div style={LABEL}>Open (클릭하세요)</div>
            <div style={{ ...CELL_WRAP }} className="ew-cell--interactive" onClick={e => e.stopPropagation()}>
              <GenderCell
                value={genderVal} cellId="g-open" openCell={openCell} setOpenCell={setOpenCell}
                onChange={v => setGenderVal(v)} onCellClick={() => handleOpen('g-open')} onEditDone={() => setOpenCell(null)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Status (캠프 상태) ── */}
      <div style={SECTION}>
        <div style={TITLE}>StatusCell  ·  캠프 진행 상태 드롭다운</div>
        <div style={ROW}>
          {statusOpts.map(s => (
            <div key={s}>
              <div style={LABEL}>{s}</div>
              <div style={{ ...CELL_WRAP, minWidth: 100 }} className="ew-cell--interactive">
                <StatusCell
                  value={s} options={statusOpts}
                  cellId={`status-${s}`} openCell={null} setOpenCell={() => {}}
                  onChange={() => {}} onCellClick={() => {}} onEditDone={() => {}}
                />
              </div>
            </div>
          ))}
          <div>
            <div style={LABEL}>Open (클릭하세요)</div>
            <div style={{ ...CELL_WRAP, minWidth: 100 }} className="ew-cell--interactive" onClick={e => e.stopPropagation()}>
              <StatusCell
                value={statusVal} options={statusOpts}
                cellId="status-open" openCell={openCell} setOpenCell={setOpenCell}
                onChange={v => setStatusVal(v)} onCellClick={() => handleOpen('status-open')} onEditDone={() => setOpenCell(null)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── UserThumbnail ── */}
      <div style={SECTION}>
        <div style={TITLE}>UserThumbnail  ·  ew-cell--thumbnail</div>
        <div style={ROW}>
          {[
            { ko: '김지연', en: 'Kim Ji Yeon' },
            { ko: '이서준', en: 'Lee Seo Jun' },
            { ko: '박민서', en: 'Park Min Seo' },
          ].map(p => (
            <div key={p.en}>
              <div style={LABEL}>{p.ko}</div>
              <div style={{ ...CELL_WRAP, minWidth: 160, height: 56 }}>
                <ThumbnailCell nameKo={p.ko} nameEn={p.en} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Avatar ── */}
      <div style={SECTION}>
        <div style={TITLE}>Avatar  ·  ew-avatar (색상 자동 배정)</div>
        <div style={ROW}>
          {['Kim Ji Yeon', 'Lee Seo Jun', 'Park Min Seo', 'Choi Ha Eun', 'Jung Tae Yang'].map(name => (
            <div key={name} style={{ textAlign: 'center' }}>
              <div className="ew-avatar" style={{ background: avatarColor(name), margin: '0 auto 6px' }}>
                {initials(name)}
              </div>
              <div style={{ fontSize: 11, color: '#9CA3AF' }}>{name.split(' ')[0]}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tags ── */}
      <div style={SECTION}>
        <div style={TITLE}>Tags  ·  ew-cell--tag  (wrap)</div>
        <div style={{ ...CELL_WRAP, height: 'auto', padding: '8px 12px', minWidth: 300, flexWrap: 'wrap', gap: 4 }}>
          <TagsCell values={tagVals} />
        </div>
      </div>

      {/* ── TagList ── */}
      <div style={SECTION}>
        <div style={TITLE}>TagList  ·  세로 나열 (Staff / Teacher)</div>
        <div style={ROW}>
          <div>
            <div style={LABEL}>Staff (파랑)</div>
            <div style={{ ...CELL_WRAP, height: 'auto', padding: '10px 16px', flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
              <TagList items={tagListItems} color="var(--color-primary)" />
            </div>
          </div>
          <div>
            <div style={LABEL}>Teacher (진파랑)</div>
            <div style={{ ...CELL_WRAP, height: 'auto', padding: '10px 16px', flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
              <TagList items={teacherItems} color="#2663D7" />
            </div>
          </div>
        </div>
      </div>

      {/* ── ew-tag variants ── */}
      <div style={SECTION}>
        <div style={TITLE}>ew-tag  ·  색상 변형</div>
        <div style={ROW}>
          {[
            { cls: 'ew-tag--blue',   label: 'Tag Blue' },
            { cls: 'ew-tag--green',  label: 'Tag Green' },
            { cls: 'ew-tag--yellow', label: 'Tag Yellow' },
            { cls: 'ew-tag--red',    label: 'Tag Red' },
            { cls: 'ew-tag--gray',   label: 'Tag Gray' },
          ].map(t => (
            <span key={t.cls} className={`ew-tag ${t.cls}`}>{t.label}</span>
          ))}
        </div>
      </div>

      {/* ── Buttons ── */}
      <div style={SECTION}>
        <div style={TITLE}>Button  ·  타입 × 사이즈</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { cls: 'ew-btn--primary',   label: 'Primary' },
            { cls: 'ew-btn--secondary', label: 'Secondary' },
            { cls: 'ew-btn--ghost',     label: 'Ghost' },
            { cls: 'ew-btn--danger',    label: 'Danger' },
          ].map(b => (
            <div key={b.cls} style={ROW}>
              <div style={{ width: 90, fontSize: 12, color: '#6B7280' }}>{b.label}</div>
              {['ew-btn--xsm', 'ew-btn--sm', 'ew-btn--md', 'ew-btn--lg'].map(sz => (
                <button key={sz} className={`ew-btn ${b.cls} ${sz}`}>{sz.replace('ew-btn--', '')}</button>
              ))}
              <button className={`ew-btn ${b.cls} ew-btn--sm`} disabled>disabled</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
