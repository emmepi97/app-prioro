import { Component, useEffect, useMemo, useState } from 'react';
import { CalendarDays, Download, LogOut, Mail, Lock, Plus, RefreshCcw, Search, Trash2 } from 'lucide-react';
import { isSupabaseConfigured, supabase, supabaseConfigError } from './supabaseClient';

const days = ['LUNEDI', 'MARTEDI', 'MERCOLEDI', 'GIOVEDI', 'VENERDI'];
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
      : await supabase.auth.signUp(credentials);

    if (error) setMessage(error.message);
    else if (authMode === 'register') setMessage('Registrazione completata. Controlla la mail se Supabase richiede conferma.');

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
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState('Pronto');
  const [error, setError] = useState('');
  const [dragId, setDragId] = useState(null);

  const [query, setQuery] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newPriority, setNewPriority] = useState('Media');
  const [newNotes, setNewNotes] = useState('');
  const [catName, setCatName] = useState('');
  const [catColor, setCatColor] = useState('#111827');

  const categoryMap = useMemo(() => Object.fromEntries(categories.map(c => [c.id, c])), [categories]);
  const activeTasks = tasks.filter(t => t.status !== 'Fatto');
  const doneTasks = tasks.filter(t => t.status === 'Fatto');
  const backlogTasks = activeTasks.filter(t => !t.day && t.title.toLowerCase().includes(query.toLowerCase()));

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    setError('');

    await supabase.rpc('create_default_categories_for_user', { target_user: user.id });

    const [{ data: catData, error: catErr }, { data: taskData, error: taskErr }] = await Promise.all([
      supabase.from('categories').select('*').order('created_at', { ascending: true }),
      supabase.from('tasks').select('*').order('created_at', { ascending: false })
    ]);

    if (catErr || taskErr) setError(catErr?.message || taskErr?.message);

    const cats = catData || [];
    setCategories(cats);
    setTasks(taskData || []);
    if (cats.length) setNewCategory(current => current || cats[0].id);
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
      priority: newPriority,
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
      setNewCategory(data.id);
      setCatName('');
      setCatColor(defaultColors[(categories.length + 1) % defaultColors.length]);
      setSaving('Salvato');
    }
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
      return `<tr><td>${escapeHtml(t.title)}</td><td>${escapeHtml(cat?.name || '')}</td><td>${escapeHtml(t.priority)}</td><td>${escapeHtml(t.day || 'NON PIANIFICATO')}</td><td>${escapeHtml(t.status)}</td><td>${escapeHtml(t.notes || '')}</td><td>${escapeHtml(t.created_at || '')}</td><td>${escapeHtml(t.updated_at || '')}</td></tr>`;
    }).join('');
    const html = `<html><head><meta charset="UTF-8"></head><body><table border="1"><tr><th>Titolo</th><th>Categoria</th><th>Priorità</th><th>Giorno</th><th>Stato</th><th>Note</th><th>Creato il</th><th>Aggiornato il</th></tr>${rows}</table></body></html>`;
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

      <main className="layout">
        <aside className="sidebar">
          <section className="panel minimal-panel">
            <div className="section-title"><h2>Nuova attività</h2></div>
            <form onSubmit={addTask} className="quick-form">
              <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Scrivi cosa devi fare" />
              <div className="form-grid">
                <select value={newCategory} onChange={e => setNewCategory(e.target.value)}>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <select value={newPriority} onChange={e => setNewPriority(e.target.value)}>
                  <option>Alta</option><option>Media</option><option>Bassa</option>
                </select>
              </div>
              <textarea value={newNotes} onChange={e => setNewNotes(e.target.value)} rows="2" placeholder="Note opzionali" />
              <button className="primary" type="submit"><Plus size={16} /> Aggiungi</button>
            </form>
          </section>

          <section className="panel minimal-panel">
            <div className="section-title"><h2>Categorie</h2></div>
            <form className="category-form" onSubmit={addCategory}>
              <input value={catName} onChange={e => setCatName(e.target.value)} placeholder="Nuova categoria" />
              <input value={catColor} onChange={e => setCatColor(e.target.value)} type="color" />
              <button className="soft-btn" type="submit">Crea</button>
            </form>
            <div className="chips">
              {categories.map(c => <span className="chip" style={{ '--chip': c.color }} key={c.id}>{c.name}<button onClick={() => deleteCategory(c.id)}>×</button></span>)}
            </div>
          </section>

          <section className="panel minimal-panel stretch">
            <div className="section-title"><h2>Elenco</h2><span className="count">{backlogTasks.length}</span></div>
            <div className="search-row"><Search size={15} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Cerca" /></div>
            <DropZone day="" dragId={dragId} onMove={moveTask} className="dropzone backlog-zone">
              <div className="backlog-list">
                {backlogTasks.length ? backlogTasks.map(task => (
                  <BacklogTask key={task.id} task={task} category={categoryMap[task.category_id]} setDragId={setDragId} onDelete={deleteTask} />
                )) : <Empty text="Nessuna attività in elenco" />}
              </div>
            </DropZone>
          </section>
        </aside>

        <section className="calendar-panel minimal-panel">
          <div className="calendar-head">
            <div>
              <h2>Settimana</h2>
              <p>Trascina qui le attività. A destra resta solo testo + check.</p>
            </div>
          </div>

          <div className="week-grid">
            {days.map(day => {
              const dayTasks = activeTasks.filter(t => t.day === day);
              return (
                <DropZone key={day} day={day} dragId={dragId} onMove={moveTask} className="day-column">
                  <div className="day-title">{day}</div>
                  <div className="planned-list">
                    {dayTasks.length ? dayTasks.map(task => (
                      <PlannedTask key={task.id} task={task} setDragId={setDragId} onArchive={archiveTask} />
                    )) : <Empty text="Trascina qui" compact />}
                  </div>
                </DropZone>
              );
            })}
          </div>

          <section className="archive-box">
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

function DropZone({ day, dragId, onMove, children, className = 'dropzone' }) {
  const [over, setOver] = useState(false);

  return (
    <div
      className={`${className} ${over ? 'drag-over' : ''}`}
      onDragOver={e => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={e => {
        e.preventDefault();
        setOver(false);
        if (dragId !== null) onMove(dragId, day);
      }}
    >
      {children}
    </div>
  );
}

function BacklogTask({ task, category, setDragId, onDelete }) {
  const cat = category || { name: 'Senza categoria', color: '#94a3b8' };

  return (
    <article className="backlog-task" draggable onDragStart={() => setDragId(task.id)}>
      <div>
        <strong>{task.title}</strong>
        <div className="backlog-meta">
          <span style={{ '--dot': cat.color }}>{cat.name}</span>
          <span>{task.priority}</span>
        </div>
        {task.notes && <p>{task.notes}</p>}
      </div>
      <button onClick={() => onDelete(task.id)} title="Elimina"><Trash2 size={15} /></button>
    </article>
  );
}

function PlannedTask({ task, setDragId, onArchive }) {
  return (
    <div className="planned-task" draggable onDragStart={() => setDragId(task.id)}>
      <button className="check" onClick={() => onArchive(task.id)} aria-label="Segna come fatta" />
      <span>{task.title}</span>
    </div>
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
