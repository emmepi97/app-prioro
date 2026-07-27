import { useEffect, useMemo, useRef, useState } from 'react';
import { Download, LogOut, Search, Trash2 } from 'lucide-react';
import { isSupabaseConfigured, supabase, supabaseConfigError } from './supabaseClient';

const days = ['LUNEDI', 'MARTEDI', 'MERCOLEDI', 'GIOVEDI', 'VENERDI', 'SABATO', 'DOMENICA'];
const dayLabels = { LUNEDI: 'Lun', MARTEDI: 'Mar', MERCOLEDI: 'Mer', GIOVEDI: 'Gio', VENERDI: 'Ven', SABATO: 'Sab', DOMENICA: 'Dom' };
const dayFullLabels = { LUNEDI: 'Lunedì', MARTEDI: 'Martedì', MERCOLEDI: 'Mercoledì', GIOVEDI: 'Giovedì', VENERDI: 'Venerdì', SABATO: 'Sabato', DOMENICA: 'Domenica' };
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
  return <Prioro session={session} />;
}

function Prioro({ session }) {
  const user = session.user;
  const [view, setView] = useState('planner');
  const [categories, setCategories] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState('Pronto');
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [selectedDay, setSelectedDay] = useState(0);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statsPeriod, setStatsPeriod] = useState('30');
  const [showCategoryCreator, setShowCategoryCreator] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newPriority, setNewPriority] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [catName, setCatName] = useState('');
  const [catColor, setCatColor] = useState('#111827');
  const [draggedTaskId, setDraggedTaskId] = useState('');
  const [hoverDay, setHoverDay] = useState(null);
  const [editingTaskId, setEditingTaskId] = useState('');
  const [isTaskEditSheetOpen, setIsTaskEditSheetOpen] = useState(false);
  const [taskEditDraft, setTaskEditDraft] = useState({ title: '', category_id: '', priority: '', notes: '' });
  const [editingCategoryId, setEditingCategoryId] = useState('');
  const [categoryEditName, setCategoryEditName] = useState('');
  const dragRef = useRef({ id: '', x: 0, y: 0, active: false });
  const lastTapRef = useRef({ id: '', time: 0 });

  const categoryMap = useMemo(() => Object.fromEntries(categories.map(c => [c.id, c])), [categories]);
  const activeTasks = tasks.filter(t => t.status !== 'Fatto');
  const doneTasks = tasks.filter(t => t.status === 'Fatto');
  const filteredTasks = categoryFilter ? activeTasks.filter(t => t.category_id === categoryFilter) : activeTasks;
  const backlog = filteredTasks.filter(t => !t.day && t.title.toLowerCase().includes(query.toLowerCase()));
  const everyDay = filteredTasks.filter(t => t.day === 'OGNI_GIORNO');
  const futureTasks = filteredTasks.filter(t => t.day === 'FUTURO');
  const weeklyCount = activeTasks.filter(t => days.includes(t.day)).length;
  const editingTask = tasks.find(t => t.id === editingTaskId);

  const stats = useMemo(() => buildStats(tasks, categories, statsPeriod), [tasks, categories, statsPeriod]);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    setError('');
    await supabase.rpc('create_default_categories_for_user', { target_user: user.id });
    const [catRes, taskRes] = await Promise.all([
      supabase.from('categories').select('*').order('created_at', { ascending: true }),
      supabase.from('tasks').select('*').order('created_at', { ascending: false })
    ]);
    if (catRes.error || taskRes.error) setError(catRes.error?.message || taskRes.error?.message);
    setCategories(catRes.data || []);
    setTasks(taskRes.data || []);
    setLoading(false);
  }

  async function addTask(e) {
    e.preventDefault();
    const title = newTitle.trim();
    if (!title) return;
    setSaving('Salvataggio...');
    const { data, error: err } = await supabase.from('tasks').insert({
      user_id: user.id,
      title,
      category_id: newCategory || null,
      priority: newPriority || 'Media',
      notes: newNotes.trim(),
      day: '',
      status: 'Da fare'
    }).select('*').single();
    if (err) setError(err.message);
    else {
      setTasks(p => [data, ...p]);
      setNewTitle('');
      setNewNotes('');
      setSaving('Salvato');
    }
  }

  async function addCategory(e) {
    e.preventDefault();
    const name = catName.trim();
    if (!name) return;
    const { data, error: err } = await supabase.from('categories').insert({ user_id: user.id, name, color: catColor }).select('*').single();
    if (err) setError(err.message);
    else {
      setCategories(p => [...p, data]);
      setCatName('');
      setCatColor(colors[(categories.length + 1) % colors.length]);
      setShowCategoryCreator(false);
    }
  }

  async function deleteCategory(id) {
    const category = categoryMap[id];
    const linkedTasks = tasks.filter(t => t.category_id === id).length;
    const warning = linkedTasks
      ? `La categoria "${category?.name || 'selezionata'}" è collegata a ${linkedTasks} attività. Verrà eliminata e le attività resteranno senza categoria. Continuare?`
      : `Eliminare la categoria "${category?.name || 'selezionata'}"?`;
    if (!window.confirm(warning)) return;
    setSaving('Eliminazione categoria...');
    const previousCategories = categories;
    const previousTasks = tasks;
    setCategories(prev => prev.filter(c => c.id !== id));
    setTasks(prev => prev.map(t => t.category_id === id ? { ...t, category_id: null } : t));
    setCategoryFilter(prev => prev === id ? '' : prev);
    if (newCategory === id) setNewCategory('');
    const taskUpdate = linkedTasks ? await supabase.from('tasks').update({ category_id: null }).eq('category_id', id) : { error: null };
    const deletion = await supabase.from('categories').delete().eq('id', id);
    const err = taskUpdate.error || deletion.error;
    if (err) {
      setError(err.message);
      setCategories(previousCategories);
      setTasks(previousTasks);
      setSaving('Errore');
    } else setSaving('Categoria eliminata');
  }

  async function moveTask(id, day) {
    setSaving('Salvataggio...');
    setTasks(p => p.map(t => t.id === id ? { ...t, day } : t));
    const { error: err } = await supabase.from('tasks').update({ day }).eq('id', id);
    if (err) { setError(err.message); loadAll(); }
    else setSaving('Salvato');
  }

  async function archiveTask(id) {
    const today = new Date().toISOString();
    setTasks(p => p.map(t => t.id === id ? { ...t, status: 'Fatto', updated_at: today } : t));
    const { error: err } = await supabase.from('tasks').update({ status: 'Fatto' }).eq('id', id);
    if (err) { setError(err.message); loadAll(); }
    else setSaving('Completata');
  }

  async function deleteTask(id) {
    setTasks(p => p.filter(t => t.id !== id));
    const { error: err } = await supabase.from('tasks').delete().eq('id', id);
    if (err) { setError(err.message); loadAll(); }
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

  function startEditTask(task) {
    setEditingTaskId(task.id);
    setTaskEditDraft({
      title: task.title || '',
      category_id: task.category_id || '',
      priority: task.priority || 'Media',
      notes: task.notes || ''
    });
    setIsTaskEditSheetOpen(window.innerWidth <= 720);
  }

  function cancelEditTask() {
    setEditingTaskId('');
    setIsTaskEditSheetOpen(false);
    setTaskEditDraft({ title: '', category_id: '', priority: '', notes: '' });
  }

  async function saveEditTask() {
    const id = editingTaskId;
    const title = taskEditDraft.title.trim();
    if (!id || !title) return cancelEditTask();
    const patch = {
      title,
      category_id: taskEditDraft.category_id || null,
      priority: taskEditDraft.priority || 'Media',
      notes: taskEditDraft.notes || ''
    };
    setEditingTaskId('');
    setIsTaskEditSheetOpen(false);
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t));
    setSaving('Salvataggio modifica...');
    const { error: err } = await supabase.from('tasks').update(patch).eq('id', id);
    if (err) { setError(err.message); loadAll(); }
    else setSaving('Modifica salvata');
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
    if (err) { setError(err.message); loadAll(); }
    else setSaving('Categoria aggiornata');
  }

  async function moveTaskToFuture(id) {
    await moveTask(id, 'FUTURO');
  }

  function pointerDown(e, id, task = null) {
    if (e.button !== undefined && e.button !== 0) return;
    const now = Date.now();
    const previousTap = lastTapRef.current;
    if (window.innerWidth <= 720 && task && previousTap.id === id && now - previousTap.time < 360) {
      e.preventDefault();
      lastTapRef.current = { id: '', time: 0 };
      startEditTask(task);
      return;
    }
    lastTapRef.current = { id, time: now };
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
      state.active = true;
      setDraggedTaskId(state.id);
      document.body.classList.add('dragging-task');
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
    dragRef.current = { id: '', x: 0, y: 0, active: false };
    setDraggedTaskId('');
    setHoverDay(null);
  }

  function exportExcel() {
    const rows = tasks.map(t => `<tr><td>${esc(t.title)}</td><td>${esc(categoryMap[t.category_id]?.name || '')}</td><td>${esc(t.priority)}</td><td>${esc(t.day || 'NON PIANIFICATO')}</td><td>${esc(t.status)}</td><td>${esc(t.notes || '')}</td></tr>`).join('');
    downloadFile('prioro-attivita.xls', 'application/vnd.ms-excel', `<table><tr><th>Titolo</th><th>Categoria</th><th>Priorità</th><th>Giorno</th><th>Stato</th><th>Note</th></tr>${rows}</table>`);
  }

  if (loading) return <div className="loading">Caricamento planner...</div>;

  return <main className="app-shell">
    <div className="app-sticky-head">
      <header className="topbar">
        <div><p className="eyebrow">Prioro</p><h1>Prioro</h1><p className="subtitle">Organizza la tua settimana · {user.email}</p></div>
        <div className="top-actions"><button className="soft-btn" onClick={exportExcel}><Download size={16}/>Excel</button><button className="logout-btn desktop-logout" onClick={() => supabase.auth.signOut()}><LogOut size={16}/>Esci</button></div>
      </header>

      <nav className="view-tabs"><button className={view === 'planner' ? 'active' : ''} onClick={() => setView('planner')}>Planner</button><button className={view === 'stats' ? 'active' : ''} onClick={() => setView('stats')}>Statistiche</button></nav>
    </div>
    {error && <div className="notice error">{error}</div>}

    {view === 'planner' ? <>
      <section className="focus-strip"><div><strong>{weeklyCount}</strong><span>in settimana</span></div><div><strong>{backlog.length}</strong><span>da pianificare</span></div><div><strong>{doneTasks.length}</strong><span>completate</span></div><div><strong>{futureTasks.length}</strong><span>in futuro</span></div></section>
      <section className="workflow-panel">
        <div className="workflow-create"><div className="create-task-head"><div><h2>Nuova attività</h2><p>Inseriscila, poi trascinala nel giorno corretto.</p></div><button className="category-secondary-btn" type="button" onClick={() => setShowCategoryCreator(v => !v)}>+ Categoria</button></div>
          <form className="quick-form-wide no-goals" onSubmit={addTask}>
            <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Scrivi cosa devi fare" />
            <select value={newCategory} onChange={e => setNewCategory(e.target.value)}><option value="">Categoria</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
            <select value={newPriority} onChange={e => setNewPriority(e.target.value)}><option value="">Priorità</option><option>Alta</option><option>Media</option><option>Bassa</option></select>
            <input value={newNotes} onChange={e => setNewNotes(e.target.value)} placeholder="Note opzionali" />
            <button className="primary" type="submit">+ Aggiungi</button>
          </form>
          {showCategoryCreator && <form className="quick-category-inline" onSubmit={addCategory}><input value={catName} onChange={e => setCatName(e.target.value)} placeholder="Nome nuova categoria" /><input type="color" value={catColor} onChange={e => setCatColor(e.target.value)} /><button className="soft-btn">Crea categoria</button></form>}
        </div>

        <div className="workflow-backlog"><div className="section-title"><h2>Elenco attività</h2><span className="count">{backlog.length}</span></div><div className="search-row"><Search size={18}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Cerca attività da trascinare" /></div><div data-day="" className={`backlog-list-horizontal ${hoverDay === '' ? 'drag-over' : ''}`}>{backlog.length ? backlog.map(t => <TaskCard key={t.id} task={t} category={categoryMap[t.category_id]} dragged={draggedTaskId === t.id} onPointerDown={pointerDown} onDelete={deleteTask} onEdit={startEditTask} editingTaskId={editingTaskId} editDraft={taskEditDraft} setEditDraft={setTaskEditDraft} categories={categories} onSaveEdit={saveEditTask} onCancelEdit={cancelEditTask} isTaskEditSheetOpen={isTaskEditSheetOpen} />) : <Empty text="Nessuna attività da pianificare." />}</div></div>

        <div className="workflow-week"><div className="calendar-head"><div><h2>Giorni della settimana</h2><p>Da mobile scegli il giorno con i pulsanti. Puoi trascinare direttamente sul pulsante giorno.</p></div></div><div className="mobile-day-tabs">{days.map((d, i) => <button key={d} data-day={d} className={`${selectedDay === i ? 'active' : ''} ${hoverDay === d ? 'drag-over-tab' : ''}`} onClick={() => setSelectedDay(i)}>{dayLabels[d]}</button>)}</div><div className="week-grid">{days.map((day, i) => { const items = filteredTasks.filter(t => t.day === day); return <DayColumn key={day} day={day} active={selectedDay === i} items={items} categoryMap={categoryMap} hoverDay={hoverDay} draggedTaskId={draggedTaskId} pointerDown={pointerDown} archiveTask={archiveTask} clearDay={clearDay} onEdit={startEditTask} editingTaskId={editingTaskId} editDraft={taskEditDraft} setEditDraft={setTaskEditDraft} categories={categories} onSaveEdit={saveEditTask} onCancelEdit={cancelEditTask} isTaskEditSheetOpen={isTaskEditSheetOpen} />; })}</div></div>
        <ParkingSection title="OGNI GIORNO" day="OGNI_GIORNO" items={everyDay} empty="Trascina qui le attività ricorrenti." categoryMap={categoryMap} hoverDay={hoverDay} draggedTaskId={draggedTaskId} pointerDown={pointerDown} deleteTask={deleteTask} startEditTask={startEditTask} editingTaskId={editingTaskId} taskEditDraft={taskEditDraft} setTaskEditDraft={setTaskEditDraft} categories={categories} saveEditTask={saveEditTask} cancelEditTask={cancelEditTask} isTaskEditSheetOpen={isTaskEditSheetOpen} clearDay={clearDay} />
        <ParkingSection title="FUTURO" day="FUTURO" hint="Cose da ricordare ma da fare prossimamente." items={futureTasks} empty="Trascina qui le cose da ricordare per dopo." categoryMap={categoryMap} hoverDay={hoverDay} draggedTaskId={draggedTaskId} pointerDown={pointerDown} deleteTask={deleteTask} startEditTask={startEditTask} editingTaskId={editingTaskId} taskEditDraft={taskEditDraft} setTaskEditDraft={setTaskEditDraft} categories={categories} saveEditTask={saveEditTask} cancelEditTask={cancelEditTask} isTaskEditSheetOpen={isTaskEditSheetOpen} clearDay={clearDay} />
      </section>

      <section className="below-grid no-goals-below">
        <div className="panel categories-list-panel"><div className="section-title"><h2>Categorie</h2><span className="count">{categories.length}</span></div><div className="chips"><button className={!categoryFilter ? 'chip chip-active' : 'chip'} onClick={() => setCategoryFilter('')}>Tutte</button>{categories.map(c => editingCategoryId === c.id ? <span key={c.id} className="chip category-chip category-chip-editing" style={{ '--chip': c.color }}><input value={categoryEditName} onChange={e => setCategoryEditName(e.target.value)} onClick={e => e.stopPropagation()} onKeyDown={e => { if (e.key === 'Enter') saveEditCategory(); if (e.key === 'Escape') cancelEditCategory(); }} onBlur={saveEditCategory} autoFocus /></span> : <span key={c.id} className={categoryFilter === c.id ? 'chip chip-active category-chip' : 'chip category-chip'} style={{ '--chip': c.color }} onClick={() => setCategoryFilter(c.id)} onDoubleClick={() => startEditCategory(c)} title="Click per filtrare. Doppio click per modificare. Usa × per eliminare."><span className="category-chip-name">{c.name}</span><button type="button" className="category-delete-btn" aria-label={`Elimina categoria ${c.name}`} onClick={e => { e.stopPropagation(); deleteCategory(c.id); }}>×</button></span>)}</div></div>
        <div className="panel"><div className="archive-head"><h2>Archivio cose fatte</h2><span>{doneTasks.length}</span></div><div className="archive-list">{doneTasks.length ? doneTasks.slice(0, 20).map(t => <div className="archive-row" key={t.id}><span>{t.title}</span><div><button onClick={() => restoreTask(t.id)}>Ripristina</button><button className="danger-link" onClick={() => deleteTask(t.id)}>Elimina</button></div></div>) : <div className="archive-empty">Non ci sono attività archiviate.</div>}</div></div>
      </section>
    </> : <StatsPage stats={stats} statsPeriod={statsPeriod} setStatsPeriod={setStatsPeriod} categoryMap={categoryMap} moveTaskToFuture={moveTaskToFuture} />}

    {isTaskEditSheetOpen && editingTask && <div className="task-edit-sheet-backdrop" onClick={cancelEditTask}>
      <div className="task-edit-sheet" onClick={e => e.stopPropagation()}>
        <div className="task-edit-sheet-head"><div><strong>Modifica attività</strong><span>{editingTask.title}</span></div><button type="button" onClick={cancelEditTask}>×</button></div>
        <TaskEditForm editDraft={taskEditDraft} setEditDraft={setTaskEditDraft} categories={categories} onSave={saveEditTask} onCancel={cancelEditTask} compact={false} />
      </div>
    </div>}

    <footer className="mobile-footer-actions">
      <button className="logout-btn" onClick={() => supabase.auth.signOut()}><LogOut size={16}/>Esci</button>
    </footer>
  </main>;
}

