import { useEffect, useMemo, useRef, useState } from 'react';
import { Download, LogOut, Search, Trash2 } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { isSupabaseConfigured, supabase, supabaseConfigError } from './supabaseClient';

const days = ['LUNEDI', 'MARTEDI', 'MERCOLEDI', 'GIOVEDI', 'VENERDI', 'SABATO', 'DOMENICA'];
const dayLabels = { LUNEDI: 'Lun', MARTEDI: 'Mar', MERCOLEDI: 'Mer', GIOVEDI: 'Gio', VENERDI: 'Ven', SABATO: 'Sab', DOMENICA: 'Dom' };
const dayFullLabels = { LUNEDI: 'Lunedì', MARTEDI: 'Martedì', MERCOLEDI: 'Mercoledì', GIOVEDI: 'Giovedì', VENERDI: 'Venerdì', SABATO: 'Sabato', DOMENICA: 'Domenica' };
const colors = ['#111827', '#2563eb', '#16a34a', '#b45309', '#be123c', '#7c3aed', '#475569'];
const premiumPrice = { monthly: '€9,99/mese', lifetime: '€99 per sempre' };
const weekoTemplates = {
  Manager: { categories: [['Riunioni','#2563eb'], ['Operativo','#16a34a'], ['Strategia','#7c3aed']], every: ['Controllare priorità giornata', 'Verificare follow-up'], future: ['Preparare report direzionale'] },
  Studente: { categories: [['Studio','#2563eb'], ['Esami','#b45309'], ['Progetti','#7c3aed']], every: ['Ripasso 30 minuti', 'Controllo scadenze'], future: ['Preparare prossimo esame'] },
  Allenatore: { categories: [['Allenamento','#16a34a'], ['Partita','#111827'], ['Analisi','#2563eb']], every: ['Controllare disponibilità giocatori', 'Note squadra'], future: ['Preparare seduta prossima settimana'] },
  Founder: { categories: [['Business','#2563eb'], ['Vendite','#16a34a'], ['Prodotto','#7c3aed']], every: ['Review priorità business', 'Follow-up contatti'], future: ['Pianificare crescita utenti'] }
};

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
  const [subscription, setSubscription] = useState(null);
  const [recurringTasks, setRecurringTasks] = useState([]);
  const [reportSettings, setReportSettings] = useState(null);
  const [newRecurring, setNewRecurring] = useState({ title: '', category_id: '', priority: 'Media', notes: '', recurrence_day: 'LUNEDI' });
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
  const isPremium = subscription?.status === 'active' && ['premium_monthly', 'premium_lifetime'].includes(subscription?.plan);
  const planLabel = isPremium ? (subscription.plan === 'premium_lifetime' ? 'Premium Lifetime' : 'Premium Mensile') : 'Free';

  const stats = useMemo(() => buildStats(tasks, categories, statsPeriod), [tasks, categories, statsPeriod]);

  useEffect(() => { loadAll(); }, []);

  useEffect(() => {
    if (isPremium && recurringTasks.length) generateRecurringTasks(recurringTasks);
  }, [isPremium, recurringTasks.length]);

  async function loadAll() {
    setLoading(true);
    setError('');
    await supabase.rpc('create_default_categories_for_user', { target_user: user.id });
    const [catRes, taskRes, subRes, recRes, reportRes] = await Promise.all([
      supabase.from('categories').select('*').order('created_at', { ascending: true }),
      supabase.from('tasks').select('*').order('created_at', { ascending: false }),
      supabase.from('user_subscriptions').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('recurring_tasks').select('*').eq('is_active', true).order('created_at', { ascending: true }),
      supabase.from('user_report_settings').select('*').eq('user_id', user.id).maybeSingle()
    ]);
    if (catRes.error || taskRes.error) setError(catRes.error?.message || taskRes.error?.message);
    setCategories(catRes.data || []);
    setTasks(taskRes.data || []);
    setSubscription(subRes.data || { user_id: user.id, plan: 'free', status: 'active' });
    setRecurringTasks(recRes.data || []);
    setReportSettings(reportRes.data || { user_id: user.id, weekly_email_enabled: false, weekly_email_day: 'MONDAY', weekly_email_hour: 7 });
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


  function getWeekKey(date = new Date()) {
    const current = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = current.getUTCDay() || 7;
    current.setUTCDate(current.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(current.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((current - yearStart) / 86400000) + 1) / 7);
    return `${current.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
  }

  async function activatePlan(plan) {
    const payload = { user_id: user.id, plan, status: 'active', price_label: plan === 'premium_lifetime' ? premiumPrice.lifetime : premiumPrice.monthly };
    const { data, error: err } = await supabase.from('user_subscriptions').upsert(payload, { onConflict: 'user_id' }).select('*').single();
    if (err) setError(err.message);
    else setSubscription(data);
  }

  async function addRecurringTask(e) {
    e.preventDefault();
    if (!isPremium) return setView('premium');
    const title = newRecurring.title.trim();
    if (!title) return;
    const payload = { user_id: user.id, ...newRecurring, title, category_id: newRecurring.category_id || null };
    const { data, error: err } = await supabase.from('recurring_tasks').insert(payload).select('*').single();
    if (err) setError(err.message);
    else {
      setRecurringTasks(prev => [...prev, data]);
      setNewRecurring({ title: '', category_id: '', priority: 'Media', notes: '', recurrence_day: 'LUNEDI' });
      generateRecurringTasks([data]);
    }
  }

  async function generateRecurringTasks(source = recurringTasks) {
    if (!isPremium || !source.length) return;
    const weekKey = getWeekKey();
    const toCreate = [];
    source.forEach(item => {
      const alreadyExists = tasks.some(t => t.recurring_task_id === item.id && t.recurring_week_key === weekKey);
      if (!alreadyExists) {
        toCreate.push({
          user_id: user.id,
          title: item.title,
          category_id: item.category_id || null,
          priority: item.priority || 'Media',
          notes: item.notes || '',
          day: item.recurrence_day,
          status: 'Da fare',
          recurring_task_id: item.id,
          recurring_week_key: weekKey
        });
      }
    });
    if (!toCreate.length) return;
    const { data, error: err } = await supabase.from('tasks').insert(toCreate).select('*');
    if (err) setError(err.message);
    else setTasks(prev => [...(data || []), ...prev]);
  }

  async function toggleWeeklyReport(enabled) {
    if (!isPremium) return setView('premium');
    const payload = { user_id: user.id, weekly_email_enabled: enabled, weekly_email_day: 'MONDAY', weekly_email_hour: 7 };
    const { data, error: err } = await supabase.from('user_report_settings').upsert(payload, { onConflict: 'user_id' }).select('*').single();
    if (err) setError(err.message);
    else setReportSettings(data);
  }

  async function applyTemplate(name) {
    if (!isPremium) return setView('premium');
    const template = weekoTemplates[name];
    if (!template) return;
    const existingNames = new Set(categories.map(c => c.name.toLowerCase()));
    const catsToCreate = template.categories.filter(([name]) => !existingNames.has(name.toLowerCase())).map(([name, color]) => ({ user_id: user.id, name, color }));
    let nextCategories = categories;
    if (catsToCreate.length) {
      const { data, error: err } = await supabase.from('categories').insert(catsToCreate).select('*');
      if (err) return setError(err.message);
      nextCategories = [...categories, ...(data || [])];
      setCategories(nextCategories);
    }
    const defaultCategory = nextCategories.find(c => c.name.toLowerCase() === template.categories[0][0].toLowerCase()) || nextCategories[0];
    const taskPayloads = [
      ...template.every.map(title => ({ user_id: user.id, title, category_id: defaultCategory?.id || null, priority: 'Media', day: 'OGNI_GIORNO', status: 'Da fare' })),
      ...template.future.map(title => ({ user_id: user.id, title, category_id: defaultCategory?.id || null, priority: 'Media', day: 'FUTURO', status: 'Da fare' }))
    ];
    const { data, error: err } = await supabase.from('tasks').insert(taskPayloads).select('*');
    if (err) setError(err.message);
    else setTasks(prev => [...(data || []), ...prev]);
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


  function downloadPlannerPdf() {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageW = 297;
    const pageH = 210;
    const margin = 8;
    const contentW = pageW - margin * 2;
    const today = new Date().toLocaleDateString('it-IT');

    const active = tasks.filter(t => t.status !== 'Fatto');
    const byDay = day => active.filter(t => t.day === day);
    const every = active.filter(t => t.day === 'OGNI_GIORNO');
    const future = active.filter(t => t.day === 'FUTURO');

    const catName = task => categoryMap[task.category_id]?.name || 'Senza categoria';
    const catColor = task => categoryMap[task.category_id]?.color || '#a1a1aa';
    const hexToRgb = hex => {
      const safe = String(hex || '#a1a1aa').replace('#', '');
      const full = safe.length === 3 ? safe.split('').map(x => x + x).join('') : safe.padEnd(6, '0').slice(0, 6);
      return [parseInt(full.slice(0, 2), 16), parseInt(full.slice(2, 4), 16), parseInt(full.slice(4, 6), 16)];
    };
    const text = (value, x, y, opts = {}) => {
      doc.setFont('helvetica', opts.bold ? 'bold' : 'normal');
      doc.setFontSize(opts.size || 7);
      doc.setTextColor(opts.color || '#111827');
      doc.text(String(value || ''), x, y, opts.options || {});
    };
    const roundedRect = (x, y, w, h, r = 2, fill = '#ffffff', stroke = '#e4e4e7') => {
      doc.setDrawColor(stroke);
      doc.setFillColor(fill);
      doc.roundedRect(x, y, w, h, r, r, 'FD');
    };
    const truncate = (value, length) => String(value || '').length > length ? String(value || '').slice(0, length - 1) + '…' : String(value || '');

    function drawMiniTask(task, x, y, w, mode = 'card') {
      const [r, g, b] = hexToRgb(catColor(task));
      if (mode === 'line') {
        doc.setDrawColor('#d4d4d8');
        doc.rect(x, y - 2.2, 2.3, 2.3);
        text(truncate(task.title, 28), x + 4, y, { size: 5.4, color: '#111827' });
        doc.setFillColor(r, g, b);
        doc.circle(x + 4.5, y + 2.4, 0.8, 'F');
        text(truncate(catName(task), 16), x + 6, y + 3, { size: 4.8, bold: true, color: '#52525b' });
        doc.setDrawColor('#f1f1f3');
        doc.line(x, y + 4.2, x + w, y + 4.2);
        return 5.2;
      }
      roundedRect(x, y, w, 17, 1.8, '#ffffff', '#e4e4e7');
      text(truncate(task.title, 34), x + 2, y + 5, { size: 6.1, bold: true });
      doc.setFillColor(r, g, b);
      doc.circle(x + 2.6, y + 10.2, 1, 'F');
      text(truncate(catName(task), 18), x + 4.3, y + 10.9, { size: 5.1, bold: true, color: '#52525b' });
      roundedRect(x + w - 15, y + 7.5, 12, 5, 2, '#f4f4f5', '#f4f4f5');
      text(task.priority || 'Media', x + w - 13.5, y + 11, { size: 4.8, bold: true, color: '#52525b' });
      return 19;
    }

    function drawCardList(title, list, x, y, w, h, maxItems, mode = 'card') {
      text(title, x, y, { size: 6.4, bold: true, color: '#111827' });
      doc.setDrawColor('#d4d4d8');
      doc.line(x, y + 2, x + w, y + 2);
      let cy = y + 6;
      if (!list.length) {
        text('Trascina qui.', x + w / 2, cy + 6, { size: 4.8, color: '#a1a1aa', options: { align: 'center' } });
        return;
      }
      list.slice(0, maxItems).forEach(task => {
        const inc = drawMiniTask(task, x, cy, w, mode);
        cy += inc;
      });
      if (list.length > maxItems) text(`+${list.length - maxItems} altre`, x + w - 18, y + h - 2, { size: 5, bold: true, color: '#71717a' });
    }


    function drawCompactTask(task, x, y, w, h) {
      const [r, g, b] = hexToRgb(catColor(task));
      roundedRect(x, y, w, h, 1.8, '#ffffff', '#e4e4e7');
      text(truncate(task.title, 30), x + 2, y + 4.6, { size: 5.6, bold: true });
      doc.setFillColor(r, g, b);
      doc.circle(x + 2.7, y + 9.2, 0.8, 'F');
      text(truncate(catName(task), 16), x + 4.2, y + 9.8, { size: 4.7, bold: true, color: '#52525b' });
      roundedRect(x + w - 14, y + 6.7, 11, 4.6, 2, '#f4f4f5', '#f4f4f5');
      text(task.priority || 'Media', x + w - 12.8, y + 9.9, { size: 4.4, bold: true, color: '#52525b' });
    }

    function drawCompactGrid(title, list, x, y, w, h, maxItems) {
      text(title, x, y, { size: 6.4, bold: true, color: '#111827' });
      doc.setDrawColor('#d4d4d8');
      doc.line(x, y + 2, x + w, y + 2);
      if (!list.length) {
        text('Nessuna attività.', x + w / 2, y + 15, { size: 5, color: '#a1a1aa', options: { align: 'center' } });
        return;
      }
      const gap = 2;
      const cols = 2;
      const cardW = (w - gap) / cols;
      const cardH = Math.min(13, (h - 7 - gap * 3) / 4);
      list.slice(0, maxItems).forEach((task, index) => {
        const col = index % cols;
        const row = Math.floor(index / cols);
        const tx = x + col * (cardW + gap);
        const ty = y + 6 + row * (cardH + gap);
        drawCompactTask(task, tx, ty, cardW, cardH);
      });
      if (list.length > maxItems) text(`+${list.length - maxItems} altre`, x + w - 18, y + h - 2, { size: 5, bold: true, color: '#71717a' });
    }

    doc.setFillColor('#ffffff');
    doc.rect(0, 0, pageW, pageH, 'F');
    text('Prioro - Planner settimanale', margin, 12, { size: 14, bold: true });
    text(today, pageW - margin, 12, { size: 7, color: '#71717a', options: { align: 'right' } });

    const weekTop = 22;
    text('Giorni della settimana', margin, weekTop, { size: 8, bold: true });
    const colGap = 2.2;
    const colW = (contentW - colGap * 6) / 7;
    const colH = 88;
    const dayTop = weekTop + 5;
    days.forEach((day, i) => {
      const x = margin + i * (colW + colGap);
      roundedRect(x, dayTop, colW, colH, 2, '#ffffff', '#d4d4d8');
      const items = byDay(day);
      drawCardList(day, items, x + 2, dayTop + 5, colW - 4, colH - 6, 14, 'line');
    });

    const bottomTop = dayTop + colH + 8;
    const blockGap = 4;
    const blockW = (contentW - blockGap) / 2;
    const blockH = pageH - bottomTop - margin - 2;
    drawCompactGrid('OGNI GIORNO', every, margin, bottomTop, blockW, blockH, 8);
    drawCompactGrid('FUTURO', future, margin + blockW + blockGap, bottomTop, blockW, blockH, 8);

    doc.save('prioro-planner-settimanale.pdf');
  }

  if (loading) return <div className="loading">Caricamento planner...</div>;

  return <main className="app-shell">
    <div className="app-sticky-head">
      <header className="topbar">
        <div><h1>Prioro</h1><p className="subtitle">Organizza la tua settimana · {user.email}</p></div>
        <div className="top-actions"><button className="soft-btn" onClick={exportExcel}><Download size={16}/>Excel</button><button className="logout-btn desktop-logout" onClick={() => supabase.auth.signOut()}><LogOut size={16}/>Esci</button></div>
      </header>

      <nav className="view-tabs"><button className={view === 'planner' ? 'active' : ''} onClick={() => setView('planner')}>Planner</button><button className={view === 'stats' ? 'active' : ''} onClick={() => setView('stats')}>Statistiche</button><button className={view === 'premium' ? 'active' : ''} onClick={() => setView('premium')}>{isPremium ? planLabel : 'Premium'}</button></nav>
    </div>
    {error && <div className="notice error">{error}</div>}

    {view === 'planner' ? <>
      <section className="planner-hero">
        <div className="planner-hero-head">
          <div><p className="eyebrow">Planner</p><h2>Crea nuova attività</h2></div>
          <button className="category-secondary-btn" type="button" onClick={() => setShowCategoryCreator(v => !v)}>+ Categoria</button>
        </div>
        <form className="quick-form-wide no-goals planner-hero-form" onSubmit={addTask}>
          <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Scrivi cosa devi fare" />
          <select value={newCategory} onChange={e => setNewCategory(e.target.value)}><option value="">Categoria</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
          <select value={newPriority} onChange={e => setNewPriority(e.target.value)}><option value="">Priorità</option><option>Alta</option><option>Media</option><option>Bassa</option></select>
          <input value={newNotes} onChange={e => setNewNotes(e.target.value)} placeholder="Note opzionali" />
          <button className="primary" type="submit">+ Aggiungi</button>
        </form>
        {showCategoryCreator && <form className="quick-category-inline planner-category-inline" onSubmit={addCategory}><input value={catName} onChange={e => setCatName(e.target.value)} placeholder="Nome nuova categoria" /><input type="color" value={catColor} onChange={e => setCatColor(e.target.value)} /><button className="soft-btn">Crea categoria</button></form>}
      </section>

      <section className="workflow-panel">
        <div className="workflow-backlog no-top-border"><div className="section-title"><h2>Elenco attività</h2><span className="count">{backlog.length}</span></div><div className="search-row"><Search size={18}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Cerca attività da trascinare" /></div><div data-day="" className={`backlog-list-horizontal ${hoverDay === '' ? 'drag-over' : ''}`}>{backlog.length ? backlog.map(t => <TaskCard key={t.id} task={t} category={categoryMap[t.category_id]} dragged={draggedTaskId === t.id} onPointerDown={pointerDown} onDelete={deleteTask} onEdit={startEditTask} editingTaskId={editingTaskId} editDraft={taskEditDraft} setEditDraft={setTaskEditDraft} categories={categories} onSaveEdit={saveEditTask} onCancelEdit={cancelEditTask} isTaskEditSheetOpen={isTaskEditSheetOpen} />) : <Empty text="Nessuna attività da pianificare." />}</div></div>

        <div className="workflow-week"><div className="calendar-head"><div><h2>Giorni della settimana</h2><p>Da mobile scegli il giorno con i pulsanti. Puoi trascinare direttamente sul pulsante giorno.</p></div></div><div className="mobile-day-tabs">{days.map((d, i) => <button key={d} data-day={d} className={`${selectedDay === i ? 'active' : ''} ${hoverDay === d ? 'drag-over-tab' : ''}`} onClick={() => setSelectedDay(i)}>{dayLabels[d]}</button>)}</div><div className="week-grid">{days.map((day, i) => { const items = filteredTasks.filter(t => t.day === day); return <DayColumn key={day} day={day} active={selectedDay === i} items={items} categoryMap={categoryMap} hoverDay={hoverDay} draggedTaskId={draggedTaskId} pointerDown={pointerDown} archiveTask={archiveTask} clearDay={clearDay} onEdit={startEditTask} editingTaskId={editingTaskId} editDraft={taskEditDraft} setEditDraft={setTaskEditDraft} categories={categories} onSaveEdit={saveEditTask} onCancelEdit={cancelEditTask} isTaskEditSheetOpen={isTaskEditSheetOpen} />; })}</div></div>
        <ParkingSection title="OGNI GIORNO" day="OGNI_GIORNO" items={everyDay} empty="Trascina qui le attività ricorrenti." categoryMap={categoryMap} hoverDay={hoverDay} draggedTaskId={draggedTaskId} pointerDown={pointerDown} deleteTask={deleteTask} startEditTask={startEditTask} editingTaskId={editingTaskId} taskEditDraft={taskEditDraft} setTaskEditDraft={setTaskEditDraft} categories={categories} saveEditTask={saveEditTask} cancelEditTask={cancelEditTask} isTaskEditSheetOpen={isTaskEditSheetOpen} clearDay={clearDay} />
        <ParkingSection title="FUTURO" day="FUTURO" hint="Cose da ricordare ma da fare prossimamente." items={futureTasks} empty="Trascina qui le cose da ricordare per dopo." categoryMap={categoryMap} hoverDay={hoverDay} draggedTaskId={draggedTaskId} pointerDown={pointerDown} deleteTask={deleteTask} startEditTask={startEditTask} editingTaskId={editingTaskId} taskEditDraft={taskEditDraft} setTaskEditDraft={setTaskEditDraft} categories={categories} saveEditTask={saveEditTask} cancelEditTask={cancelEditTask} isTaskEditSheetOpen={isTaskEditSheetOpen} clearDay={clearDay} />
      </section>

      <PremiumPlannerTools isPremium={isPremium} categories={categories} newRecurring={newRecurring} setNewRecurring={setNewRecurring} addRecurringTask={addRecurringTask} recurringTasks={recurringTasks} applyTemplate={applyTemplate} />

      <div className="planner-pdf-action">
        <button type="button" onClick={downloadPlannerPdf}><Download size={14}/>Scarica PDF</button>
      </div>

      <section className="below-grid no-goals-below">
        <div className="panel categories-list-panel"><div className="section-title"><h2>Categorie</h2><span className="count">{categories.length}</span></div><div className="chips"><button className={!categoryFilter ? 'chip chip-active' : 'chip'} onClick={() => setCategoryFilter('')}>Tutte</button>{categories.map(c => editingCategoryId === c.id ? <span key={c.id} className="chip category-chip category-chip-editing" style={{ '--chip': c.color }}><input value={categoryEditName} onChange={e => setCategoryEditName(e.target.value)} onClick={e => e.stopPropagation()} onKeyDown={e => { if (e.key === 'Enter') saveEditCategory(); if (e.key === 'Escape') cancelEditCategory(); }} onBlur={saveEditCategory} autoFocus /></span> : <span key={c.id} className={categoryFilter === c.id ? 'chip chip-active category-chip' : 'chip category-chip'} style={{ '--chip': c.color }} onClick={() => setCategoryFilter(c.id)} onDoubleClick={() => startEditCategory(c)} title="Click per filtrare. Doppio click per modificare. Usa × per eliminare."><span className="category-chip-name">{c.name}</span><button type="button" className="category-delete-btn" aria-label={`Elimina categoria ${c.name}`} onClick={e => { e.stopPropagation(); deleteCategory(c.id); }}>×</button></span>)}</div></div>
        <ArchiveDoneList doneTasks={doneTasks} restoreTask={restoreTask} deleteTask={deleteTask} />
      </section>
    </> : view === 'stats' ? <StatsPage stats={stats} statsPeriod={statsPeriod} setStatsPeriod={setStatsPeriod} categoryMap={categoryMap} isPremium={isPremium} reportSettings={reportSettings} toggleWeeklyReport={toggleWeeklyReport} /> : <PremiumPage isPremium={isPremium} planLabel={planLabel} activatePlan={activatePlan} />}

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


function PremiumPlannerTools({ isPremium, categories, newRecurring, setNewRecurring, addRecurringTask, recurringTasks, applyTemplate }) {
  return <section className="premium-tools-panel">
    <div className="premium-tools-head"><div><p className="eyebrow">Premium</p><h2>Automazioni e template</h2><p>Ricorrenze automatiche e template mono pagina sono disponibili nel piano Premium.</p></div><span className={isPremium ? 'premium-badge active' : 'premium-badge'}>{isPremium ? 'Attivo' : 'Bloccato'}</span></div>
    {isPremium ? <div className="premium-tools-grid">
      <form className="recurring-form" onSubmit={addRecurringTask}>
        <strong>Attività ricorrente</strong>
        <input value={newRecurring.title} onChange={e => setNewRecurring(v => ({ ...v, title: e.target.value }))} placeholder="Titolo ricorrenza" />
        <select value={newRecurring.category_id} onChange={e => setNewRecurring(v => ({ ...v, category_id: e.target.value }))}><option value="">Categoria</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        <select value={newRecurring.recurrence_day} onChange={e => setNewRecurring(v => ({ ...v, recurrence_day: e.target.value }))}>{days.map(d => <option key={d} value={d}>{d}</option>)}</select>
        <button className="primary" type="submit">Crea ricorrenza</button>
        <small>{recurringTasks.length} ricorrenze attive</small>
      </form>
      <div className="template-box"><strong>Template Premium</strong><p>Applica una struttura mono pagina senza creare nuove viste.</p><div className="template-actions">{Object.keys(weekoTemplates).map(name => <button key={name} type="button" onClick={() => applyTemplate(name)}>{name}</button>)}</div></div>
    </div> : <div className="premium-locked-note">Sblocca Premium per creare attività ricorrenti, template, report email e statistiche evolute.</div>}
  </section>;
}

function PremiumStatsBlock({ stats, isPremium, reportSettings, toggleWeeklyReport }) {
  const bestCategory = stats.categoryRows?.[0]?.label || '-';
  const weeklyAvg = stats.completed ? Math.round(stats.completed / 4) : 0;
  return <div className="panel premium-panel review-wide premium-stats-block">
    <h3>Statistiche evolute</h3>
    {!isPremium ? <p className="stat-muted">Disponibili con Premium: trend, report settimanale via email, storico completo e insight ricorrenti.</p> : <>
      <div className="advanced-stats-grid"><div><strong>{bestCategory}</strong><span>Categoria dominante</span></div><div><strong>{weeklyAvg}</strong><span>Media stimata settimanale</span></div><div><strong>{stats.completionRate}%</strong><span>Completamento periodo</span></div></div>
      <label className="report-toggle"><input type="checkbox" checked={!!reportSettings?.weekly_email_enabled} onChange={e => toggleWeeklyReport(e.target.checked)} /> Ricevi report email ogni lunedì alle 07:00</label>
    </>}
  </div>;
}

function PremiumPage({ isPremium, planLabel, activatePlan }) {
  return <section className="premium-page">
    <div className="stats-hero"><div><p className="eyebrow">Premium</p><h2>Free o Premium</h2><p>Il piano Free resta completo per pianificare. Premium aggiunge automazioni, storico evoluto, email report e template.</p></div><span className={isPremium ? 'premium-badge active' : 'premium-badge'}>{planLabel}</span></div>
    <div className="pricing-grid">
      <div className="price-card"><p className="eyebrow">Free</p><h3>€0</h3><ul><li>Planner settimanale</li><li>Categorie, Futuro, Ogni Giorno</li><li>Statistiche base</li><li>PDF base</li></ul></div>
      <div className="price-card premium-price"><p className="eyebrow">Premium</p><h3>{premiumPrice.monthly}</h3><ul><li>Attività ricorrenti</li><li>Statistiche evolute</li><li>Report email settimanale</li><li>Template mono pagina</li><li>Storico completo</li></ul><button className="primary" onClick={() => activatePlan('premium_monthly')}>Attiva mensile</button></div>
      <div className="price-card premium-price"><p className="eyebrow">Lifetime</p><h3>{premiumPrice.lifetime}</h3><ul><li>Tutte le funzioni Premium</li><li>Pagamento unico</li><li>Accesso per sempre</li></ul><button className="primary" onClick={() => activatePlan('premium_lifetime')}>Attiva lifetime</button></div>
    </div>
    <div className="notice">Nota: i pulsanti salvano il piano in Supabase. Per incassare pagamenti reali collega Stripe/Polar/Lemon Squeezy e aggiorna la tabella <code>user_subscriptions</code> via webhook.</div>
  </section>;
}

function ArchiveDoneList({ doneTasks, restoreTask, deleteTask }) {
  const [isOpen, setIsOpen] = useState(true);
  const [visibleCount, setVisibleCount] = useState(20);
  const visibleRows = doneTasks.slice(0, visibleCount);
  const remaining = Math.max(0, doneTasks.length - visibleRows.length);

  return <div className="panel archive-panel-scalable">
    <button className="archive-toggle" type="button" onClick={() => setIsOpen(v => !v)}>
      <span>{isOpen ? '▼' : '▶'} Archivio cose fatte <em>({doneTasks.length})</em></span>
      <small>Archivio</small>
    </button>
    {isOpen && <>
      {doneTasks.length ? <>
        <div className="archive-visibility">Visualizzate {visibleRows.length} di {doneTasks.length} attività</div>
        <div className="archive-list">{visibleRows.map(task => <div className="archive-row" key={task.id}><span>{task.title}</span><div><button onClick={() => restoreTask(task.id)}>Ripristina</button><button className="danger-link" onClick={() => deleteTask(task.id)}>Elimina</button></div></div>)}</div>
        {remaining > 0 && <button className="show-more-btn" type="button" onClick={() => setVisibleCount(v => v + 20)}>Mostra altre {Math.min(20, remaining)}</button>}
      </> : <div className="archive-empty">Non ci sono attività archiviate.</div>}
    </>}
  </div>;
}

function StatsPage({ stats, statsPeriod, setStatsPeriod, categoryMap, isPremium, reportSettings, toggleWeeklyReport }) {
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
      <PremiumStatsBlock stats={stats} isPremium={isPremium} reportSettings={reportSettings} toggleWeeklyReport={toggleWeeklyReport} />
    </div>
  </section>;
}

function StatCard({ value, label }) { return <div className="stat-card"><strong>{value}</strong><span>{label}</span></div>; }
function BarList({ rows }) { const max = Math.max(1, ...rows.map(r => r.value)); return <div className="bar-list">{rows.map(r => <div className="bar-row" key={r.label}><span>{r.label}</span><div><i style={{ width: `${Math.max(4, (r.value / max) * 100)}%` }} /></div><em>{r.value}</em></div>)}</div>; }
function CategoryStats({ rows }) { const max = Math.max(1, ...rows.map(r => r.value)); return <div className="category-stats">{rows.length ? rows.map(r => <div className="category-stat" key={r.label}><span><i style={{ background: r.color }} />{r.label}</span><b>{r.value}</b><div><i style={{ width: `${Math.max(4, (r.value / max) * 100)}%`, background: r.color }} /></div></div>) : <div className="archive-empty">Nessuna categoria completata.</div>}</div>; }
function ReviewList({ title, rows, empty, categoryMap, done }) {
  const [isOpen, setIsOpen] = useState(true);
  const [visibleCount, setVisibleCount] = useState(20);
  const visibleRows = rows.slice(0, visibleCount);
  const remaining = Math.max(0, rows.length - visibleRows.length);

  return <div className="panel premium-panel review-collapsible">
    <button className="review-toggle" type="button" onClick={() => setIsOpen(v => !v)}>
      <span>{isOpen ? '▼' : '▶'} {title} <em>({rows.length})</em></span>
      <small>{done ? 'Completate' : 'Aperte'}</small>
    </button>
    {isOpen && <>
      <p className="stat-muted">{done ? 'Ultime attività completate.' : 'Attività ancora da chiudere.'}</p>
      {rows.length ? <>
        <div className="review-visibility">Visualizzate {visibleRows.length} di {rows.length} attività</div>
        <div className="review-list">{visibleRows.map(t => <div className="review-row" key={t.id}><div><strong>{t.title}</strong><span>{categoryMap[t.category_id]?.name || 'Senza categoria'}</span></div></div>)}</div>
        {remaining > 0 && <button className="show-more-btn" type="button" onClick={() => setVisibleCount(v => v + 20)}>Mostra altre {Math.min(20, remaining)}</button>}
      </> : <div className="archive-empty">{empty}</div>}
    </>}
  </div>;
}

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
    doneRecent: sortDesc(completedTasks),
    openRecent: sortDesc(openTasks),
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
