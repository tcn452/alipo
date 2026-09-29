import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const userAgent = request.headers.get('user-agent') || '';
    
    let platform = body.platform;
    if (!platform || platform === 'unknown') {
      const ua = userAgent.toLowerCase();
      if (/iphone|ipad|ipod/.test(ua)) platform = 'ios';
      else if (/android/.test(ua)) platform = 'android';
      else platform = 'desktop';
    }

    const deviceId = body.deviceId || null;

    if (isSupabaseConfigured) {
      const { error } = await supabase.from('pwa_installs').insert({
        platform,
        user_agent: userAgent.slice(0, 500),
        device_id: deviceId,
      });

      if (error) {
        console.error('Failed to log PWA install in Supabase:', error);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PWA install API error:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

export async function GET() {
  try {
    if (!isSupabaseConfigured) {
      return NextResponse.json({
        total: 0,
        byPlatform: { android: 0, ios: 0, desktop: 0 },
        message: 'Supabase not configured',
      });
    }

    const { count, error } = await supabase
      .from('pwa_installs')
      .select('*', { count: 'exact', head: true });

    if (error) throw error;

    const { data: records } = await supabase
      .from('pwa_installs')
      .select('platform, installed_at')
      .order('installed_at', { ascending: false })
      .limit(100);

    const byPlatform: Record<string, number> = { android: 0, ios: 0, desktop: 0, other: 0 };
    (records || []).forEach((row) => {
      const p = (row.platform || 'other').toLowerCase();
      byPlatform[p] = (byPlatform[p] || 0) + 1;
    });

    return NextResponse.json({
      total: count || 0,
      byPlatform,
      recent: records?.slice(0, 10) || [],
    });
  } catch (error) {
    console.error('Failed to retrieve PWA install metrics:', error);
    return NextResponse.json({ total: 0, error: 'Failed to fetch metrics' }, { status: 500 });
  }
}