function ParkingSection({ title, day, hint, items, empty, categoryMap, hoverDay, draggedTaskId, pointerDown, deleteTask, startEditTask, editingTaskId, taskEditDraft, setTaskEditDraft, categories, saveEditTask, cancelEditTask, isTaskEditSheetOpen, clearDay }) {
  return <div className={day === 'FUTURO' ? 'workflow-future' : 'workflow-everyday'}><div className="day-title-row"><div><div className="day-title">{title}</div>{hint && <p className="future-hint">{hint}</p>}</div><button className="clear-day-btn" onClick={() => clearDay(day)} disabled={!items.length}>Svuota</button></div><div data-day={day} className={`backlog-list-horizontal ${day === 'FUTURO' ? 'future-zone' : 'everyday-zone'} ${hoverDay === day ? 'drag-over' : ''}`}>{items.length ? items.map(t => <TaskCard key={t.id} task={t} category={categoryMap[t.category_id]} dragged={draggedTaskId === t.id} onPointerDown={pointerDown} onDelete={deleteTask} onEdit={startEditTask} editingTaskId={editingTaskId} editDraft={taskEditDraft} setEditDraft={setTaskEditDraft} categories={categories} onSaveEdit={saveEditTask} onCancelEdit={cancelEditTask} isTaskEditSheetOpen={isTaskEditSheetOpen} />) : <Empty compact text={empty} />}</div></div>;
}

