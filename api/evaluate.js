export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const { essay, article } = await req.json();

  if (!essay || essay.trim().length < 50) {
    return new Response(JSON.stringify({ error: '에세이가 너무 짧습니다.' }), {
      status: 400, headers: { 'Content-Type': 'application/json' }
    });
  }

  const prompt = `당신은 한국 중학생의 영어 읽기 프로그램에서 Summary-Response 에세이를 평가하는 선생님입니다.

아래는 학생이 읽은 기사입니다:
---
${article}
---

아래는 학생이 작성한 에세이입니다:
---
${essay}
---

다음 기준으로 평가해 주세요. 반드시 한국어로, 중학생이 이해할 수 있는 친절한 말투로 작성하세요.

1. **잘한 점** (2~3가지, 구체적으로)
2. **보완할 점** (2~3가지, 구체적으로)
3. **총평** (2~3문장, 격려와 함께)

평가는 500자 내외로 간결하게 작성하세요.`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    return new Response(JSON.stringify({ error: 'API 호출 실패: ' + err }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }

  const data = await response.json();
  const result = data.content[0].text;

  return new Response(JSON.stringify({ result }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
}
