import { useEffect, useMemo, useRef, useState } from 'react';
import { Download, LogOut, RefreshCcw, Search, Trash2 } from 'lucide-react';
import { isSupabaseConfigured, supabase, supabaseConfigError } from './supabaseClient';

const days = ['LUNEDI', 'MARTEDI', 'MERCOLEDI', 'GIOVEDI', 'VENERDI', 'SABATO', 'DOMENICA'];
const dayLabels = { LUNEDI: 'Lun', MARTEDI: 'Mar', MERCOLEDI: 'Mer', GIOVEDI: 'Gio', VENERDI: 'Ven', SABATO: 'Sab', DOMENICA: 'Dom' };
const horizons = ['Questo mese', 'Prossimi 3 mesi', "Quest'anno"];
const colors = ['#111827', '#2563eb', '#16a34a', '#b45309', '#be123c', '#7c3aed', '#475569'];

export default function App() {
  if (!isSupabaseConfigured) return <MissingConfig />;
  return <AuthGate />;
}

function MissingConfig() {
  return <div className="auth-page"><div className="auth-card"><p className="eyebrow">Prioro</p><h1>Config Supabase mancante</h1><p>{supabaseConfigError}</p></div></div>;
}

function AuthGate() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false); });
    const { data } = supabase.auth.onAuthStateChange((_event, current) => { setSession(current); setLoading(false); });
    return () => data.subscription.unsubscribe();
  }, []);

  async function submit(e) {
    e.preventDefault();
    setMessage('');
    setLoading(true);
    const payload = { email, password };
    const { error } = mode === 'login'
      ? await supabase.auth.signInWithPassword(payload)
      : await supabase.auth.signUp({ ...payload, options: { emailRedirectTo: window.location.origin } });
    if (error) setMessage(error.message);
    else if (mode === 'register') setMessage("Registrazione completata. Controlla l'email per confermare l'account.");
    setLoading(false);
  }

  if (loading) return <div className="loading">Caricamento...</div>;
  if (!session) {
    return <div className="auth-page"><form className="auth-card" onSubmit={submit}>
      <p className="eyebrow">Prioro</p><h1>Prioro</h1><p>Organizza la tua settimana. Completa ciò che conta.</p>
      <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="Email" required />
      <input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="Password" minLength={6} required />
      {message && <div className="notice">{message}</div>}
      <button className="primary" type="submit">{mode === 'login' ? 'Accedi' : 'Registrati'}</button>
      <button className="link-btn" type="button" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>{mode === 'login' ? 'Crea account' : 'Ho già un account'}</button>
    </form></div>;
  }
  return <Planner session={session} />;
}