function DayColumn({ day, active, items, categoryMap, hoverDay, draggedTaskId, pointerDown, archiveTask, clearDay, onEdit, editingTaskId, editDraft, setEditDraft, categories, onSaveEdit, onCancelEdit, isTaskEditSheetOpen }) {
  return <div data-day={day} className={`day-column ${active ? 'mobile-active' : ''} ${hoverDay === day ? 'drag-over' : ''}`}><div className="day-title-row"><div className="day-title">{day}</div><button className="clear-day-btn" onClick={() => clearDay(day)} disabled={!items.length}>Svuota</button></div><div className="planned-list">{items.length ? items.map(t => <PlannedTask key={t.id} task={t} category={categoryMap[t.category_id]} dragged={draggedTaskId === t.id} onPointerDown={pointerDown} onArchive={archiveTask} onEdit={onEdit} editingTaskId={editingTaskId} editDraft={editDraft} setEditDraft={setEditDraft} categories={categories} onSaveEdit={onSaveEdit} onCancelEdit={onCancelEdit} isTaskEditSheetOpen={isTaskEditSheetOpen} />) : <Empty compact text="Trascina qui." />}</div></div>;
}

function TaskCard({ task, category, dragged, onPointerDown, onDelete, onEdit, editingTaskId, editDraft, setEditDraft, categories, onSaveEdit, onCancelEdit, isTaskEditSheetOpen }) {
  const cat = category || { name: 'Senza categoria', color: '#94a3b8' };
  const editing = editingTaskId === task.id && !isTaskEditSheetOpen;
  if (editing) return <TaskEditForm editDraft={editDraft} setEditDraft={setEditDraft} categories={categories} onSave={onSaveEdit} onCancel={onCancelEdit} compact={false} />;
  return <div className={`backlog-task ${dragged ? 'is-dragging' : ''}`} onPointerDown={e => onPointerDown(e, task.id, task)} onDoubleClick={() => onEdit(task)} title="Trascina per pianificare. Doppio click per modificare."><div><strong>{task.title}</strong><div className="backlog-meta"><span style={{ '--dot': cat.color }}>{cat.name}</span><span>{task.priority}</span></div>{task.notes && <p>{task.notes}</p>}</div><button onClick={e => { e.stopPropagation(); onDelete(task.id); }}><Trash2 size={15}/></button></div>;
}

