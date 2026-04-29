import { useState, useEffect, useMemo } from 'react';
import TopNav from './components/TopNav';
import StudentBoardPage, { defaultStudents, type Student } from './pages/StudentBoardPage';
import CampBoardPage from './pages/CampBoardPage';
import CampDetailPage from './pages/CampDetailPage';
import AddStudentPage from './pages/AddStudentPage';
import StudentDetailPage from './pages/StudentDetailPage';
import CampCreatePage from './pages/CampCreatePage';
import AgentBoardPage, { type Agent } from './pages/AgentBoardPage';
import DashboardPage from './pages/DashboardPage';
import SettingsPage from './pages/SettingsPage';
import rawCamps from './data/camps.json';
import rawAgents from './data/agents.json';
import { UndoToastProvider } from './hooks/useUndoToast';
import './index.css';

type Page = 'students' | 'addStudent' | 'studentDetail' | 'camps' | 'campDetail' | 'campCreate' | 'dashboard' | 'agent' | 'board' | 'account';
export type CampTab = 'Students' | 'Accommodation' | 'Staff' | 'Class' | 'Timetable';

export interface Camp {
  id: string; name: string; location: string; country: string;
  accommodation: string; capacity: number; status: string;
  start_date: string; end_date: string; staff: string[];
  enrolledCount?: number;
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
  const [activeCampTab,   setActiveCampTab]  = useState<CampTab>('Students');
  const [students,        setStudents]       = useState<Student[]>(() => {
    try {
      const stored = localStorage.getItem('ew-students');
      if (!stored) return defaultStudents;
      const parsed = JSON.parse(stored) as Student[];
      if (parsed.length === 0) return defaultStudents;
      const map = new Map(defaultStudents.map(s => [s.id, s]));
      parsed.forEach(s => map.set(s.id, s));
      return Array.from(map.values());
    } catch { return defaultStudents; }
  });
  const [agents,          setAgents]         = useState<Agent[]>(() => {
    try {
      const defaults = rawAgents as Agent[];
      const stored = localStorage.getItem('ew-agents');
      if (!stored) return defaults;
      const parsed = JSON.parse(stored) as Agent[];
      if (parsed.length === 0) return defaults;
      const map = new Map(defaults.map(a => [a.id, a]));
      parsed.forEach(a => map.set(a.id, a));
      return Array.from(map.values());
    } catch { return rawAgents as Agent[]; }
  });
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

