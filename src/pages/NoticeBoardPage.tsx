import { useState, useMemo, useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { Color } from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import type { Camp } from '../App';

export interface Notice {
  id: string;
  title: string;
  body: string;
  category: string; // 'all' | camp.id
  status: '공개' | '비공개';
  created_at: string;
}

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function SearchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="9" cy="9" r="6" stroke="#9CA3AF" strokeWidth="1.5" />
      <path d="M13.5 13.5L17 17" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function ToolBtn({ active, onClick, children, title }: {
  active?: boolean; onClick: () => void; children: React.ReactNode; title?: string;
}) {
  return (
    <button
      onMouseDown={e => { e.preventDefault(); onClick(); }}
      title={title}
      style={{
        height: 28, minWidth: 28, padding: '0 7px',
        border: '1px solid var(--color-border-subtle)',
        borderRadius: 4,
        background: active ? 'var(--color-primary)' : 'var(--color-canvas)',
        color: active ? '#fff' : 'var(--color-ink)',
        fontSize: 'var(--text-sm)', fontWeight: 600,
        cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--font-en)', flexShrink: 0,
        transition: 'background 0.1s, color 0.1s',
      }}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div style={{ width: 1, height: 20, background: 'var(--color-border-subtle)', margin: '0 2px', flexShrink: 0 }} />;
}

export default function NoticeBoardPage({
  notices = [],
  camps = [],
  onNoticeAdd,
  onNoticeUpdate,
  onNoticeDelete,
}: {
  notices?: Notice[];
  camps?: Camp[];
  onNoticeAdd?: (n: Notice) => void;
  onNoticeUpdate?: (n: Notice) => void;
  onNoticeDelete?: (ids: string[]) => void;
}) {
  const [query,        setQuery]        = useState('');
  const [filterCat,   setFilterCat]    = useState('all');
  const [filterStatus, setFilterStatus] = useState<'전체' | '공개' | '비공개'>('전체');
  const [selectedId,  setSelectedId]   = useState<string | null>(null);
  const [draft,       setDraft]        = useState({ title: '', category: 'all', status: '공개' as '공개' | '비공개' });
  const [isDirty,     setIsDirty]      = useState(false);
  const colorInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [StarterKit, Underline, TextStyle, Color],
    content: '',
    onUpdate: () => setIsDirty(true),
  });

  // 선택된 공지가 바뀔 때 에디터에 내용 로드
  useEffect(() => {
    if (!editor) return;
    if (selectedId === 'new') {
      editor.commands.setContent('');
      setDraft({ title: '', category: 'all', status: '공개' });
      setIsDirty(false);
    } else if (selectedId) {
      const notice = notices.find(n => n.id === selectedId);
      if (notice) {
        editor.commands.setContent(notice.body);
        setDraft({ title: notice.title, category: notice.category, status: notice.status });
        setIsDirty(false);
      }
    }
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    let list = [...notices];
    if (query) {
      const q = query.toLowerCase();
      list = list.filter(n => n.title.toLowerCase().includes(q));
    }
    if (filterCat !== 'all') list = list.filter(n => n.category === filterCat);
    if (filterStatus !== '전체') list = list.filter(n => n.status === filterStatus);
    return list.sort((a, b) => b.created_at.localeCompare(a.created_at));
  }, [notices, query, filterCat, filterStatus]);

  function campName(id: string) {
    return camps.find(c => c.id === id)?.name ?? id;
  }

  function handleAdd() {
    setSelectedId('new');
  }

  function handleSave() {
    if (!editor) return;
    const body = editor.getHTML();
    if (selectedId === 'new') {
      const notice: Notice = {
        id: `NTC-${Date.now()}`,
        title: draft.title,
        body,
        category: draft.category,
        status: draft.status,
        created_at: todayISO(),
      };
      onNoticeAdd?.(notice);
      setSelectedId(notice.id);
    } else if (selectedId) {
      const existing = notices.find(n => n.id === selectedId);
      if (!existing) return;
      onNoticeUpdate?.({ ...existing, title: draft.title, body, category: draft.category, status: draft.status });
    }
    setIsDirty(false);
  }

  function handleDelete() {
    if (!selectedId || selectedId === 'new') return;
    onNoticeDelete?.([selectedId]);
    setSelectedId(null);
    editor?.commands.setContent('');
  }

  const showEditor = selectedId !== null;

  return (
    <div>
      {/* Filter Bar */}
      <div className="ew-filter-bar">
        <h1 className="ew-filter-bar__title">공지 관리</h1>
        <div className="ew-filter-bar__group">
          <div className="ew-filter-input-wrap" style={{ width: 240 }}>
            <span className="search-icon"><SearchIcon /></span>
            <input
              type="text" placeholder="제목 검색"
              value={query} onChange={e => setQuery(e.target.value)}
            />
          </div>
          <select
            value={filterCat}
            onChange={e => setFilterCat(e.target.value)}
            style={selectStyle}
          >
            <option value="all">전체 캠프</option>
            {camps.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as typeof filterStatus)}
            style={selectStyle}
          >
            <option>전체</option>
            <option>공개</option>
            <option>비공개</option>
          </select>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '0 var(--page-px)' }}>
        {/* Action bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', padding: 'var(--space-2) var(--space-3)', justifyContent: 'flex-end' }}>
          <button className="ew-btn ew-btn--primary ew-btn--xsm" onClick={handleAdd}>공지 추가</button>
        </div>

        {/* Split panel */}
        <div style={{ display: 'flex', borderTop: '1px solid var(--color-border-table)', minHeight: 560 }}>

          {/* ── 왼쪽: 목록 ── */}
          <div style={{ width: '35%', minWidth: 220, maxWidth: 360, borderRight: '1px solid var(--color-border-subtle)', display: 'flex', flexDirection: 'column', overflowY: 'auto', maxHeight: 'calc(100vh - 200px)' }}>
            {/* List header */}
            <div style={{ display: 'flex', alignItems: 'center', background: 'var(--color-bg-subtle)', borderBottom: '1px solid var(--color-border-subtle)', padding: '0 14px', height: 40, flexShrink: 0, gap: 8 }}>
              <span style={colHdStyle}>제목</span>
              <span style={{ ...colHdStyle, width: 44, textAlign: 'center', flexShrink: 0 }}>상태</span>
              <span style={{ ...colHdStyle, width: 72, textAlign: 'right', flexShrink: 0 }}>날짜</span>
            </div>
            {/* Empty state */}
            {filtered.length === 0 && (
              <div style={{ padding: '40px 16px', textAlign: 'center', fontSize: 'var(--text-sm)', color: 'var(--color-ink-faint)', fontFamily: 'var(--font-ko)' }}>
                공지가 없습니다.
              </div>
            )}
            {/* Rows */}
            {filtered.map(n => {
              const isActive = n.id === selectedId;
              return (
                <div
                  key={n.id}
                  onClick={() => setSelectedId(n.id)}
                  style={{
                    padding: '11px 14px',
                    borderBottom: '1px solid var(--color-border-faint)',
                    borderLeft: isActive ? '3px solid var(--color-primary)' : '3px solid transparent',
                    background: isActive ? 'var(--color-primary-bg)' : 'var(--color-canvas)',
                    cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', gap: 5,
                    transition: 'background 0.1s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                    <span style={{ flex: 1, fontSize: 'var(--text-sm)', fontWeight: isActive ? 600 : 400, color: 'var(--color-ink-strong)', fontFamily: 'var(--font-ko)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {n.title || '(제목 없음)'}
                    </span>
                    <span style={{
                      fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 100, flexShrink: 0,
                      background: n.status === '공개' ? 'var(--color-success-light)' : 'var(--color-bg-quiet)',
                      color: n.status === '공개' ? 'var(--color-success)' : 'var(--color-ink-mute)',
                      fontFamily: 'var(--font-ko)',
                    }}>
                      {n.status}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {n.category !== 'all' && (
                      <span style={{ fontSize: 10, color: 'var(--color-primary)', background: 'var(--color-primary-bg)', padding: '1px 6px', borderRadius: 100, fontFamily: 'var(--font-ko)' }}>
                        {campName(n.category)}
                      </span>
                    )}
                    <span style={{ fontSize: 10, color: 'var(--color-ink-faint)', fontFamily: 'var(--font-mono)', marginLeft: 'auto' }}>
                      {n.created_at}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── 오른쪽: 에디터 ── */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            {!showEditor ? (
              /* Empty state */
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
                  <rect x="8" y="10" width="36" height="32" rx="5" stroke="var(--color-border-default)" strokeWidth="2" />
                  <path d="M16 20h20M16 27h13" stroke="var(--color-border-default)" strokeWidth="2" strokeLinecap="round" />
                </svg>
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-ink-faint)', fontFamily: 'var(--font-ko)' }}>
                  공지를 선택하거나 새 공지를 추가하세요.
                </span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '24px 28px', gap: 14 }}>

                {/* 제목 입력 */}
                <input
                  placeholder="제목을 입력하세요."
                  value={draft.title}
                  onChange={e => { setDraft(p => ({ ...p, title: e.target.value })); setIsDirty(true); }}
                  style={{
                    width: '100%', height: 46, border: 'none',
                    borderBottom: '2px solid var(--color-border-subtle)',
                    outline: 'none', fontSize: 'var(--text-xl)', fontWeight: 600,
                    fontFamily: 'var(--font-ko)', color: 'var(--color-ink-strong)',
                    background: 'transparent', padding: '0 2px',
                  }}
                />

                {/* 카테고리 + 상태 */}
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <select
                    value={draft.category}
                    onChange={e => { setDraft(p => ({ ...p, category: e.target.value })); setIsDirty(true); }}
                    style={selectStyle}
                  >
                    <option value="all">전체</option>
                    {camps.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <select
                    value={draft.status}
                    onChange={e => { setDraft(p => ({ ...p, status: e.target.value as '공개' | '비공개' })); setIsDirty(true); }}
                    style={selectStyle}
                  >
                    <option>공개</option>
                    <option>비공개</option>
                  </select>
                </div>

                {/* 편집 툴바 */}
                <div style={{ display: 'flex', gap: 4, alignItems: 'center', padding: '6px 0', borderTop: '1px solid var(--color-border-subtle)', borderBottom: '1px solid var(--color-border-subtle)', flexWrap: 'wrap' }}>
                  <ToolBtn active={editor?.isActive('bold')} onClick={() => editor?.chain().focus().toggleBold().run()} title="굵게 (Ctrl+B)">
                    <strong>B</strong>
                  </ToolBtn>
                  <ToolBtn active={editor?.isActive('italic')} onClick={() => editor?.chain().focus().toggleItalic().run()} title="기울임 (Ctrl+I)">
                    <em style={{ fontStyle: 'italic' }}>I</em>
                  </ToolBtn>
                  <ToolBtn active={editor?.isActive('underline')} onClick={() => editor?.chain().focus().toggleUnderline().run()} title="밑줄 (Ctrl+U)">
                    <u>U</u>
                  </ToolBtn>

                  <Divider />

                  <ToolBtn active={editor?.isActive('heading', { level: 1 })} onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} title="큰 제목">H1</ToolBtn>
                  <ToolBtn active={editor?.isActive('heading', { level: 2 })} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} title="중간 제목">H2</ToolBtn>
                  <ToolBtn active={editor?.isActive('paragraph') && !editor?.isActive('heading')} onClick={() => editor?.chain().focus().setParagraph().run()} title="본문">T</ToolBtn>

                  <Divider />

                  <ToolBtn active={editor?.isActive('bulletList')} onClick={() => editor?.chain().focus().toggleBulletList().run()} title="글머리 목록">
                    <span style={{ fontSize: 16, lineHeight: 1 }}>≡</span>
                  </ToolBtn>
                  <ToolBtn active={editor?.isActive('orderedList')} onClick={() => editor?.chain().focus().toggleOrderedList().run()} title="번호 목록">
                    <span style={{ fontSize: 13, lineHeight: 1 }}>1≡</span>
                  </ToolBtn>

                  <Divider />

                  {/* 글자 색상 */}
                  <label
                    title="글자 색상"
                    style={{ position: 'relative', width: 28, height: 28, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--color-border-subtle)', borderRadius: 4, background: 'var(--color-canvas)', flexShrink: 0 }}
                  >
                    <span style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: editor?.getAttributes('textStyle').color ?? 'var(--color-ink-strong)', userSelect: 'none' }}>A</span>
                    <div style={{ position: 'absolute', bottom: 3, left: 4, right: 4, height: 3, borderRadius: 1, background: editor?.getAttributes('textStyle').color ?? 'var(--color-ink-strong)' }} />
                    <input
                      ref={colorInputRef}
                      type="color"
                      defaultValue="#0F1115"
                      onInput={e => editor?.chain().focus().setColor((e.target as HTMLInputElement).value).run()}
                      style={{ position: 'absolute', width: 0, height: 0, opacity: 0, pointerEvents: 'none' }}
                    />
                  </label>

                  {/* 기본 색상 초기화 */}
                  <ToolBtn onClick={() => editor?.chain().focus().unsetColor().run()} title="색상 초기화">
                    <span style={{ fontSize: 10 }}>✕A</span>
                  </ToolBtn>
                </div>

                {/* 에디터 영역 */}
                <div
                  style={{ flex: 1, overflowY: 'auto', cursor: 'text', minHeight: 240, padding: '4px 2px' }}
                  onClick={() => editor?.commands.focus()}
                >
                  <EditorContent editor={editor} />
                </div>

                {/* 저장 / 삭제 버튼 */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 12, borderTop: '1px solid var(--color-border-subtle)', flexShrink: 0 }}>
                  {selectedId !== 'new' && (
                    <button className="ew-btn ew-btn--danger ew-btn--sm" onClick={handleDelete}>삭제</button>
                  )}
                  <button
                    className="ew-btn ew-btn--primary ew-btn--sm"
                    onClick={handleSave}
                    disabled={!isDirty && selectedId !== 'new'}
                  >
                    저장
                  </button>
                </div>

              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  height: 36, borderRadius: 6,
  border: '1px solid var(--color-border-subtle)',
  padding: '0 10px',
  fontSize: 'var(--text-sm)', fontFamily: 'var(--font-ko)',
  color: 'var(--color-ink-strong)', background: 'var(--color-canvas)',
  cursor: 'pointer',
};

const colHdStyle: React.CSSProperties = {
  flex: 1,
  fontSize: 'var(--text-xs)', fontWeight: 600,
  color: 'var(--color-ink-soft)',
  letterSpacing: 'var(--tracking-wide)',
  textTransform: 'uppercase',
};