function Planner({ session }) {
  const user = session.user;
  const [categories, setCategories] = useState([]);
  const [goals, setGoals] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState('Pronto');
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [selectedDay, setSelectedDay] = useState(0);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [editingTaskId, setEditingTaskId] = useState('');
  const [taskEditDraft, setTaskEditDraft] = useState({ title: '', category_id: '', goal_id: '', priority: '', notes: '' });
  const [editingCategoryId, setEditingCategoryId] = useState('');
  const [categoryEditName, setCategoryEditName] = useState('');
  const [showCategoryCreator, setShowCategoryCreator] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newPriority, setNewPriority] = useState('');
  const [newGoal, setNewGoal] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [catName, setCatName] = useState('');
  const [catColor, setCatColor] = useState('#111827');
  const [goalTitle, setGoalTitle] = useState('');
  const [goalDate, setGoalDate] = useState('');
  const [goalDescription, setGoalDescription] = useState('');
  const [goalHorizon, setGoalHorizon] = useState('Questo mese');
  const [draggedTaskId, setDraggedTaskId] = useState('');
  const [hoverDay, setHoverDay] = useState(null);
  const [draggedGoalId, setDraggedGoalId] = useState('');
  const [hoverHorizon, setHoverHorizon] = useState(null);
  const dragRef = useRef({ id: '', x: 0, y: 0, active: false });
  const goalDragRef = useRef({ id: '', x: 0, y: 0, active: false });

  const categoryMap = useMemo(() => Object.fromEntries(categories.map(c => [c.id, c])), [categories]);
  const goalMap = useMemo(() => Object.fromEntries(goals.map(g => [g.id, g])), [goals]);
  const activeTasks = tasks.filter(t => t.status !== 'Fatto');
  const doneTasks = tasks.filter(t => t.status === 'Fatto');
  const activeGoals = goals.filter(g => g.status !== 'Archiviato' && g.status !== 'Completato');
  const filteredTasks = categoryFilter ? activeTasks.filter(t => t.category_id === categoryFilter) : activeTasks;
  const backlog = filteredTasks.filter(t => !t.day && t.title.toLowerCase().includes(query.toLowerCase()));
  const everyDay = filteredTasks.filter(t => t.day === 'OGNI_GIORNO');
  const weeklyCount = activeTasks.filter(t => t.day && t.day !== 'OGNI_GIORNO').length;

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true); setError('');
    await supabase.rpc('create_default_categories_for_user', { target_user: user.id });
    const [catRes, goalRes, taskRes] = await Promise.all([
      supabase.from('categories').select('*').order('created_at', { ascending: true }),
      supabase.from('goals').select('*').order('created_at', { ascending: false }),
      supabase.from('tasks').select('*').order('created_at', { ascending: false })
    ]);
    if (catRes.error || goalRes.error || taskRes.error) setError(catRes.error?.message || goalRes.error?.message || taskRes.error?.message);
    setCategories(catRes.data || []); setGoals(goalRes.data || []); setTasks(taskRes.data || []); setLoading(false);
  }

  async function addTask(e) {
    e.preventDefault();
    const title = newTitle.trim();
    if (!title) return;
    setSaving('Salvataggio...');
    const { data, error: err } = await supabase.from('tasks').insert({ user_id: user.id, title, category_id: newCategory || null, goal_id: newGoal || null, priority: newPriority || 'Media', notes: newNotes.trim(), day: '', status: 'Da fare' }).select('*').single();
    if (err) setError(err.message); else { setTasks(p => [data, ...p]); setNewTitle(''); setNewNotes(''); setNewGoal(''); setSaving('Salvato'); }
  }

  async function addCategory(e) {
    e.preventDefault();
    const name = catName.trim();
    if (!name) return;
    const { data, error: err } = await supabase.from('categories').insert({ user_id: user.id, name, color: catColor }).select('*').single();
    if (err) setError(err.message); else { setCategories(p => [...p, data]); setCatName(''); setCatColor(colors[(categories.length + 1) % colors.length]); setShowCategoryCreator(false); }
  }

  async function deleteCategory(id) {
    const category = categoryMap[id];
    const linkedTasks = tasks.filter(t => t.category_id === id).length;
    const linkedGoals = goals.filter(g => g.category_id === id).length;
    const warning = linkedTasks || linkedGoals
      ? `La categoria "${category?.name || 'selezionata'}" è collegata a ${linkedTasks} attività e ${linkedGoals} obiettivi. Verrà eliminata e gli elementi collegati resteranno senza categoria. Continuare?`
      : `Eliminare la categoria "${category?.name || 'selezionata'}"?`;
    if (!window.confirm(warning)) return;

    setSaving('Eliminazione categoria...');
    const previousCategories = categories;
    const previousTasks = tasks;
    const previousGoals = goals;

    setCategories(prev => prev.filter(c => c.id !== id));
    setTasks(prev => prev.map(t => t.category_id === id ? { ...t, category_id: null } : t));
    setGoals(prev => prev.map(g => g.category_id === id ? { ...g, category_id: null } : g));
    setCategoryFilter(prev => prev === id ? '' : prev);
    if (newCategory === id) setNewCategory('');

    const taskUpdate = linkedTasks ? await supabase.from('tasks').update({ category_id: null }).eq('category_id', id) : { error: null };
    const goalUpdate = linkedGoals ? await supabase.from('goals').update({ category_id: null }).eq('category_id', id) : { error: null };
    const deletion = await supabase.from('categories').delete().eq('id', id);

    const err = taskUpdate.error || goalUpdate.error || deletion.error;
    if (err) {
      setError(err.message);
      setCategories(previousCategories);
      setTasks(previousTasks);
      setGoals(previousGoals);
      setSaving('Errore');
    } else {
      setSaving('Categoria eliminata');
    }
  }

  async function addGoal(e) {
    e.preventDefault();
    const title = goalTitle.trim();
    if (!title) return;
    const { data, error: err } = await supabase.from('goals').insert({ user_id: user.id, title, description: goalDescription.trim(), target_date: goalDate || null, horizon: goalHorizon, status: 'In corso' }).select('*').single();
    if (err) setError(err.message); else { setGoals(p => [data, ...p]); setGoalTitle(''); setGoalDate(''); setGoalDescription(''); setGoalHorizon('Questo mese'); }
  }

  async function moveTask(id, day) {
    setTasks(p => p.map(t => t.id === id ? { ...t, day } : t));
    const { error: err } = await supabase.from('tasks').update({ day }).eq('id', id);
    if (err) { setError(err.message); loadAll(); } else setSaving('Salvato');
  }

  async function archiveTask(id) {
    setTasks(p => p.map(t => t.id === id ? { ...t, status: 'Fatto' } : t));
    const { error: err } = await supabase.from('tasks').update({ status: 'Fatto' }).eq('id', id);
    if (err) { setError(err.message); loadAll(); }
  }

  async function deleteTask(id) {
    setTasks(p => p.filter(t => t.id !== id));
    const { error: err } = await supabase.from('tasks').delete().eq('id', id);
    if (err) { setError(err.message); loadAll(); }
  }


  function startEditTask(task) {
    setEditingTaskId(task.id);
    setTaskEditDraft({
      title: task.title || '',
      category_id: task.category_id || '',
      goal_id: task.goal_id || '',
      priority: task.priority || 'Media',
      notes: task.notes || ''
    });
  }

  function cancelEditTask() {
    setEditingTaskId('');
    setTaskEditDraft({ title: '', category_id: '', goal_id: '', priority: '', notes: '' });
  }

  async function saveEditTask() {
    const id = editingTaskId;
    const title = taskEditDraft.title.trim();
    if (!id || !title) return cancelEditTask();
    const patch = {
      title,
      category_id: taskEditDraft.category_id || null,
      goal_id: taskEditDraft.goal_id || null,
      priority: taskEditDraft.priority || 'Media',
      notes: taskEditDraft.notes || ''
    };
    setEditingTaskId('');
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t));
    setSaving('Salvataggio modifica...');
    const { error: err } = await supabase.from('tasks').update(patch).eq('id', id);
    if (err) { setError(err.message); loadAll(); } else setSaving('Modifica salvata');
  }

  function startEditCategory(category) {
    setEditingCategoryId(category.id);
    setCategoryEditName(category.name || '');
  }

  function cancelEditCategory() {
    setEditingCategoryId('');
    setCategoryEditName('');
  }

  async function saveEditCategory() {
    const id = editingCategoryId;
    const name = categoryEditName.trim();
    if (!id || !name) return cancelEditCategory();
    setEditingCategoryId('');
    setCategories(prev => prev.map(c => c.id === id ? { ...c, name } : c));
    setSaving('Salvataggio categoria...');
    const { error: err } = await supabase.from('categories').update({ name }).eq('id', id);
    if (err) { setError(err.message); loadAll(); } else setSaving('Categoria aggiornata');
  }

  async function restoreTask(id) {
    setTasks(p => p.map(t => t.id === id ? { ...t, status: 'Da fare', day: '' } : t));
    const { error: err } = await supabase.from('tasks').update({ status: 'Da fare', day: '' }).eq('id', id);
    if (err) { setError(err.message); loadAll(); }
  }

  async function clearDay(day) {
    const ids = activeTasks.filter(t => t.day === day).map(t => t.id);
    if (!ids.length) return;
    setTasks(p => p.map(t => ids.includes(t.id) ? { ...t, day: '' } : t));
    const { error: err } = await supabase.from('tasks').update({ day: '' }).in('id', ids);
    if (err) { setError(err.message); loadAll(); }
  }

  async function updateGoalHorizon(id, horizon) {
    setGoals(p => p.map(g => g.id === id ? { ...g, horizon } : g));
    const { error: err } = await supabase.from('goals').update({ horizon }).eq('id', id);
    if (err) { setError(err.message); loadAll(); }
  }

  async function archiveGoal(id) {
    setGoals(p => p.map(g => g.id === id ? { ...g, status: 'Archiviato' } : g));
    const { error: err } = await supabase.from('goals').update({ status: 'Archiviato' }).eq('id', id);
    if (err) { setError(err.message); loadAll(); }
  }

  function goalPointerDown(e, id) {
    if (e.button !== undefined && e.button !== 0) return;
    e.preventDefault();
    goalDragRef.current = { id, x: e.clientX, y: e.clientY, active: false };
    window.addEventListener('pointermove', goalPointerMove);
    window.addEventListener('pointerup', goalPointerUp);
  }

  function goalPointerMove(e) {
    const state = goalDragRef.current;
    if (!state.id) return;
    if (!state.active) {
      if (Math.abs(e.clientX - state.x) < 6 && Math.abs(e.clientY - state.y) < 6) return;
      state.active = true;
      setDraggedGoalId(state.id);
      document.body.classList.add('dragging-task');
    }
    const zone = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-horizon]');
    setHoverHorizon(zone ? zone.getAttribute('data-horizon') : null);
  }

  function goalPointerUp(e) {
    const state = goalDragRef.current;
    window.removeEventListener('pointermove', goalPointerMove);
    window.removeEventListener('pointerup', goalPointerUp);
    document.body.classList.remove('dragging-task');
    if (state.active && state.id) {
      const zone = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-horizon]');
      if (zone) updateGoalHorizon(state.id, zone.getAttribute('data-horizon'));
    }
    goalDragRef.current = { id: '', x: 0, y: 0, active: false };
    setDraggedGoalId('');
    setHoverHorizon(null);
  }

  function pointerDown(e, id) {
    if (e.button !== undefined && e.button !== 0) return;
    e.preventDefault();
    dragRef.current = { id, x: e.clientX, y: e.clientY, active: false };
    window.addEventListener('pointermove', pointerMove);
    window.addEventListener('pointerup', pointerUp);
  }

  function pointerMove(e) {
    const state = dragRef.current;
    if (!state.id) return;
    if (!state.active) {
      if (Math.abs(e.clientX - state.x) < 6 && Math.abs(e.clientY - state.y) < 6) return;
      state.active = true; setDraggedTaskId(state.id); document.body.classList.add('dragging-task');
    }
    const zone = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-day]');
    setHoverDay(zone ? zone.getAttribute('data-day') : null);
  }

  function pointerUp(e) {
    const state = dragRef.current;
    window.removeEventListener('pointermove', pointerMove);
    window.removeEventListener('pointerup', pointerUp);
    document.body.classList.remove('dragging-task');
    if (state.active && state.id) {
      const zone = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-day]');
      if (zone) moveTask(state.id, zone.getAttribute('data-day'));
    }
    dragRef.current = { id: '', x: 0, y: 0, active: false }; setDraggedTaskId(''); setHoverDay(null);
  }

  function exportExcel() {
    const rows = tasks.map(t => `<tr><td>${esc(t.title)}</td><td>${esc(categoryMap[t.category_id]?.name || '')}</td><td>${esc(goalMap[t.goal_id]?.title || '')}</td><td>${esc(t.priority)}</td><td>${esc(t.day || 'NON PIANIFICATO')}</td><td>${esc(t.status)}</td><td>${esc(t.notes || '')}</td></tr>`).join('');
    downloadFile('prioro-attivita.xls', 'application/vnd.ms-excel', `<table><tr><th>Titolo</th><th>Categoria</th><th>Obiettivo</th><th>Priorità</th><th>Giorno</th><th>Stato</th><th>Note</th></tr>${rows}</table>`);
  }

  if (loading) return <div className="loading">Caricamento planner...</div>;

  return <main className="app-shell">
    <header className="topbar"><div><p className="eyebrow">Prioro</p><h1>Prioro</h1><p className="subtitle">Organizza la tua settimana · {user.email}</p></div><div className="top-actions"><span className="status-pill">{saving}</span><button className="soft-btn" onClick={loadAll}><RefreshCcw size={16}/>Aggiorna</button><button className="soft-btn" onClick={exportExcel}><Download size={16}/>Excel</button><button className="logout-btn" onClick={() => supabase.auth.signOut()}><LogOut size={16}/>Esci</button></div></header>
    {error && <div className="notice error">{error}</div>}
    <section className="focus-strip"><div><strong>{weeklyCount}</strong><span>in settimana</span></div><div><strong>{backlog.length}</strong><span>da pianificare</span></div><div><strong>{doneTasks.length}</strong><span>completate</span></div><div><strong>{activeGoals.length}</strong><span>obiettivi attivi</span></div></section>

    <section className="workflow-panel">
      <div className="workflow-create"><div className="create-task-head"><div><h2>Nuova attività</h2><p>Inseriscila, poi trascinala nel giorno corretto.</p></div><button className="category-secondary-btn" type="button" onClick={() => setShowCategoryCreator(v => !v)}>+ Categoria</button></div>
        <form className="quick-form-wide" onSubmit={addTask}>
          <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Scrivi cosa devi fare" />
          <select value={newCategory} onChange={e => setNewCategory(e.target.value)}><option value="">Categoria</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
          <select value={newPriority} onChange={e => setNewPriority(e.target.value)}><option value="">Priorità</option><option>Alta</option><option>Media</option><option>Bassa</option></select>
          <select value={newGoal} onChange={e => setNewGoal(e.target.value)}><option value="">Obiettivo</option>{activeGoals.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}</select>
          <input value={newNotes} onChange={e => setNewNotes(e.target.value)} placeholder="Note opzionali" />
          <button className="primary" type="submit">+ Aggiungi</button>
        </form>
        {showCategoryCreator && <form className="quick-category-inline" onSubmit={addCategory}><input value={catName} onChange={e => setCatName(e.target.value)} placeholder="Nome nuova categoria" /><input type="color" value={catColor} onChange={e => setCatColor(e.target.value)} /><button className="soft-btn">Crea categoria</button></form>}
      </div>

      <div className="workflow-backlog"><div className="section-title"><h2>Elenco attività</h2><span className="count">{backlog.length}</span></div><div className="search-row"><Search size={18}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Cerca attività da trascinare" /></div><div data-day="" className={`backlog-list-horizontal ${hoverDay === '' ? 'drag-over' : ''}`}>{backlog.length ? backlog.map(t => <TaskCard key={t.id} task={t} category={categoryMap[t.category_id]} goal={goalMap[t.goal_id]} dragged={draggedTaskId === t.id} onPointerDown={pointerDown} onDelete={deleteTask} onEdit={startEditTask} editingTaskId={editingTaskId} editDraft={taskEditDraft} setEditDraft={setTaskEditDraft} categories={categories} goals={activeGoals} onSaveEdit={saveEditTask} onCancelEdit={cancelEditTask} />) : <Empty text="Nessuna attività da pianificare." />}</div></div>

      <div className="workflow-week"><div className="calendar-head"><div><h2>Giorni della settimana</h2><p>Da mobile scegli il giorno con i pulsanti. Trascina le attività.</p></div></div><div className="mobile-day-tabs">{days.map((d, i) => <button key={d} className={selectedDay === i ? 'active' : ''} onClick={() => setSelectedDay(i)}>{dayLabels[d]}</button>)}</div><div className="week-grid">{days.map((day, i) => { const items = filteredTasks.filter(t => t.day === day); return <DayColumn key={day} day={day} active={selectedDay === i} items={items} categoryMap={categoryMap} goalMap={goalMap} hoverDay={hoverDay} draggedTaskId={draggedTaskId} pointerDown={pointerDown} archiveTask={archiveTask} clearDay={clearDay} onEdit={startEditTask} editingTaskId={editingTaskId} editDraft={taskEditDraft} setEditDraft={setTaskEditDraft} categories={categories} goals={activeGoals} onSaveEdit={saveEditTask} onCancelEdit={cancelEditTask} />; })}</div></div>
      <div className="workflow-everyday"><div className="day-title-row"><div className="day-title">OGNI GIORNO</div><button className="clear-day-btn" onClick={() => clearDay('OGNI_GIORNO')} disabled={!everyDay.length}>Svuota</button></div><div data-day="OGNI_GIORNO" className={`backlog-list-horizontal everyday-zone ${hoverDay === 'OGNI_GIORNO' ? 'drag-over' : ''}`}>{everyDay.length ? everyDay.map(t => <TaskCard key={t.id} task={t} category={categoryMap[t.category_id]} goal={goalMap[t.goal_id]} dragged={draggedTaskId === t.id} onPointerDown={pointerDown} onDelete={deleteTask} onEdit={startEditTask} editingTaskId={editingTaskId} editDraft={taskEditDraft} setEditDraft={setTaskEditDraft} categories={categories} goals={activeGoals} onSaveEdit={saveEditTask} onCancelEdit={cancelEditTask} />) : <Empty compact text="Trascina qui le attività ricorrenti." />}</div></div>
    </section>

    <section className="below-grid">
      <div className="panel goals-panel"><div className="section-title"><div><h2>Obiettivi</h2><p className="panel-hint">Ogni obiettivo nasce già dentro una tempistica. Poi puoi trascinarlo tra le sezioni.</p></div><span className="count">{activeGoals.length}</span></div><form className="goal-form-minimal" onSubmit={addGoal}><input value={goalTitle} onChange={e => setGoalTitle(e.target.value)} placeholder="Nome obiettivo" required /><select value={goalHorizon} onChange={e => setGoalHorizon(e.target.value)} required><option>Questo mese</option><option>Prossimi 3 mesi</option><option>Quest'anno</option></select><input value={goalDate} onChange={e => setGoalDate(e.target.value)} type="date" /><textarea value={goalDescription} onChange={e => setGoalDescription(e.target.value)} placeholder="Descrizione opzionale" rows="2" /><button className="soft-btn">+ Crea obiettivo</button></form><div className="goal-groups">{horizons.map(h => { const items = activeGoals.filter(g => g.horizon === h); return <div key={h} data-horizon={h} className={`goal-group ${hoverHorizon === h ? 'drag-over' : ''}`}><h3>{h}</h3>{items.length ? items.map(g => <GoalCard key={g.id} goal={g} dragged={draggedGoalId === g.id} onPointerDown={goalPointerDown} onArchive={archiveGoal} />) : <Empty compact text="Nessun obiettivo in questa tempistica." />}</div>; })}</div></div>
      <div className="panel categories-list-panel"><div className="section-title"><h2>Categorie</h2><span className="count">{categories.length}</span></div><div className="chips"><button className={!categoryFilter ? 'chip chip-active' : 'chip'} onClick={() => setCategoryFilter('')}>Tutte</button>{categories.map(c => editingCategoryId === c.id ? <span key={c.id} className="chip category-chip category-chip-editing" style={{ '--chip': c.color }}><input value={categoryEditName} onChange={e => setCategoryEditName(e.target.value)} onClick={e => e.stopPropagation()} onKeyDown={e => { if (e.key === 'Enter') saveEditCategory(); if (e.key === 'Escape') cancelEditCategory(); }} onBlur={saveEditCategory} autoFocus /></span> : <span key={c.id} className={categoryFilter === c.id ? 'chip chip-active category-chip' : 'chip category-chip'} style={{ '--chip': c.color }} onClick={() => setCategoryFilter(c.id)} onDoubleClick={() => startEditCategory(c)} title="Click per filtrare. Doppio click per modificare. Usa × per eliminare."><span className="category-chip-name">{c.name}</span><button type="button" className="category-delete-btn" aria-label={`Elimina categoria ${c.name}`} onClick={e => { e.stopPropagation(); deleteCategory(c.id); }}>×</button></span>)}</div></div>
      <div className="panel"><div className="archive-head"><h2>Archivio cose fatte</h2><span>{doneTasks.length}</span></div><div className="archive-list">{doneTasks.length ? doneTasks.slice(0, 20).map(t => <div className="archive-row" key={t.id}><span>{t.title}</span><div><button onClick={() => restoreTask(t.id)}>Ripristina</button><button className="danger-link" onClick={() => deleteTask(t.id)}>Elimina</button></div></div>) : <div className="archive-empty">Non ci sono attività archiviate.</div>}</div></div>
    </section>
  </main>;
}

