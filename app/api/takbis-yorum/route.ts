import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { buildMessages } from '@/lib/takbis/yorum';

export const runtime = 'nodejs';

const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions';
const MODEL = 'deepseek-v4-pro';

export async function POST(req: NextRequest) {
  // Kimlik kontrolü — API anahtarının kötüye kullanımını önle
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response(JSON.stringify({ error: 'Yetkisiz' }), { status: 401 });

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return new Response(JSON.stringify({ error: 'DeepSeek yapılandırılmamış' }), { status: 500 });

  let rawText: string;
  try {
    const body = await req.json();
    rawText = (body.rawText ?? '').trim();
    if (!rawText) {
      return new Response(JSON.stringify({ error: 'Ham metin boş' }), { status: 400 });
    }
  } catch {
    return new Response(JSON.stringify({ error: 'Geçersiz istek' }), { status: 400 });
  }

  // DeepSeek'e streaming istek (OpenAI uyumlu)
  const upstream = await fetch(DEEPSEEK_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: buildMessages(rawText),
      stream: true,
      temperature: 0.1,
    }),
  });

  if (!upstream.ok || !upstream.body) {
    const errText = await upstream.text().catch(() => '');
    let msg = 'Yorum üretilemedi.';
    if (upstream.status === 402) msg = 'DeepSeek bakiyesi yetersiz. Lütfen hesabınıza bakiye yükleyin.';
    else if (upstream.status === 401) msg = 'DeepSeek API anahtarı geçersiz.';
    console.error('[takbis-yorum] DeepSeek hata:', upstream.status, errText.slice(0, 200));
    return new Response(JSON.stringify({ error: msg }), { status: 502 });
  }

  // SSE → düz metin akışı (sadece içerik delta'larını geç)
  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = '';

  const stream = new ReadableStream({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) { controller.close(); return; }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const data = trimmed.slice(5).trim();
        if (data === '[DONE]') { controller.close(); return; }
        try {
          const json = JSON.parse(data);
          const delta = json.choices?.[0]?.delta?.content;
          if (delta) controller.enqueue(encoder.encode(delta));
        } catch { /* kısmi JSON, sonraki chunk'ta tamamlanır */ }
      }
    },
    cancel() { reader.cancel(); },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
