import { useState, useEffect } from 'react';
import TopNav from './components/TopNav';
import StudentBoardPage, { defaultStudents, type Student } from './pages/StudentBoardPage';
import CampBoardPage from './pages/CampBoardPage';
import CampDetailPage from './pages/CampDetailPage';
import CellGalleryPage from './pages/CellGalleryPage';
import AddStudentPage from './pages/AddStudentPage';
import StudentDetailPage from './pages/StudentDetailPage';
import CampCreatePage from './pages/CampCreatePage';
import rawCamps from './data/camps.json';
import './index.css';

type Page = 'students' | 'addStudent' | 'studentDetail' | 'camps' | 'campDetail' | 'campCreate' | 'dashboard' | 'agent' | 'board' | 'account' | 'gallery';
export type CampTab = '학생명단' | '시간표' | '숙박정보' | '스탭&강사';

export interface Camp {
  id: string; name: string; location: string; country: string;
  accommodation: string; capacity: number; status: string;
  start_date: string; end_date: string; staff: string[]; teachers: string[];
}

interface NavState {
  page: Page;
  activeCampId: string;
  activeStudentId: string;
  editStudentId: string;
  activeCampTab: CampTab;
}

function ComingSoon({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400, color: 'var(--color-text-muted)', fontSize: 18, fontFamily: 'var(--font-ko)' }}>
      {label} 페이지 준비 중
    </div>
  );
}