function PlannedTask({ task, category, dragged, onPointerDown, onArchive, onEdit, editingTaskId, editDraft, setEditDraft, categories, onSaveEdit, onCancelEdit, isTaskEditSheetOpen }) {
  const cat = category || { name: 'Senza categoria', color: '#a1a1aa' };
  const editing = editingTaskId === task.id && !isTaskEditSheetOpen;
  if (editing) return <div className="planned-task is-editing"><TaskEditForm editDraft={editDraft} setEditDraft={setEditDraft} categories={categories} onSave={onSaveEdit} onCancel={onCancelEdit} compact /></div>;
  return <div className={`planned-task ${dragged ? 'is-dragging' : ''}`} onPointerDown={e => onPointerDown(e, task.id, task)} onDoubleClick={() => onEdit(task)} title="Trascina per spostare. Doppio click per modificare."><button className="check" onClick={e => { e.stopPropagation(); onArchive(task.id); }} aria-label="Segna come fatta" /><div className="planned-content"><span className="planned-title">{task.title}</span><span className="planned-category" style={{ '--cat-color': cat.color }}>{cat.name}</span></div></div>;
}

function TaskEditForm({ editDraft, setEditDraft, categories, onSave, onCancel, compact }) {
  return <div className={`task-edit-form ${compact ? 'compact' : ''}`} onPointerDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}>
    <input value={editDraft.title} onChange={e => setEditDraft(d => ({ ...d, title: e.target.value }))} placeholder="Modifica attività" autoFocus onKeyDown={e => { if (e.key === 'Enter') onSave(); if (e.key === 'Escape') onCancel(); }} />
    <select value={editDraft.category_id} onChange={e => setEditDraft(d => ({ ...d, category_id: e.target.value }))}><option value="">Senza categoria</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
    <select value={editDraft.priority} onChange={e => setEditDraft(d => ({ ...d, priority: e.target.value }))}><option>Alta</option><option>Media</option><option>Bassa</option></select>
    {!compact && <input value={editDraft.notes} onChange={e => setEditDraft(d => ({ ...d, notes: e.target.value }))} placeholder="Note" />}
    <div className="task-edit-actions"><button type="button" onClick={onSave}>Salva</button><button type="button" onClick={onCancel}>Annulla</button></div>
  </div>;
}

