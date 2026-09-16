import 'server-only';

import { createClient } from '@supabase/supabase-js';

export function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!url || !secretKey) return null;

  return createClient(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function requireWekodeOps(request: Request) {
  const supabase = createSupabaseAdminClient();
  if (!supabase) return { error: 'Supabase server credentials are not configured.', status: 503 } as const;

  const authorization = request.headers.get('authorization');
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return { error: 'Sign in to review station candidates.', status: 401 } as const;

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) return { error: 'Your session is no longer valid.', status: 401 } as const;

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userData.user.id)
    .maybeSingle();

  if (profileError) return { error: 'Unable to verify reviewer access.', status: 502 } as const;
  if (profile?.role !== 'wekode_ops') return { error: 'Only WeKode operations reviewers can moderate station candidates.', status: 403 } as const;

  return { supabase, user: userData.user } as const;
}