export default function App() {
  const [page,            setPage]           = useState<Page>('students');
  const [activeCampId,    setActiveCampId]   = useState<string>('');
  const [activeStudentId, setActiveStudentId] = useState<string>('');
  const [editStudentId,   setEditStudentId]  = useState<string>('');
  const [activeCampTab,   setActiveCampTab]  = useState<CampTab>('학생명단');
  const [students,        setStudents]       = useState<Student[]>(defaultStudents);
  const [camps,           setCamps]          = useState<Camp[]>(() => {
    try {
      const defaults = rawCamps as Camp[];
      const storedRaw = localStorage.getItem('ew-camps');
      if (!storedRaw) return defaults;
      const stored = JSON.parse(storedRaw) as Camp[];
      if (stored.length === 0) return defaults;
      // 병합: defaults를 기반으로 localStorage 항목이 같은 id면 덮어씀
      const map = new Map(defaults.map(c => [c.id, c]));
      stored.forEach(c => map.set(c.id, c));
      return Array.from(map.values());
    } catch { return rawCamps as Camp[]; }
  });

  // Push the initial history entry so the first page is also in the stack
  useEffect(() => {
    window.history.replaceState(
      { page: 'students', activeCampId: '', activeStudentId: '', editStudentId: '', activeCampTab: '학생명단' } satisfies NavState,
      ''
    );
  }, []);

  // Browser back / forward
  useEffect(() => {
    function handlePop(e: PopStateEvent) {
      const s = e.state as NavState | null;
      if (!s) return;
      setPage(s.page);
      setActiveCampId(s.activeCampId ?? '');
      setActiveStudentId(s.activeStudentId ?? '');
      setEditStudentId(s.editStudentId ?? '');
      setActiveCampTab(s.activeCampTab ?? '학생명단');
    }
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, []);

  function navigate(
    newPage: Page,
    opts: { campId?: string; studentId?: string; editId?: string; tab?: CampTab } = {},
    snap?: { activeCampId: string; activeStudentId: string; editStudentId: string; activeCampTab: CampTab }
  ) {
    const base = snap ?? { activeCampId, activeStudentId, editStudentId, activeCampTab };
    const newState: NavState = {
      page:            newPage,
      activeCampId:    opts.campId    !== undefined ? opts.campId    : base.activeCampId,
      activeStudentId: opts.studentId !== undefined ? opts.studentId : base.activeStudentId,
      editStudentId:   opts.editId    !== undefined ? opts.editId    : base.editStudentId,
      activeCampTab:   opts.tab       !== undefined ? opts.tab       : base.activeCampTab,
    };
    window.history.pushState(newState, '');
    setPage(newPage);
    if (opts.campId    !== undefined) setActiveCampId(opts.campId);
    if (opts.studentId !== undefined) setActiveStudentId(opts.studentId);
    if (opts.editId    !== undefined) setEditStudentId(opts.editId);
    if (opts.tab       !== undefined) setActiveCampTab(opts.tab);
  }

  function handleCampSave(camp: Camp) {
    const next = camps.some(c => c.id === camp.id)
      ? camps.map(c => c.id === camp.id ? camp : c)
      : [...camps, camp];
    setCamps(next);
    try { localStorage.setItem('ew-camps', JSON.stringify(next)); } catch {}
    navigate('campDetail', { campId: camp.id, tab: '학생명단' });
  }

  function handleSaveStudent(student: Student) {
    if (editStudentId) {
      setStudents(prev => prev.map(x => x.id === student.id ? student : x));
      navigate('studentDetail', { studentId: student.id, editId: '' });
    } else {
      setStudents(prev => [...prev, student]);
      navigate('students', { editId: '' });
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#fff', overflowX: 'auto' }}>
      <TopNav activePage={page} onNavigate={(key) => navigate(key as Page, { editId: '', campId: '', studentId: '', tab: '학생명단' })} />

      <main>
        {page === 'students' && (
          <StudentBoardPage
            students={students}
            onAdd={() => navigate('addStudent', { editId: '' })}
            onStudentSelect={id => navigate('studentDetail', { studentId: id })}
            onStudentsImport={imported => setStudents(prev => {
              const map = new Map(prev.map(s => [s.id, s]));
              imported.forEach(s => map.set(s.id, s));
              return Array.from(map.values());
            })}
            onStudentUpdate={updated => setStudents(prev => prev.map(s => s.id === updated.id ? updated : s))}
          />
        )}
        {page === 'addStudent' && (
          <AddStudentPage
            onBack={() => navigate(editStudentId ? 'studentDetail' : 'students')}
            onSave={handleSaveStudent}
            editStudent={editStudentId ? students.find(x => x.id === editStudentId) : undefined}
          />
        )}
        {page === 'studentDetail' && (() => {
          const s = students.find(x => x.id === activeStudentId);
          return s ? (
            <StudentDetailPage
              student={s}
              camps={camps}
              onBack={() => navigate('students')}
              onEdit={() => navigate('addStudent', { editId: activeStudentId })}
              onStudentUpdate={updated => setStudents(prev => prev.map(x => x.id === updated.id ? updated : x))}
            />
          ) : null;
        })()}
        {page === 'camps' && (
          <CampBoardPage
            camps={camps}
            onCampSelect={campId => navigate('campDetail', { campId, tab: '학생명단' })}
            onCampCreate={() => navigate('campCreate', { tab: '학생명단' })}
          />
        )}
        {page === 'campDetail' && (
          <CampDetailPage
            camps={camps}
            campId={activeCampId}
            activeTab={activeCampTab}
            onTabChange={tab => navigate('campDetail', { tab })}
            onBack={() => navigate('camps')}
            onEdit={() => navigate('campCreate', { tab: activeCampTab })}
            students={students as any}
            onStudentUpdate={(updated: any) => setStudents(prev => prev.map(s => s.id === updated.id ? { ...s, ...updated } : s))}
            onCampUpdate={(updated: Camp) => {
              const next = camps.map(c => c.id === updated.id ? updated : c);
              setCamps(next);
              try { localStorage.setItem('ew-camps', JSON.stringify(next)); } catch {}
            }}
          />
        )}
        {page === 'campCreate' && (
          <CampCreatePage
            camps={camps}
            editCampId={activeCampId || undefined}
            allStudents={students as any}
            onStudentUpdate={(updated: any) => setStudents(prev => prev.map(s => s.id === updated.id ? { ...s, ...updated } : s))}
            activeTab={activeCampTab}
            onTabChange={tab => navigate('campCreate', { tab })}
            onBack={() => navigate('camps')}
            onSave={handleCampSave}
          />
        )}
        {page === 'gallery' && <CellGalleryPage />}
        {page !== 'students' && page !== 'addStudent' && page !== 'studentDetail' && page !== 'camps' && page !== 'campDetail' && page !== 'campCreate' && page !== 'gallery' && (
          <ComingSoon label={
            page === 'dashboard' ? 'Dashboard' :
            page === 'agent'     ? 'Agent' :
            page === 'board'     ? '게시판' : '계정관리'
          } />
        )}
      </main>
    </div>
  );
}
