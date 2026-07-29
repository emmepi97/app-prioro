// Supabase Edge Function: send-weekly-reports
// Env required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, WEEKO_FROM_EMAIL
// Schedule idea: every Monday at 07:00.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const resendKey = Deno.env.get('RESEND_API_KEY')!;
const fromEmail = Deno.env.get('WEEKO_FROM_EMAIL') || 'Weeko <report@weeko.app>';

function previousWeekRange() {
  const end = new Date();
  end.setHours(0, 0, 0, 0);
  const start = new Date(end);
  start.setDate(start.getDate() - 7);
  return { start, end };
}

Deno.serve(async () => {
  const { start, end } = previousWeekRange();
  const { data: premiumUsers, error: subError } = await supabase
    .from('user_subscriptions')
    .select('user_id')
    .in('plan', ['premium_monthly', 'premium_lifetime'])
    .eq('status', 'active');

  if (subError) return new Response(JSON.stringify({ error: subError.message }), { status: 500 });
  const premiumIds = (premiumUsers || []).map((row) => row.user_id);
  if (!premiumIds.length) return new Response(JSON.stringify({ ok: true, sent: 0 }), { headers: { 'Content-Type': 'application/json' } });

  const { data: settings, error: settingsError } = await supabase
    .from('user_report_settings')
    .select('user_id')
    .eq('weekly_email_enabled', true)
    .in('user_id', premiumIds);

  if (settingsError) return new Response(JSON.stringify({ error: settingsError.message }), { status: 500 });

  let sent = 0;
  for (const row of settings || []) {
    const { data: authUser } = await supabase.auth.admin.getUserById(row.user_id);
    const email = authUser?.user?.email;
    if (!email) continue;

    const { data: tasks } = await supabase
      .from('tasks')
      .select('title,status,day,updated_at,created_at')
      .eq('user_id', row.user_id)
      .gte('updated_at', start.toISOString())
      .lt('updated_at', end.toISOString());

    const completed = (tasks || []).filter((task) => task.status === 'Fatto');
    const open = (tasks || []).filter((task) => task.status !== 'Fatto');
    const completionRate = tasks?.length ? Math.round((completed.length / tasks.length) * 100) : 0;
    const html = `<h2>Il tuo report Weeko</h2><p>Periodo: ${start.toLocaleDateString('it-IT')} - ${end.toLocaleDateString('it-IT')}</p><p><b>Completate:</b> ${completed.length}</p><p><b>Aperte:</b> ${open.length}</p><p><b>Completion rate:</b> ${completionRate}%</p><h3>Cose completate</h3><ul>${completed.slice(0, 20).map((task) => `<li>${task.title}</li>`).join('')}</ul>`;

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: fromEmail, to: email, subject: 'Il tuo report settimanale Weeko', html })
    });
    sent++;
  }
  return new Response(JSON.stringify({ ok: true, sent }), { headers: { 'Content-Type': 'application/json' } });
});
