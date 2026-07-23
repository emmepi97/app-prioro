import { Component, useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, Download, LogOut, Mail, Lock, Plus, RefreshCcw, Search, Trash2 } from 'lucide-react';
import { isSupabaseConfigured, supabase, supabaseConfigError } from './supabaseClient';

const days = ['LUNEDI', 'MARTEDI', 'MERCOLEDI', 'GIOVEDI', 'VENERDI', 'SABATO', 'DOMENICA'];
const dayLabels = { LUNEDI: 'Lun', MARTEDI: 'Mar', MERCOLEDI: 'Mer', GIOVEDI: 'Gio', VENERDI: 'Ven', SABATO: 'Sab', DOMENICA: 'Dom' };
const defaultColors = ['#111827', '#475569', '#2563eb', '#16a34a', '#b45309', '#be123c', '#7c3aed'];



class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <main className="auth-page">
          <section className="auth-card">
            <div className="brand-badge"><CalendarDays size={17} /> Prioro</div>
            <h1>Errore avvio app</h1>
            <p>L'app non è partita correttamente. Copia questo errore e controlla le variabili di Vercel.</p>
            <div className="notice"><strong>{String(this.state.error.message || this.state.error)}</strong></div>
          </section>
        </main>
      );
    }
    return this.props.children;
  }
}

function MissingSupabaseConfig() {
  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="brand-badge"><CalendarDays size={17} /> Prioro</div>
        <h1>Configurazione Supabase mancante</h1>
        <p>La pagina bianca dipende quasi sicuramente dalle variabili ambiente mancanti o scritte male su Vercel.</p>
        <div className="notice">
          Dettaglio errore:<br />
          <strong>{supabaseConfigError}</strong><br /><br />
          Variabili richieste su Vercel:<br />
          <strong>VITE_SUPABASE_URL</strong> = https://xxxx.supabase.co<br />
          <strong>VITE_SUPABASE_ANON_KEY</strong> = sb_publishable_... oppure anon public key
        </div>
      </section>
    </main>
  );
}