function DayColumn({ day, active, items, categoryMap, goalMap, hoverDay, draggedTaskId, pointerDown, archiveTask, clearDay, onEdit, editingTaskId, editDraft, setEditDraft, categories, goals, onSaveEdit, onCancelEdit }) {
  return <div data-day={day} className={`day-column ${active ? 'mobile-active' : ''} ${hoverDay === day ? 'drag-over' : ''}`}><div className="day-title-row"><div className="day-title">{day}</div><button className="clear-day-btn" onClick={() => clearDay(day)} disabled={!items.length}>Svuota</button></div><div className="planned-list">{items.length ? items.map(t => <PlannedTask key={t.id} task={t} category={categoryMap[t.category_id]} goal={goalMap[t.goal_id]} dragged={draggedTaskId === t.id} onPointerDown={pointerDown} onArchive={archiveTask} onEdit={onEdit} editingTaskId={editingTaskId} editDraft={editDraft} setEditDraft={setEditDraft} categories={categories} goals={goals} onSaveEdit={onSaveEdit} onCancelEdit={onCancelEdit} />) : <Empty compact text="Trascina qui." />}</div></div>;
}

function TaskCard({ task, category, goal, dragged, onPointerDown, onDelete, onEdit, editingTaskId, editDraft, setEditDraft, categories, goals, onSaveEdit, onCancelEdit }) {
  const cat = category || { name: 'Senza categoria', color: '#94a3b8' };
  const editing = editingTaskId === task.id;
  if (editing) return <TaskEditForm editDraft={editDraft} setEditDraft={setEditDraft} categories={categories} goals={goals} onSave={onSaveEdit} onCancel={onCancelEdit} compact={false} />;
  return <div className={`backlog-task ${dragged ? 'is-dragging' : ''}`} onPointerDown={e => onPointerDown(e, task.id)} onDoubleClick={() => onEdit(task)} title="Trascina per pianificare. Doppio click per modificare."><div><strong>{task.title}</strong><div className="backlog-meta"><span style={{ '--dot': cat.color }}>{cat.name}</span><span>{task.priority}</span>{goal && <span>{goal.title}</span>}</div>{task.notes && <p>{task.notes}</p>}</div><button onClick={e => { e.stopPropagation(); onDelete(task.id); }}><Trash2 size={15}/></button></div>;
}