function StatsPage({ stats, statsPeriod, setStatsPeriod, categoryMap, moveTaskToFuture }) {
  return <section className="stats-page">
    <div className="stats-hero"><div><p className="eyebrow">Statistiche</p><h2>Review produttività</h2><p>Una lettura pulita di cosa hai fatto, cosa resta aperto e cosa conviene spostare nel futuro.</p></div><div className="stats-filter"><span>Periodo</span><select value={statsPeriod} onChange={e => setStatsPeriod(e.target.value)}><option value="7">Ultimi 7 giorni</option><option value="30">Ultimi 30 giorni</option><option value="month">Questo mese</option><option value="90">Ultimi 3 mesi</option><option value="year">Quest'anno</option><option value="all">Sempre</option></select></div></div>
    <div className="stats-kpis">
      <StatCard value={stats.completed} label="Completate" />
      <StatCard value={stats.open} label="Aperte" />
      <StatCard value={`${stats.completionRate}%`} label="Completion rate" />
      <StatCard value={stats.topDayLabel} label="Giorno più produttivo" />
    </div>
    <div className="stats-grid">
      <div className="panel premium-panel"><h3>Giorni più produttivi</h3><p className="stat-muted">Attività completate per giorno.</p><BarList rows={stats.dayRows} /></div>
      <div className="panel premium-panel"><h3>Categorie</h3><p className="stat-muted">Distribuzione delle attività completate.</p><CategoryStats rows={stats.categoryRows} /></div>
      <ReviewList title="Cosa ho fatto" rows={stats.doneRecent} empty="Nessuna attività completata." categoryMap={categoryMap} done />
      <ReviewList title="Cosa non ho fatto" rows={stats.openRecent} empty="Nessuna attività aperta." categoryMap={categoryMap} />
      <div className="panel premium-panel review-wide"><h3>Cosa spostare nel FUTURO</h3><p className="stat-muted">Attività aperte da più tempo o non pianificate. Mantieni il planner leggero.</p>{stats.futureCandidates.length ? <div className="review-list">{stats.futureCandidates.map(t => <div className="review-row" key={t.id}><div><strong>{t.title}</strong><span>{categoryMap[t.category_id]?.name || 'Senza categoria'}</span></div><button className="future-action" onClick={() => moveTaskToFuture(t.id)}>Sposta in FUTURO</button></div>)}</div> : <div className="archive-empty">Nessuna attività da spostare.</div>}</div>
    </div>
  </section>;
}