  // One-time migration: remove orphaned teacher localStorage data
  useEffect(() => {
    try { localStorage.removeItem('ew-master-teacher'); } catch {}
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key?.startsWith('ew-campstaff-')) continue;
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        if ('teacherIds' in parsed) {
          const { teacherIds: _removed, ...rest } = parsed;
          localStorage.setItem(key, JSON.stringify(rest));
        }
      }
    } catch {}
  }, []);

  // Push the initial history entry so the first page is also in the stack
  useEffect(() => {
    window.history.replaceState(
      { page: 'students', activeCampId: '', activeStudentId: '', editStudentId: '', activeCampTab: 'Students' } satisfies NavState,
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
      setActiveCampTab(s.activeCampTab ?? 'Students');
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

  const enrichedCamps = useMemo(() =>
    camps.map(c => ({
      ...c,
      enrolledCount: students.filter(s => s.history.current_camp_id === c.id).length,
    })),
  [camps, students]);

  function handleCampSave(camp: Camp) {
    const next = camps.some(c => c.id === camp.id)
      ? camps.map(c => c.id === camp.id ? camp : c)
      : [...camps, camp];
    setCamps(next);
    try { localStorage.setItem('ew-camps', JSON.stringify(next)); } catch {}
    navigate('campDetail', { campId: camp.id, tab: 'Students' });
  }

  const [trashedStudents, setTrashedStudents] = useState<(Student & { deletedAt: string })[]>(() => {
    try { const r = localStorage.getItem('ew-trash-students'); return r ? JSON.parse(r) : []; }
    catch { return []; }
  });

  function saveTrashed(next: (Student & { deletedAt: string })[]) {
    setTrashedStudents(next);
    try { localStorage.setItem('ew-trash-students', JSON.stringify(next)); } catch {}
  }

  function saveStudents(next: Student[]) {
    setStudents(next);
    try { localStorage.setItem('ew-students', JSON.stringify(next)); } catch {}
  }

  function handleSaveStudent(student: Student) {
    if (editStudentId) {
      saveStudents(students.map(x => x.id === student.id ? student : x));
      navigate('studentDetail', { studentId: student.id, editId: '' });
    } else {
      saveStudents([...students, student]);
      navigate('students', { editId: '' });
    }
  }

  return (
    <UndoToastProvider>
    <div style={{ minHeight: '100vh', background: '#fff', overflowX: 'auto' }}>
      <TopNav activePage={page} onNavigate={(key) => navigate(key as Page, { editId: '', campId: '', studentId: '', tab: 'Students' })} />

      <main>
        {page === 'students' && (
          <StudentBoardPage
            students={students}
            agents={agents}
            camps={camps}
            onAdd={() => navigate('addStudent', { editId: '' })}
            onStudentSelect={id => navigate('studentDetail', { studentId: id })}
            onStudentsImport={imported => {
              const next = (() => {
                const map = new Map(students.map(s => [s.id, s]));
                imported.forEach(s => map.set(s.id, s));
                return Array.from(map.values());
              })();
              saveStudents(next);
            }}
            onStudentUpdate={updated => saveStudents(students.map(s => s.id === updated.id ? updated : s))}
            onStudentDelete={(ids: string[]) => {
              ids.forEach(id => {
                try { localStorage.removeItem(`ew-family-${id}`); } catch {}
              });
              // 각 캠프 클래스에서 제거
              const affectedCampIds = new Set(
                students.filter(s => ids.includes(s.id)).flatMap(s => s.camp_records?.map(r => r.camp_id) ?? [])
              );
              affectedCampIds.forEach(campId => {
                try {
                  const key = `ew-classes-${campId}`;
                  const raw = localStorage.getItem(key);
                  if (!raw) return;
                  const classes = JSON.parse(raw);
                  const updated = classes.map((c: { studentIds: string[] }) => ({ ...c, studentIds: c.studentIds.filter((sid: string) => !ids.includes(sid)) }));
                  localStorage.setItem(key, JSON.stringify(updated));
                } catch {}
              });
              const deleted = students
                .filter(s => ids.includes(s.id))
                .map(s => ({ ...s, deletedAt: new Date().toISOString() }));
              saveTrashed([...trashedStudents, ...deleted]);
              saveStudents(students.filter(s => !ids.includes(s.id)));
            }}
          />
        )}
        {page === 'addStudent' && (
          <AddStudentPage
            onBack={() => navigate(editStudentId ? 'studentDetail' : 'students')}
            onSave={handleSaveStudent}
            editStudent={editStudentId ? students.find(x => x.id === editStudentId) : undefined}
            agents={agents}
          />
        )}
        {page === 'studentDetail' && (() => {
          const s = students.find(x => x.id === activeStudentId);
          return s ? (
            <StudentDetailPage
              student={s}
              camps={camps}
              initialCampId={activeCampId || undefined}
              onBack={() => navigate(activeCampId ? 'campDetail' : 'students')}
              onEdit={() => navigate('addStudent', { editId: activeStudentId })}
              onStudentUpdate={updated => saveStudents(students.map(x => x.id === updated.id ? updated : x))}
            />
          ) : null;
        })()}
        {page === 'camps' && (
          <CampBoardPage
            camps={enrichedCamps}
            onCampSelect={campId => navigate('campDetail', { campId, tab: 'Students' })}
            onCampCreate={() => navigate('campCreate', { tab: 'Students' })}
            onTimetableEdit={campId => navigate('campCreate', { campId, tab: 'Timetable' })}
            onCampImport={imported => {
              const next = (() => {
                const map = new Map(camps.map(c => [c.id, c]));
                imported.forEach(c => map.set(c.id, c));
                return Array.from(map.values());
              })();
              setCamps(next);
              try { localStorage.setItem('ew-camps', JSON.stringify(next)); } catch {}
            }}
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
            onStudentClick={id => navigate('studentDetail', { studentId: id })}
            students={students as any}
            agents={agents}
            onStudentUpdate={(updated: any) => saveStudents(students.map(s => s.id === updated.id ? { ...s, ...updated } : s))}
            onCampUpdate={(updated: Camp) => {
              const next = camps.map(c => c.id === updated.id ? updated : c);
              setCamps(next);
              try { localStorage.setItem('ew-camps', JSON.stringify(next)); } catch {}
            }}
            onCampDelete={(campId: string) => {
              const enrolled = students.filter(s => s.history?.current_camp_id === campId);
              if (enrolled.length > 0) {
                const camp = camps.find(c => c.id === campId);
                alert(`[${camp?.name ?? campId}] 캠프에 배정된 학생이 ${enrolled.length}명 있습니다.\n학생의 캠프를 먼저 변경하거나 학생을 삭제한 후 진행할 수 있습니다.`);
                return;
              }
              const next = camps.filter(c => c.id !== campId);
              setCamps(next);
              try { localStorage.setItem('ew-camps', JSON.stringify(next)); } catch {}
              // 관련 localStorage 키 정리
              const prefixes = [
                `ew-classes-${campId}`,
                `ew-campstaff-${campId}`,
                `ew-hotels-${campId}`,
                `ew-timetable-slots-${campId}`,
              ];
              prefixes.forEach(k => { try { localStorage.removeItem(k); } catch {} });
              // 클래스별 timetable 키 정리
              try {
                Object.keys(localStorage)
                  .filter(k => k.startsWith(`ew-timetable-${campId}`))
                  .forEach(k => localStorage.removeItem(k));
              } catch {}
              navigate('camps');
            }}
          />
        )}
        {page === 'campCreate' && (
          <CampCreatePage
            camps={camps}
            editCampId={activeCampId || undefined}
            allStudents={students as any}
            agents={agents}
            onStudentUpdate={(updated: any) => saveStudents(students.map(s => s.id === updated.id ? { ...s, ...updated } : s))}
            activeTab={activeCampTab}
            onTabChange={tab => navigate('campCreate', { tab })}
            onBack={() => navigate('camps')}
            onSave={handleCampSave}
          />
        )}
        {page === 'agent' && (
          <AgentBoardPage
            agents={agents}
            onAgentAdd={agent => {
              const next = [...agents, agent];
              setAgents(next);
              try { localStorage.setItem('ew-agents', JSON.stringify(next)); } catch {}
            }}
            onAgentUpdate={updated => {
              const next = agents.map(a => a.id === updated.id ? updated : a);
              setAgents(next);
              try { localStorage.setItem('ew-agents', JSON.stringify(next)); } catch {}
            }}
            onAgentDelete={ids => {
              const blocked = ids.filter(id =>
                students.some(s => s.history?.agent_id === id)
              );
              if (blocked.length > 0) {
                const names = blocked.map(id => agents.find(a => a.id === id)?.name ?? id).join(', ');
                alert(`[${names}] 에이전시에 소속된 학생이 있습니다.\n학생의 에이전시를 먼저 변경하거나 학생을 삭제한 후 진행할 수 있습니다.`);
                return;
              }
              const next = agents.filter(a => !ids.includes(a.id));
              setAgents(next);
              try { localStorage.setItem('ew-agents', JSON.stringify(next)); } catch {}
            }}
            onAgentsImport={imported => {
              const next = (() => {
                const map = new Map(agents.map(a => [a.id, a]));
                imported.forEach(a => map.set(a.id, a));
                return Array.from(map.values());
              })();
              setAgents(next);
              try { localStorage.setItem('ew-agents', JSON.stringify(next)); } catch {}
            }}
          />
        )}
        {page === 'dashboard' && (
          <DashboardPage
            students={students}
            camps={enrichedCamps}
            agents={agents}
            onNavigate={(p, opts) => navigate(p as Page, { campId: opts?.campId ?? '', studentId: opts?.studentId ?? '' })}
          />
        )}
        {page === 'account' && (
          <SettingsPage
            trashedStudents={trashedStudents}
            onRestore={ids => {
              const toRestore = trashedStudents.filter(s => ids.includes(s.id)).map(({ deletedAt: _d, ...s }) => s);
              saveStudents([...students, ...toRestore]);
              saveTrashed(trashedStudents.filter(s => !ids.includes(s.id)));
            }}
            onPermanentDelete={ids => saveTrashed(trashedStudents.filter(s => !ids.includes(s.id)))}
          />
        )}
        {page !== 'students' && page !== 'addStudent' && page !== 'studentDetail' && page !== 'camps' && page !== 'campDetail' && page !== 'campCreate' && page !== 'agent' && page !== 'dashboard' && page !== 'account' && (
          <ComingSoon label="게시판" />
        )}
      </main>
    </div>
    </UndoToastProvider>
  );
}