export default function App() {
  if (!isSupabaseConfigured) return <MissingSupabaseConfig />;

  const [session, setSession] = useState(null);
  const [authMode, setAuthMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
      setAuthLoading(false);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function handleAuth(e) {
    e.preventDefault();
    setMessage('');
    setAuthLoading(true);

    const credentials = { email, password };
    const { error } = authMode === 'login'
      ? await supabase.auth.signInWithPassword(credentials)
      : await supabase.auth.signUp({
          ...credentials,
          options: {
            emailRedirectTo: window.location.origin,
          },
        });

    if (error) setMessage(error.message);
    else if (authMode === 'register') setMessage('Registrazione completata. Controlla la tua email e conferma l\'account per accedere a Prioro.');

    setAuthLoading(false);
  }

  if (authLoading) return <div className="loading">Caricamento...</div>;

  if (!session) {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <div className="brand-badge"><CalendarDays size={17} /> Prioro</div>
          <h1>Prioro</h1>
          <p>Organizza la tua settimana. Completa ciò che conta.</p>

          <form onSubmit={handleAuth} className="auth-form">
            <label><Mail size={15} /> Email</label>
            <input value={email} onChange={e => setEmail(e.target.value)} type="email" required placeholder="nome@azienda.com" />

            <label><Lock size={15} /> Password</label>
            <input value={password} onChange={e => setPassword(e.target.value)} type="password" required minLength={6} placeholder="Minimo 6 caratteri" />

            {message && <div className="notice">{message}</div>}
            <button className="primary" disabled={authLoading}>{authMode === 'login' ? 'Accedi' : 'Registrati'}</button>
          </form>

          <button className="link-btn" onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}>
            {authMode === 'login' ? 'Non hai un account? Registrati' : 'Hai già un account? Accedi'}
          </button>
        </section>
      </main>
    );
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
  const [dragId, setDragId] = useState(null);
  const draggedTaskIdRef = useRef(null);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [touchStartX, setTouchStartX] = useState(null);

  const [query, setQuery] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newPriority, setNewPriority] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [newGoalForTask, setNewGoalForTask] = useState('');
  const [catName, setCatName] = useState('');
  const [catColor, setCatColor] = useState('#111827');
  const [showCategoryCreator, setShowCategoryCreator] = useState(false);
  const [goalTitle, setGoalTitle] = useState('');
  const [goalDescription, setGoalDescription] = useState('');
  const [goalHorizon, setGoalHorizon] = useState('');
  const [goalPriority, setGoalPriority] = useState('');
  const [goalCategory, setGoalCategory] = useState('');
  const [goalTargetDate, setGoalTargetDate] = useState('');

  const categoryMap = useMemo(() => Object.fromEntries(categories.map(c => [c.id, c])), [categories]);
  const goalMap = useMemo(() => Object.fromEntries(goals.map(g => [g.id, g])), [goals]);
  const activeGoals = goals.filter(g => g.status !== 'Archiviato' && g.status !== 'Completato');
  const weeklyTasksCount = tasks.filter(t => t.status !== 'Fatto' && t.day).length;
  const activeTasks = tasks.filter(t => t.status !== 'Fatto');
  const doneTasks = tasks.filter(t => t.status === 'Fatto');
  const backlogTasks = activeTasks.filter(t => !t.day && t.title.toLowerCase().includes(query.toLowerCase()));

  useEffect(() => { loadAll(); }, []);

  useEffect(() => {
    function preventNativeFileDrop(e) {
      e.preventDefault();
    }

    window.addEventListener('dragover', preventNativeFileDrop);
    window.addEventListener('drop', preventNativeFileDrop);

    return () => {
      window.removeEventListener('dragover', preventNativeFileDrop);
      window.removeEventListener('drop', preventNativeFileDrop);
    };
  }, []);

  async function loadAll() {
    setLoading(true);
    setError('');

    await supabase.rpc('create_default_categories_for_user', { target_user: user.id });

    const [{ data: catData, error: catErr }, { data: goalData, error: goalErr }, { data: taskData, error: taskErr }] = await Promise.all([
      supabase.from('categories').select('*').order('created_at', { ascending: true }),
      supabase.from('goals').select('*').order('created_at', { ascending: false }),
      supabase.from('tasks').select('*').order('created_at', { ascending: false })
    ]);

    if (catErr || goalErr || taskErr) setError(catErr?.message || goalErr?.message || taskErr?.message);

    const cats = catData || [];
    setCategories(cats);
    setGoals(goalData || []);
    setTasks(taskData || []);
    if (cats.length) {
      setGoalCategory(current => current || cats[0].id);
    }
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
      goal_id: newGoalForTask || null,
      priority: newPriority || 'Media',
      notes: newNotes.trim(),
      day: '',
      status: 'Da fare',
      sort_order: 0
    }).select('*').single();

    if (err) setError(err.message);
    else {
      setTasks(prev => [data, ...prev]);
      setNewTitle('');
      setNewNotes('');
      setNewGoalForTask('');
      setNewPriority('');
      setSaving('Salvato');
    }
  }

  async function addCategory(e) {
    e.preventDefault();
    const name = catName.trim();
    if (!name) return;

    setSaving('Salvataggio...');
    const { data, error: err } = await supabase.from('categories').insert({
      user_id: user.id,
      name,
      color: catColor
    }).select('*').single();

    if (err) setError(err.message);
    else {
      setCategories(prev => [...prev, data]);
      setCatName('');
      setCatColor(defaultColors[(categories.length + 1) % defaultColors.length]);
      setShowCategoryCreator(false);
      setSaving('Salvato');
    }
  }

  async function addGoal(e) {
    e.preventDefault();
    const title = goalTitle.trim();
    if (!title) return;

    setSaving('Salvataggio obiettivo...');
    const { data, error: err } = await supabase.from('goals').insert({
      user_id: user.id,
      title,
      description: goalDescription.trim(),
      horizon: goalHorizon || 'Questo mese',
      priority: goalPriority || 'Media',
      category_id: goalCategory || null,
      target_date: goalTargetDate || null,
      status: 'In corso'
    }).select('*').single();

    if (err) setError(err.message);
    else {
      setGoals(prev => [data, ...prev]);
      setGoalTitle('');
      setGoalDescription('');
      setGoalHorizon('');
      setGoalPriority('');
      setGoalTargetDate('');
      setSaving('Obiettivo salvato');
    }
  }

  async function archiveGoal(id) {
    setGoals(prev => prev.map(g => g.id === id ? { ...g, status: 'Archiviato' } : g));
    const { error: err } = await supabase.from('goals').update({ status: 'Archiviato' }).eq('id', id);
    if (err) { setError(err.message); loadAll(); }
  }

  async function deleteCategory(id) {
    if (tasks.some(t => t.category_id === id)) {
      alert('Categoria usata da alcune attività. Prima elimina o archivia quelle attività.');
      return;
    }

    const { error: err } = await supabase.from('categories').delete().eq('id', id);
    if (err) setError(err.message);
    else setCategories(prev => prev.filter(c => c.id !== id));
  }

  async function moveTask(id, day) {
    setSaving('Salvataggio...');
    setTasks(prev => prev.map(t => t.id === id ? { ...t, day } : t));

    const { error: err } = await supabase.from('tasks').update({ day }).eq('id', id);
    if (err) {
      setError(err.message);
      loadAll();
    } else setSaving('Salvato');
  }

  async function editTaskTitle(task) {
    const nextTitle = window.prompt('Modifica testo attività', task.title);
    if (nextTitle === null) return;
    const title = nextTitle.trim();
    if (!title || title === task.title) return;

    setSaving('Salvataggio...');
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, title } : t));
    const { error: err } = await supabase.from('tasks').update({ title }).eq('id', task.id);
    if (err) {
      setError(err.message);
      loadAll();
    } else setSaving('Salvato');
  }

  async function clearDay(day) {
    const ids = activeTasks.filter(t => t.day === day).map(t => t.id);
    if (!ids.length) return;

    setSaving('Riprogrammazione...');
    setTasks(prev => prev.map(t => ids.includes(t.id) ? { ...t, day: '' } : t));
    const { error: err } = await supabase.from('tasks').update({ day: '' }).in('id', ids);
    if (err) {
      setError(err.message);
      loadAll();
    } else setSaving('Rimesse in elenco');
  }

  function handleWeekTouchStart(e) {
    setTouchStartX(e.touches[0].clientX);
  }

  function handleWeekTouchEnd(e) {
    if (touchStartX === null) return;
    const delta = touchStartX - e.changedTouches[0].clientX;
    if (Math.abs(delta) > 45) {
      setSelectedDayIndex(prev => {
        if (delta > 0) return Math.min(prev + 1, days.length - 1);
        return Math.max(prev - 1, 0);
      });
    }
    setTouchStartX(null);
  }

  async function archiveTask(id) {
    setSaving('Archiviazione...');
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: 'Fatto' } : t));

    const { error: err } = await supabase.from('tasks').update({ status: 'Fatto' }).eq('id', id);
    if (err) {
      setError(err.message);
      loadAll();
    } else setSaving('Archiviato');
  }

  async function restoreTask(id) {
    setSaving('Ripristino...');
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: 'Da fare', day: '' } : t));

    const { error: err } = await supabase.from('tasks').update({ status: 'Da fare', day: '' }).eq('id', id);
    if (err) {
      setError(err.message);
      loadAll();
    } else setSaving('Ripristinato');
  }

  async function deleteTask(id) {
    setTasks(prev => prev.filter(t => t.id !== id));
    const { error: err } = await supabase.from('tasks').delete().eq('id', id);
    if (err) {
      setError(err.message);
      loadAll();
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  function exportExcel() {
    const rows = tasks.map(t => {
      const cat = categoryMap[t.category_id];
      const goal = goalMap[t.goal_id];
      return `<tr><td>${escapeHtml(t.title)}</td><td>${escapeHtml(cat?.name || '')}</td><td>${escapeHtml(goal?.title || '')}</td><td>${escapeHtml(t.priority)}</td><td>${escapeHtml(t.day || 'NON PIANIFICATO')}</td><td>${escapeHtml(t.status)}</td><td>${escapeHtml(t.notes || '')}</td><td>${escapeHtml(t.created_at || '')}</td><td>${escapeHtml(t.updated_at || '')}</td></tr>`;
    }).join('');
    const html = `<html><head><meta charset="UTF-8"></head><body><table border="1"><tr><th>Titolo</th><th>Categoria</th><th>Obiettivo</th><th>Priorità</th><th>Giorno</th><th>Stato</th><th>Note</th><th>Creato il</th><th>Aggiornato il</th></tr>${rows}</table></body></html>`;
    downloadFile('prioro-attivita.xls', 'application/vnd.ms-excel', html);
  }

  if (loading) return <div className="loading">Caricamento planner...</div>;

  return (
    <div className="app-shell">
      <header className="topbar minimal">
        <div>
          <p className="eyebrow">Prioro</p>
          <h1>Prioro</h1>
          <p className="subtitle">Organizza la tua settimana. Completa ciò che conta. · {user.email}</p>
        </div>
        <div className="top-actions">
          <span className="status-pill">{saving}</span>
          <button className="soft-btn" onClick={loadAll}><RefreshCcw size={15} /> Aggiorna</button>
          <button className="soft-btn" onClick={exportExcel}><Download size={15} /> Excel</button>
          <button className="logout-btn" onClick={signOut}><LogOut size={15} /> Esci</button>
        </div>
      </header>

      {error && <div className="notice error">{error}</div>}

      <section className="focus-strip">
        <div><strong>{weeklyTasksCount}</strong><span>in settimana</span></div>
        <div><strong>{backlogTasks.length}</strong><span>da pianificare</span></div>
        <div><strong>{doneTasks.length}</strong><span>completate</span></div>
        <div><strong>{activeGoals.length}</strong><span>obiettivi attivi</span></div>
      </section>

      <main className="app-main">
        <section className="workflow-panel minimal-panel">
          <section className="create-task-wide workflow-create">
            <div className="create-task-head">
              <div>
                <h2>Nuova attività</h2>
                <p>Inseriscila, poi trascinala nel giorno corretto.</p>
              </div>
              <button type="button" className="soft-btn add-category-inline-btn" onClick={() => setShowCategoryCreator(prev => !prev)}>+ Aggiungi categoria</button>
            </div>
            <form onSubmit={addTask} className="quick-form-wide">
              <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Scrivi cosa devi fare" />
              <select value={newCategory} onChange={e => setNewCategory(e.target.value)} aria-label="Categoria attività">
                <option value="">Categoria attività</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <select value={newPriority} onChange={e => setNewPriority(e.target.value)} aria-label="Priorità attività">
                <option value="">Priorità attività</option>
                <option value="Alta">Alta</option><option value="Media">Media</option><option value="Bassa">Bassa</option>
              </select>
              <select value={newGoalForTask} onChange={e => setNewGoalForTask(e.target.value)} aria-label="Obiettivo collegato">
                <option value="">Obiettivo collegato</option>
                {activeGoals.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
              </select>
              <input value={newNotes} onChange={e => setNewNotes(e.target.value)} placeholder="Note opzionali" />
              <button className="primary" type="submit"><Plus size={16} /> Aggiungi</button>
            </form>
            {showCategoryCreator && (
              <form className="quick-category-inline" onSubmit={addCategory}>
                <input value={catName} onChange={e => setCatName(e.target.value)} placeholder="Nome nuova categoria" />
                <input value={catColor} onChange={e => setCatColor(e.target.value)} type="color" />
                <button className="soft-btn" type="submit">Crea categoria</button>
              </form>
            )}
          </section>

          <section className="workflow-backlog">
            <div className="section-title"><h2>Elenco attività</h2><span className="count">{backlogTasks.length}</span></div>
            <div className="search-row"><Search size={15} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Cerca attività da trascinare" /></div>
            <DropZone day="" dragId={dragId} draggedTaskIdRef={draggedTaskIdRef} onMove={moveTask} className="dropzone backlog-zone">
              <div className="backlog-list backlog-list-horizontal">
                {backlogTasks.length ? backlogTasks.map(task => (
                  <BacklogTask key={task.id} task={task} category={categoryMap[task.category_id]} goal={goalMap[task.goal_id]} setDragId={setDragId} draggedTaskIdRef={draggedTaskIdRef} onDelete={deleteTask} onEdit={editTaskTitle} />
                )) : <Empty text="Nessuna attività da pianificare" />}
              </div>
            </DropZone>
          </section>

          <section className="workflow-week">
            <div className="calendar-head">
              <div>
                <h2>Giorni della settimana</h2>
                <p>Seleziona il giorno con i pulsanti e trascina le attività. Doppio click per modificare il testo.</p>
              </div>
            </div>
            <div className="mobile-day-tabs">
              {days.map((day, index) => <button key={day} className={index === selectedDayIndex ? 'active' : ''} onClick={() => setSelectedDayIndex(index)} aria-label={`Mostra ${day}`}>{dayLabels[day]}</button>)}
            </div>
            <div className="week-grid">
              {days.map((day, index) => {
                const dayTasks = activeTasks.filter(t => t.day === day);
                return (
                  <DropZone key={day} day={day} dragId={dragId} draggedTaskIdRef={draggedTaskIdRef} onMove={moveTask} className={`day-column ${index === selectedDayIndex ? 'mobile-active' : ''}`}>
                    <div className="day-title-row">
                      <div className="day-title">{day}</div>
                      <button className="clear-day-btn" type="button" onClick={() => clearDay(day)} disabled={!dayTasks.length}>Svuota</button>
                    </div>
                    <div className="planned-list">
                      {dayTasks.length ? dayTasks.map(task => (
                        <PlannedTask key={task.id} task={task} category={categoryMap[task.category_id]} goal={goalMap[task.goal_id]} setDragId={setDragId} draggedTaskIdRef={draggedTaskIdRef} onArchive={archiveTask} onEdit={editTaskTitle} />
                      )) : <Empty text="Trascina qui" compact />}
                    </div>
                  </DropZone>
                );
              })}
            </div>
          </section>
        </section>

        <section className="below-grid">
          <section className="panel minimal-panel goals-panel">
            <div className="section-title"><h2>Obiettivi</h2><span className="count">{activeGoals.length}</span></div>
            <form className="goal-form goal-form-minimal" onSubmit={addGoal}>
              <input value={goalTitle} onChange={e => setGoalTitle(e.target.value)} placeholder="Nome obiettivo" />
              <div className="form-grid">
                <select value={goalHorizon} onChange={e => setGoalHorizon(e.target.value)} aria-label="Orizzonte temporale">
                  <option value="">Orizzonte temporale</option>
                  <option value="Questo mese">Questo mese</option>
                  <option value="Prossimi 3 mesi">Prossimi 3 mesi</option>
                  <option value="Quest'anno">Quest'anno</option>
                </select>
                <select value={goalPriority} onChange={e => setGoalPriority(e.target.value)} aria-label="Priorità obiettivo">
                  <option value="">Priorità obiettivo</option>
                  <option value="Alta">Alta</option><option value="Media">Media</option><option value="Bassa">Bassa</option>
                </select>
              </div>
              <div className="form-grid">
                <select value={goalCategory} onChange={e => setGoalCategory(e.target.value)} aria-label="Categoria collegata">
                  <option value="">Categoria collegata</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <input
                  type="text"
                  value={goalTargetDate}
                  onChange={e => setGoalTargetDate(e.target.value)}
                  onFocus={e => { e.target.type = 'date'; }}
                  onBlur={e => { if (!e.target.value) e.target.type = 'text'; }}
                  placeholder="Scadenza indicativa"
                  aria-label="Scadenza indicativa"
                />
              </div>
              <textarea value={goalDescription} onChange={e => setGoalDescription(e.target.value)} rows="2" placeholder="Descrizione opzionale" />
              <button className="soft-btn" type="submit">+ Crea obiettivo</button>
            </form>
            <div className="goal-groups">
              {['Questo mese', 'Prossimi 3 mesi', "Quest'anno"].map(horizon => {
                const items = activeGoals.filter(g => g.horizon === horizon);
                return (
                  <div className="goal-group" key={horizon}>
                    <h3>{horizon}</h3>
                    {items.length ? items.map(goal => (
                      <GoalCard key={goal.id} goal={goal} tasks={tasks} category={categoryMap[goal.category_id]} onArchive={archiveGoal} />
                    )) : <p>Nessun obiettivo</p>}
                  </div>
                );
              })}
            </div>
          </section>

          <section className="panel minimal-panel categories-list-panel">
            <div className="section-title"><h2>Categorie</h2><span className="count">{categories.length}</span></div>
            <div className="chips category-chip-list">
              {categories.map(c => <span className="chip" style={{ '--chip': c.color }} key={c.id}>{c.name}<button onClick={() => deleteCategory(c.id)}>×</button></span>)}
            </div>
          </section>

          <section className="archive-box panel minimal-panel">
            <div className="archive-head">
              <h2>Archivio cose fatte</h2>
              <span>{doneTasks.length}</span>
            </div>
            <div className="archive-list">
              {doneTasks.length ? doneTasks.map(task => (
                <div className="archive-row" key={task.id}>
                  <span>{task.title}</span>
                  <div>
                    <button onClick={() => restoreTask(task.id)}>Ripristina</button>
                    <button className="danger-link" onClick={() => deleteTask(task.id)}>Elimina</button>
                  </div>
                </div>
              )) : <div className="archive-empty">Non ci sono ancora attività archiviate.</div>}
            </div>
          </section>
        </section>
      </main>
    </div>
  );
}

function DropZone({ day, dragId, draggedTaskIdRef, onMove, children, className = 'dropzone' }) {
  const [over, setOver] = useState(false);

  function allowDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    setOver(true);
  }

  function extractTaskId(e) {
    const raw = e.dataTransfer?.getData('text/plain') || '';
    if (raw.startsWith('prioro-task:')) return raw.replace('prioro-task:', '');
    return draggedTaskIdRef.current || dragId || raw;
  }

  return (
    <div
      className={`${className} ${over ? 'drag-over' : ''}`}
      onDragEnter={allowDrop}
      onDragOver={allowDrop}
      onDragLeave={e => { e.preventDefault(); e.stopPropagation(); setOver(false); }}
      onDrop={e => {
        e.preventDefault();
        e.stopPropagation();
        setOver(false);
        const droppedId = extractTaskId(e);
        if (droppedId) onMove(droppedId, day);
        setTimeout(() => {
          draggedTaskIdRef.current = null;
        }, 0);
      }}
    >
      {children}
    </div>
  );
}

function BacklogTask({ task, category, goal, setDragId, draggedTaskIdRef, onDelete, onEdit }) {
  const cat = category || { name: 'Senza categoria', color: '#94a3b8' };

  return (
    <article className="backlog-task" draggable onDragStart={e => { draggedTaskIdRef.current = task.id; setDragId(task.id); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', `prioro-task:${task.id}`); }} onDragEnd={() => { setTimeout(() => { draggedTaskIdRef.current = null; setDragId(null); }, 0); }} onDoubleClick={() => onEdit(task)} title="Doppio click per modificare">
      <div>
        <strong>{task.title}</strong>
        <div className="backlog-meta">
          <span style={{ '--dot': cat.color }}>{cat.name}</span>
          <span>{task.priority}</span>
          {goal && <span>{goal.title}</span>}
        </div>
        {task.notes && <p>{task.notes}</p>}
      </div>
      <button type="button" draggable="false" onMouseDown={e => e.stopPropagation()} onClick={() => onDelete(task.id)} title="Elimina"><Trash2 size={15} /></button>
    </article>
  );
}

function PlannedTask({ task, category, goal, setDragId, draggedTaskIdRef, onArchive, onEdit }) {
  const cat = category || { name: 'Senza categoria', color: '#a1a1aa' };

  return (
    <div className="planned-task" draggable onDragStart={e => { draggedTaskIdRef.current = task.id; setDragId(task.id); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', `prioro-task:${task.id}`); }} onDragEnd={() => { setTimeout(() => { draggedTaskIdRef.current = null; setDragId(null); }, 0); }} onDoubleClick={() => onEdit(task)} title="Doppio click per modificare">
      <button type="button" draggable="false" onMouseDown={e => e.stopPropagation()} className="check" onClick={() => onArchive(task.id)} aria-label="Segna come fatta" />
      <div className="planned-content">
        <span className="planned-title">{task.title}</span>
        <small className="planned-category" style={{ '--cat-color': cat.color }}>{cat.name}{goal ? ` · ${goal.title}` : ''}</small>
      </div>
    </div>
  );
}


function GoalCard({ goal, tasks, category, onArchive }) {
  const linked = tasks.filter(t => t.goal_id === goal.id);
  const done = linked.filter(t => t.status === 'Fatto').length;
  const total = linked.length;
  const progress = total ? Math.round((done / total) * 100) : 0;
  const cat = category || { name: 'Senza categoria', color: '#a1a1aa' };

  return (
    <article className="goal-card">
      <div className="goal-card-head">
        <strong>{goal.title}</strong>
        <button onClick={() => onArchive(goal.id)}>Archivia</button>
      </div>
      <div className="goal-meta">
        <span style={{ '--dot': cat.color }}>{cat.name}</span>
        <span>{goal.priority}</span>
        {goal.target_date && <span>{goal.target_date}</span>}
      </div>
      {goal.description && <p>{goal.description}</p>}
      <div className="progress-row"><div style={{ width: `${progress}%` }} /></div>
      <small>{done}/{total} attività completate · {progress}%</small>
    </article>
  );
}

function Empty({ text, compact = false }) {
  return <div className={`empty ${compact ? 'compact' : ''}`}>{text}</div>;
}

function escapeHtml(str) {
  return String(str).replace(/[&<>'"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[m]));
}

function downloadFile(name, type, content) {
  const blob = new Blob([content], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 500);
}
