import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { tasks, reportType, dateStr, prompt } = await req.json();
    const db = await getDb();

    // Load LLM settings from DB
    const settings = await db.get('SELECT * FROM settings WHERE id = 1');
    const apiBase = settings?.api_base || 'https://api.openai.com/v1';
    const apiKey = settings?.api_key || '';
    const model = settings?.model || 'gpt-4o';

    if (!apiKey) {
      return NextResponse.json({ error: '请先在设置页面配置 API 密钥' }, { status: 400 });
    }

    const completedTasks = tasks.filter((t: { completed: boolean }) => t.completed);
    const uncompletedTasks = tasks.filter((t: { completed: boolean }) => !t.completed);

    const taskListText = `
已完成任务（${completedTasks.length} 条）：
${completedTasks.length > 0 ? completedTasks.map((t: { text: string }, i: number) => `${i + 1}. ${t.text}`).join('\n') : '（无）'}

未完成任务（${uncompletedTasks.length} 条）：
${uncompletedTasks.length > 0 ? uncompletedTasks.map((t: { text: string }, i: number) => `${i + 1}. ${t.text}`).join('\n') : '（无）'}
    `.trim();

    const systemPrompt = prompt || (reportType === 'daily'
      ? '请根据以下任务列表，生成一份专业的工作日报。包含已完成工作、未完成工作以及明日计划。'
      : '请根据以下任务列表，生成一份专业的工作周报。包含本周已完成工作、未完成工作以及下周重点计划。');

    const userMessage = `日期：${dateStr}\n\n${taskListText}`;

    // Set up streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const response = await fetch(`${apiBase}/chat/completions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model,
              stream: true,
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userMessage },
              ],
            }),
          });

          if (!response.ok) {
            const errText = await response.text();
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: `API 错误 (${response.status}): ${errText}` })}\n\n`));
            controller.close();
            return;
          }

          const reader = response.body?.getReader();
          if (!reader) {
            controller.close();
            return;
          }

          const decoder = new TextDecoder();
          let buffer = '';

          while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6).trim();
                if (data === '[DONE]') {
                  controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
                  continue;
                }
                try {
                  const json = JSON.parse(data);
                  const content = json.choices?.[0]?.delta?.content;
                  if (content) {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
                  }
                } catch {
                  // skip malformed lines
                }
              }
            }
          }

          controller.close();
        } catch (err) {
          const msg = err instanceof Error ? err.message : '未知错误';
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('AI generate error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