function PlannedTask({ task, category, goal, dragged, onPointerDown, onArchive, onEdit, editingTaskId, editDraft, setEditDraft, categories, goals, onSaveEdit, onCancelEdit }) {
  const cat = category || { name: 'Senza categoria', color: '#a1a1aa' };
  const editing = editingTaskId === task.id;
  if (editing) return <div className="planned-task is-editing"><TaskEditForm editDraft={editDraft} setEditDraft={setEditDraft} categories={categories} goals={goals} onSave={onSaveEdit} onCancel={onCancelEdit} compact /></div>;
  return <div className={`planned-task ${dragged ? 'is-dragging' : ''}`} onPointerDown={e => onPointerDown(e, task.id)} onDoubleClick={() => onEdit(task)} title="Trascina per spostare. Doppio click per modificare."><button className="check" onClick={e => { e.stopPropagation(); onArchive(task.id); }} aria-label="Segna come fatta" /><div className="planned-content"><span className="planned-title">{task.title}</span><span className="planned-category" style={{ '--cat-color': cat.color }}>{cat.name}{goal ? ` · ${goal.title}` : ''}</span></div></div>;
}

function TaskEditForm({ editDraft, setEditDraft, categories, goals, onSave, onCancel, compact }) {
  return <div className={`task-edit-form ${compact ? 'compact' : ''}`} onPointerDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}>
    <input value={editDraft.title} onChange={e => setEditDraft(d => ({ ...d, title: e.target.value }))} placeholder="Modifica attività" autoFocus onKeyDown={e => { if (e.key === 'Enter') onSave(); if (e.key === 'Escape') onCancel(); }} />
    <select value={editDraft.category_id} onChange={e => setEditDraft(d => ({ ...d, category_id: e.target.value }))}><option value="">Senza categoria</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
    <select value={editDraft.goal_id} onChange={e => setEditDraft(d => ({ ...d, goal_id: e.target.value }))}><option value="">Senza obiettivo</option>{goals.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}</select>
    <select value={editDraft.priority} onChange={e => setEditDraft(d => ({ ...d, priority: e.target.value }))}><option>Alta</option><option>Media</option><option>Bassa</option></select>
    {!compact && <input value={editDraft.notes} onChange={e => setEditDraft(d => ({ ...d, notes: e.target.value }))} placeholder="Note" />}
    <div className="task-edit-actions"><button type="button" onClick={onSave}>Salva</button><button type="button" onClick={onCancel}>Annulla</button></div>
  </div>;
}

function GoalCard({ goal, dragged, onPointerDown, onArchive }) {
  return <div className={`goal-card ${dragged ? 'is-dragging' : ''}`} onPointerDown={e => onPointerDown(e, goal.id)} title="Trascina per cambiare tempistica"><div className="goal-card-head"><strong>{goal.title}</strong><button onClick={e => { e.stopPropagation(); onArchive(goal.id); }}>Archivia</button></div>{goal.description && <p>{goal.description}</p>}{goal.target_date && <div className="goal-meta"><span>{goal.target_date}</span></div>}</div>;
}

function Empty({ text, compact = false }) { return <div className={`empty ${compact ? 'compact' : ''}`}>{text}</div>; }
function esc(v) { return String(v).replace(/[&<>'"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[m])); }
function downloadFile(name, type, content) { const blob = new Blob([content], { type }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 500); }