function StatCard({ value, label }) { return <div className="stat-card"><strong>{value}</strong><span>{label}</span></div>; }
function BarList({ rows }) { const max = Math.max(1, ...rows.map(r => r.value)); return <div className="bar-list">{rows.map(r => <div className="bar-row" key={r.label}><span>{r.label}</span><div><i style={{ width: `${Math.max(4, (r.value / max) * 100)}%` }} /></div><em>{r.value}</em></div>)}</div>; }
function CategoryStats({ rows }) { const max = Math.max(1, ...rows.map(r => r.value)); return <div className="category-stats">{rows.length ? rows.map(r => <div className="category-stat" key={r.label}><span><i style={{ background: r.color }} />{r.label}</span><b>{r.value}</b><div><i style={{ width: `${Math.max(4, (r.value / max) * 100)}%`, background: r.color }} /></div></div>) : <div className="archive-empty">Nessuna categoria completata.</div>}</div>; }
function ReviewList({ title, rows, empty, categoryMap, done }) { return <div className="panel premium-panel"><h3>{title}</h3><p className="stat-muted">{done ? 'Ultime attività completate.' : 'Attività ancora da chiudere.'}</p>{rows.length ? <div className="review-list">{rows.map(t => <div className="review-row" key={t.id}><div><strong>{t.title}</strong><span>{categoryMap[t.category_id]?.name || 'Senza categoria'}</span></div></div>)}</div> : <div className="archive-empty">{empty}</div>}</div>; }

function Empty({ text, compact = false }) { return <div className={`empty ${compact ? 'compact' : ''}`}>{text}</div>; }
function esc(v) { return String(v).replace(/[&<>'"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[m])); }
function downloadFile(name, type, content) { const blob = new Blob([content], { type }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 500); }

function buildStats(tasks, categories, period = '30') {
  const now = new Date();
  const fromDate = getStatsFromDate(period, now);
  const inPeriod = task => {
    if (!fromDate) return true;
    const reference = task.status === 'Fatto' ? task.updated_at || task.created_at : task.created_at || task.updated_at;
    if (!reference) return false;
    return new Date(reference) >= fromDate;
  };
  const periodTasks = tasks.filter(inPeriod);
  const categoryMap = Object.fromEntries(categories.map(c => [c.id, c]));
  const completedTasks = periodTasks.filter(t => t.status === 'Fatto');
  const openTasks = periodTasks.filter(t => t.status !== 'Fatto');
  const total = periodTasks.length;
  const completionRate = total ? Math.round((completedTasks.length / total) * 100) : 0;
  const completedByDay = Object.fromEntries(days.map(d => [d, 0]));

  // Giorni produttivi: conta il giorno del planner in cui l'attività era assegnata quando viene checkata.
  completedTasks.forEach(t => {
    if (completedByDay[t.day] !== undefined) completedByDay[t.day] += 1;
  });

  const dayRows = days.map(d => ({ label: dayFullLabels[d], value: completedByDay[d] }));
  const top = dayRows.reduce((best, row) => row.value > best.value ? row : best, { label: '-', value: 0 });
  const categoryCounts = {};
  completedTasks.forEach(t => {
    const key = t.category_id || 'none';
    categoryCounts[key] = (categoryCounts[key] || 0) + 1;
  });
  const categoryRows = Object.entries(categoryCounts).map(([id, value]) => ({
    label: id === 'none' ? 'Senza categoria' : categoryMap[id]?.name || 'Categoria rimossa',
    color: id === 'none' ? '#a1a1aa' : categoryMap[id]?.color || '#a1a1aa',
    value
  })).sort((a, b) => b.value - a.value).slice(0, 8);
  const sortDesc = arr => [...arr].sort((a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0));
  const sortAsc = arr => [...arr].sort((a, b) => new Date(a.created_at || a.updated_at || 0) - new Date(b.created_at || b.updated_at || 0));
  const futureCandidates = sortAsc(openTasks.filter(t => t.day !== 'FUTURO')).slice(0, 8);
  return {
    completed: completedTasks.length,
    open: openTasks.length,
    completionRate,
    topDayLabel: top.value ? top.label : '-',
    dayRows,
    categoryRows,
    doneRecent: sortDesc(completedTasks).slice(0, 10),
    openRecent: sortDesc(openTasks).slice(0, 10),
    futureCandidates
  };
}

function getStatsFromDate(period, now) {
  if (period === 'all') return null;
  const date = new Date(now);
  if (period === 'month') return new Date(now.getFullYear(), now.getMonth(), 1);
  if (period === 'year') return new Date(now.getFullYear(), 0, 1);
  const daysBack = Number(period || 30);
  date.setDate(date.getDate() - daysBack + 1);
  date.setHours(0, 0, 0, 0);
  return date;
}
