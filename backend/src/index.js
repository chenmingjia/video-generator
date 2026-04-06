const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const https = require('https');
const querystring = require('querystring');
const path = require('path');
const { getClient } = require('./db');
const http = require('http');

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });
if (!process.env.ARK_API_KEY) {
  dotenv.config({ path: path.resolve(__dirname, '..', 'env.example') });
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'e-video-generator-backend' });
});

app.get('/api/db/health', async (req, res) => {
  try {
    const c = await getClient();
    await c.execute('SELECT 1 as ok');
    res.json({ ok: true, driver: '@libsql/client', url: process.env.LIBSQL_URL || 'file:./data/app.sqlite' });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e && e.message ? e.message : e) });
  }
});

app.get('/api/storage/characters', async (req, res) => {
  try {
    const c = await getClient();
    const r = await c.execute('SELECT id, name, description, image_url as imageUrl, prompt, created_at as createdAt FROM characters ORDER BY id DESC');
    res.json({ ok: true, data: r.rows });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e && e.message ? e.message : e) });
  }
});

app.post('/api/storage/characters', async (req, res) => {
  const body = req.body || {};
  try {
    const c = await getClient();
    const r = await c.execute({
      sql: 'INSERT INTO characters (name, description, image_url, prompt) VALUES (?, ?, ?, ?) RETURNING id, name, description, image_url as imageUrl, prompt, created_at as createdAt',
      args: [body.name || '', body.description || '', body.imageUrl || '', body.prompt || '']
    });
    res.json({ ok: true, data: r.rows?.[0] });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e && e.message ? e.message : e) });
  }
});

app.put('/api/storage/characters/:id', async (req, res) => {
  const body = req.body || {};
  const id = Number(req.params.id);
  try {
    const c = await getClient();
    const r = await c.execute({
      sql: 'UPDATE characters SET name = ?, description = ?, image_url = ?, prompt = ? WHERE id = ? RETURNING id, name, description, image_url as imageUrl, prompt, created_at as createdAt',
      args: [body.name || '', body.description || '', body.imageUrl || '', body.prompt || '', id]
    });
    res.json({ ok: true, data: r.rows?.[0] });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e && e.message ? e.message : e) });
  }
});

app.get('/api/storage/scenes', async (req, res) => {
  try {
    const c = await getClient();
    const r = await c.execute('SELECT id, location, emotion, image_url as imageUrl, prompt, created_at as createdAt FROM scenes ORDER BY id DESC');
    res.json({ ok: true, data: r.rows });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e && e.message ? e.message : e) });
  }
});

app.post('/api/storage/scenes', async (req, res) => {
  const body = req.body || {};
  try {
    const c = await getClient();
    const r = await c.execute({
      sql: 'INSERT INTO scenes (location, emotion, image_url, prompt) VALUES (?, ?, ?, ?) RETURNING id, location, emotion, image_url as imageUrl, prompt, created_at as createdAt',
      args: [body.location || '', body.emotion || '', body.imageUrl || '', body.prompt || '']
    });
    res.json({ ok: true, data: r.rows?.[0] });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e && e.message ? e.message : e) });
  }
});

app.put('/api/storage/scenes/:id', async (req, res) => {
  const body = req.body || {};
  const id = Number(req.params.id);
  try {
    const c = await getClient();
    const r = await c.execute({
      sql: 'UPDATE scenes SET location = ?, emotion = ?, image_url = ?, prompt = ? WHERE id = ? RETURNING id, location, emotion, image_url as imageUrl, prompt, created_at as createdAt',
      args: [body.location || '', body.emotion || '', body.imageUrl || '', body.prompt || '', id]
    });
    res.json({ ok: true, data: r.rows?.[0] });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e && e.message ? e.message : e) });
  }
});

app.get('/api/storage/storyboards', async (req, res) => {
  try {
    const c = await getClient();
    const r = await c.execute('SELECT id, shot_index as shotIndex, camera, duration_sec as durationSec, visual, prompt, on_screen_text as onScreenText FROM storyboards ORDER BY id ASC');
    res.json({ ok: true, data: r.rows });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e && e.message ? e.message : e) });
  }
});

app.post('/api/storage/storyboards', async (req, res) => {
  const list = Array.isArray(req.body?.storyboard) ? req.body.storyboard : [];
  try {
    const c = await getClient();
    const results = [];
    for (const s of list) {
      const r = await c.execute({
        sql: 'INSERT INTO storyboards (shot_index, camera, duration_sec, visual, prompt, on_screen_text) VALUES (?, ?, ?, ?, ?, ?) RETURNING id, shot_index as shotIndex, camera, duration_sec as durationSec, visual, prompt, on_screen_text as onScreenText',
        args: [s.shotIndex || 0, s.camera || '', Math.round(s.durationSec || 0), s.visual || '', s.prompt || '', s.onScreenText || '']
      });
      if (r.rows?.[0]) results.push(r.rows[0]);
    }
    res.json({ ok: true, data: results });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e && e.message ? e.message : e) });
  }
});
app.put('/api/storage/storyboards/:id', async (req, res) => {
  const id = Number(req.params.id);
  const s = req.body || {};
  try {
    const c = await getClient();
    const r = await c.execute({
      sql: 'UPDATE storyboards SET shot_index = ?, camera = ?, duration_sec = ?, visual = ?, prompt = ?, on_screen_text = ? WHERE id = ? RETURNING id, shot_index as shotIndex, camera, duration_sec as durationSec, visual, prompt, on_screen_text as onScreenText',
      args: [s.shotIndex || 0, s.camera || '', Math.round(s.durationSec || 0), s.visual || '', s.prompt || '', s.onScreenText || '', id]
    });
    res.json({ ok: true, data: r.rows?.[0] });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e && e.message ? e.message : e) });
  }
});
// 获取保存的分集视频列表
app.get('/api/storage/episodes', async (req, res) => {
  try {
    const c = await getClient();
    const r = await c.execute('SELECT id, title, duration_sec as duration, people_cnt as people, shots_cnt as shots, scenes_cnt as scenes, thumb, video_url as videoUrl, created_at as createdAt FROM episodes ORDER BY id ASC');
    res.json({ ok: true, data: r.rows });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e && e.message ? e.message : e) });
  }
});

// 批量保存/更新分集视频
app.post('/api/storage/episodes', async (req, res) => {
  const list = Array.isArray(req.body?.episodes) ? req.body.episodes : [];
  try {
    const c = await getClient();
    const results = [];
    for (const ep of list) {
      if (ep.dbId) {
        const r = await c.execute({
          sql: 'UPDATE episodes SET title = ?, duration_sec = ?, people_cnt = ?, shots_cnt = ?, scenes_cnt = ?, thumb = ?, video_url = ? WHERE id = ? RETURNING id, title, duration_sec as duration, people_cnt as people, shots_cnt as shots, scenes_cnt as scenes, thumb, video_url as videoUrl',
          args: [ep.title || '', ep.duration || 15, ep.people || 0, ep.shots || 0, ep.scenes || 0, ep.thumb || '', ep.videoUrl || '', ep.dbId]
        });
        if (r.rows?.[0]) results.push(r.rows[0]);
      } else {
        const r = await c.execute({
          sql: 'INSERT INTO episodes (title, duration_sec, people_cnt, shots_cnt, scenes_cnt, thumb, video_url) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id, title, duration_sec as duration, people_cnt as people, shots_cnt as shots, scenes_cnt as scenes, thumb, video_url as videoUrl',
          args: [ep.title || '', ep.duration || 15, ep.people || 0, ep.shots || 0, ep.scenes || 0, ep.thumb || '', ep.videoUrl || '']
        });
        if (r.rows?.[0]) results.push(r.rows[0]);
      }
    }
    res.json({ ok: true, data: results });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e && e.message ? e.message : e) });
  }
});

// 工作流相关的接口
app.get('/api/storage/workflows', async (req, res) => {
  try {
    const c = await getClient();
    const r = await c.execute('SELECT id, title, state_json as stateJson, created_at as createdAt, updated_at as updatedAt FROM workflows ORDER BY updated_at DESC');
    res.json({ ok: true, data: r.rows });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e && e.message ? e.message : e) });
  }
});

app.post('/api/storage/workflows', async (req, res) => {
  const body = req.body || {};
  try {
    const c = await getClient();
    const r = await c.execute({
      sql: 'INSERT INTO workflows (title, state_json) VALUES (?, ?) RETURNING id, title, state_json as stateJson, created_at as createdAt, updated_at as updatedAt',
      args: [body.title || '新剧集工作流', body.stateJson || '{}']
    });
    res.json({ ok: true, data: r.rows?.[0] });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e && e.message ? e.message : e) });
  }
});

app.put('/api/storage/workflows/:id', async (req, res) => {
  const id = Number(req.params.id);
  const body = req.body || {};
  try {
    const c = await getClient();
    const r = await c.execute({
      sql: "UPDATE workflows SET title = ?, state_json = ?, updated_at = (strftime('%s','now')) WHERE id = ? RETURNING id, title, state_json as stateJson, created_at as createdAt, updated_at as updatedAt",
      args: [body.title || '新剧集工作流', body.stateJson || '{}', id]
    });
    res.json({ ok: true, data: r.rows?.[0] });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e && e.message ? e.message : e) });
  }
});

app.delete('/api/storage/workflows/:id', async (req, res) => {
  const id = Number(req.params.id);
  try {
    const c = await getClient();
    await c.execute({
      sql: 'DELETE FROM workflows WHERE id = ?',
      args: [id]
    });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e && e.message ? e.message : e) });
  }
});

app.post('/api/video/ai-episodes', async (req, res) => {
  const body = req.body || {};
  const isNovelMode = !!body.isNovelMode;
  let promptText = typeof body.prompt === 'string' ? body.prompt : '';
  const count = Math.min(8, Math.max(1, Number(body.count || 5)));
  const arkApiKey = process.env.ARK_API_KEY || '';
  if (!arkApiKey) {
    res.status(400).json({ ok: false, error: 'ARK_API_KEY 未配置' });
    return;
  }

  const callLLM = (sys, userText) => {
    return new Promise((resolve, reject) => {
      const data = JSON.stringify({
        model: 'doubao-seed-2-0-pro-260215',
        input: [
          { role: 'system', content: [{ type: 'input_text', text: sys }] },
          { role: 'user', content: [{ type: 'input_text', text: userText }] }
        ]
      });
      const options = {
        hostname: 'ark.cn-beijing.volces.com',
        port: 443,
        path: '/api/v3/responses',
        method: 'POST',
        headers: {
          Authorization: `Bearer ${arkApiKey}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data)
        }
      };
      const req2 = https.request(options, (res2) => {
        let responseData = '';
        res2.on('data', (chunk) => { responseData += chunk; });
        res2.on('end', () => {
          try {
            const parsed = JSON.parse(responseData);
            const content = parsed?.output?.[1]?.content?.[0]?.text || '';
            let obj = null;
            try { obj = JSON.parse(content); } catch (_) {
              const start = content.indexOf('{');
              const end = content.lastIndexOf('}');
              if (start >= 0 && end > start) {
                const sliced = content.slice(start, end + 1);
                try { obj = JSON.parse(sliced); } catch (_) {}
              }
            }
            if (!obj || !Array.isArray(obj.episodes)) {
              resolve({ episodes: [] });
              return;
            }
            resolve(obj);
          } catch (e) {
            reject(new Error('解析外部接口响应失败'));
          }
        });
      });
      req2.on('error', (err) => {
        reject(err);
      });
      req2.write(data);
      req2.end();
    });
  };

  try {
    let allEpisodes = [];
    const seed = String(Date.now());

    if (isNovelMode) {
      const MAX_TEXT_LENGTH = 80000;
      const MAX_CHUNKS = 10;
      let currentIndex = 0;
      let chunksProcessed = 0;
      
      while (currentIndex < promptText.length && allEpisodes.length < count && chunksProcessed < MAX_CHUNKS) {
        let chunk = promptText.slice(currentIndex, currentIndex + MAX_TEXT_LENGTH);
        currentIndex += MAX_TEXT_LENGTH;
        chunksProcessed += 1;
        
        if (currentIndex < promptText.length && chunksProcessed < MAX_CHUNKS) {
          chunk += "\n\n[文本已截断，请基于已有内容进行划分]";
        }

        const remainingCount = count - allEpisodes.length;
        const sys = '你是一名专业的剧本编剧和分集策划师。请严格输出 JSON 格式。';
        const userText = `请将以下小说/剧本文本按叙事节奏划分为约 ${remainingCount} 集的短剧剧本。

划分原则：
1. 每集应有完整的叙事弧（开端/发展/高潮或悬念）
2. 在自然的情节转折点或场景切换处分集
3. 各集内容量大致均衡，但优先保证叙事完整性
4. 实际集数可以在建议集数 ±2 范围内浮动
5. 请输出每一集的 title（标题）、summary（简要摘要）、script（详细剧本文段，包含极其丰富的画面细节、人物动作、神态描写和对白）、durationSec（固定为15）
6. 【极度重要】：为了保证拍摄素材充足，每一集的 script 字段字数必须不少于 500 字！绝对不能使用简略的占位符或一笔带过，请极尽详细地扩写场景和台词！

输出纯 JSON（不要 markdown 代码块）：{"episodes":[{"title":"","durationSec":15,"summary":"","script":""}]}

原文如下：
${chunk}

随机性种子: ${seed}`;

        const result = await callLLM(sys, userText);
        if (result && result.episodes) {
          allEpisodes = allEpisodes.concat(result.episodes);
        }
      }
      
      // 如果生成的集数超过了目标，截断
      if (allEpisodes.length > count) {
        allEpisodes = allEpisodes.slice(0, count);
      }
      
    } else {
      const sys = '你是专业的短视频分集剧本编剧。严格输出 JSON：{"episodes":[{"title":"","durationSec":15,"summary":"","script":""}]}。每集 15 秒。请注意：script 字段必须极其详细，【每集字数不少于 500 字】，包含丰富的画面细节、神态动作描写和完整的对白。不要使用简略的占位符或一笔带过。language: zh。';
      const userText = `${promptText}\n请生成 ${count} 集，每集 15 秒的短剧分集：标题、简要摘要、详细剧本文段。\n【极度重要】：要求 script 字段必须极其详细，极尽描述场景动作和台词，每集 script 的字数绝对不能少于 500 字！\n随机性种子: ${seed}`;
      const result = await callLLM(sys, userText);
      if (result && result.episodes) {
        allEpisodes = result.episodes;
      }
    }

    if (allEpisodes.length === 0) {
      const fallback = Array.from({ length: count }).map((_, i) => ({
        title: `${promptText && promptText.trim() ? promptText.trim().slice(0, 20) : '短剧'} · 第 ${i + 1} 集`,
        durationSec: 15,
        summary: `围绕“${promptText ? promptText.slice(0, 10) : ''}”主题，15 秒内呈现冲突与反转的片段摘要。`,
        script: `【画面】快节奏推进“${promptText ? promptText.slice(0, 10) : ''}”主题的动作与对白。\n【对白】（简短有力、贴合主题）`
      }));
      res.json({ ok: true, episodes: fallback, via: 'fallback', seed });
      return;
    }

    const episodes = allEpisodes.map((e, i) => ({
      title: e.title || `第 ${i + 1} 集`,
      durationSec: Number(e.durationSec || 15),
      summary: e.summary || '',
      script: e.script || ''
    }));
    
    res.json({ ok: true, episodes, via: 'ark', seed });

  } catch (err) {
    res.status(500).json({ ok: false, error: String(err && err.message ? err.message : err) });
  }
});
function pickTopic(body) {
  const topic = body?.topic;
  if (typeof topic === 'string' && topic.trim()) return topic.trim();
  return '一场关于勇气与谎言的短剧';
}

function pickStyle(body) {
  const style = body?.style;
  if (typeof style === 'string' && style.trim()) return style.trim();
  return '轻喜剧 + 悬疑反转';
}

function genScenes(topic, style) {
  // 占位数据：后续接入真实大模型时只需要替换这部分生成逻辑
  return [
    {
      index: 1,
      location: '街角便利店',
      emotion: '好奇',
      dialogue: `（旁白）关于“${topic}”的传闻，在这里悄悄发酵。`,
    },
    {
      index: 2,
      location: '雨夜巷口',
      emotion: '紧张',
      dialogue: '（角色A）你知道真相吗？',
    },
    {
      index: 3,
      location: '屋顶天台',
      emotion: '释怀',
      dialogue: '（角色B）我一直以为你会理解我。',
    },
    {
      index: 4,
      location: '清晨街道',
      emotion: '反转',
      dialogue: '（旁白）原来，“真相”从来都不止一种。',
    },
  ].map((s) => ({ ...s, style }));
}

// 使用 Doubao Seed 2.0 Pro 模型生成剧本
async function generateScriptWithDoubao(topic, style) {
  return new Promise((resolve, reject) => {
    const arkApiKey = process.env.ARK_API_KEY || '';
    if (!arkApiKey) {
      reject(new Error('ARK_API_KEY 未配置'));
      return;
    }
    
    const data = JSON.stringify({
      model: "doubao-seed-2-0-pro-260215",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `请根据以下主题和风格生成一个完整的短剧剧本：\n主题：${topic}\n风格：${style}\n\n剧本要求：\n1. 包含 4 幕场景\n2. 每幕场景需要包含：场景索引、地点、情绪、对话\n3. 生成一个吸引人的标题和简短的 logline\n4. 剧本结构清晰，对话自然\n5. 符合指定的风格`
            }
          ]
        }
      ]
    });

    const options = {
      hostname: 'ark.cn-beijing.volces.com',
      port: 443,
      path: '/api/v3/responses',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${arkApiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedResponse = JSON.parse(responseData);
          resolve(parsedResponse);
        } catch (error) {
          reject(new Error('Failed to parse API response'));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

function analyzeScriptToPrompts(scriptContent) {
  return new Promise((resolve, reject) => {
    const arkApiKey = process.env.ARK_API_KEY || '';
    if (!arkApiKey) {
      reject(new Error('ARK_API_KEY 未配置'));
      return;
    }
    const sys = '你是一个提取器。阅读输入的剧本文本，严格返回 JSON：{"characters":[{"name":"","description":"","prompt":""}], "scenes":[{"location":"","emotion":"","prompt":""}]}。不要输出任何解释文字。角色数量 2-6，场景数量 3-8。prompt 要用于写实电影风格生图描述（中文可）。';
    const data = JSON.stringify({
      model: 'doubao-seed-2-0-pro-260215',
      input: [
        { role: 'system', content: [{ type: 'input_text', text: sys }] },
        { role: 'user', content: [{ type: 'input_text', text: String(scriptContent || '').slice(0, 6000) }] }
      ]
    });
    const options = {
      hostname: 'ark.cn-beijing.volces.com',
      port: 443,
      path: '/api/v3/responses',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${arkApiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };
    const req2 = https.request(options, (res2) => {
      let responseData = '';
      res2.on('data', (chunk) => { responseData += chunk; });
      res2.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
        const content =
          (Array.isArray(parsed?.output)
            ? (parsed.output.find(x => x && x.role === 'assistant')?.content?.find?.(c => typeof c?.text === 'string')?.text
              || parsed.output.map(it => it?.content?.[0]?.text).find(t => typeof t === 'string'))
            : undefined)
          || parsed?.output_text
          || '';
          const jsonStart = content.indexOf('{');
          const jsonEnd = content.lastIndexOf('}');
          const sliced = jsonStart >= 0 && jsonEnd > jsonStart ? content.slice(jsonStart, jsonEnd + 1) : content;
          const obj = JSON.parse(sliced);
          const characters = Array.isArray(obj.characters) ? obj.characters : [];
          const scenes = Array.isArray(obj.scenes) ? obj.scenes : [];
          resolve({ characters, scenes });
        } catch (e) {
          reject(e);
        }
      });
    });
    req2.on('error', (err) => reject(err));
    req2.write(data);
    req2.end();
  });
}

app.post('/api/script/generate', async (req, res) => {
  const topic = pickTopic(req.body);
  const style = pickStyle(req.body);

  try {
    // 尝试使用 Doubao Seed 2.0 Pro 模型生成剧本
    const doubaoResponse = await generateScriptWithDoubao(topic, style);
    
    // 解析 API 响应
    if (doubaoResponse && doubaoResponse.output && doubaoResponse.output[0] && doubaoResponse.output[0].content) {
      const scriptContent = doubaoResponse.output[0].content;
      
      // 这里可以添加更复杂的解析逻辑，从 AI 生成的内容中提取标题、logline 和场景
      // 为了演示，我们使用简化的逻辑
      const title = `《${topic}》${style}：四幕短剧`;
      const logline = `在“${topic}”的线索追逐中，角色们用误会点燃悬疑，用勇气完成反转。`;
      
      res.json({
        ok: true,
        title,
        logline,
        scenes: genScenes(topic, style),
        aiContent: scriptContent // 保留 AI 生成的原始内容
      });
    } else {
      // 如果 API 调用失败，使用备用逻辑
      const title = `《${topic}》${style}：四幕短剧`;
      const logline = `在“${topic}”的线索追逐中，角色们用误会点燃悬疑，用勇气完成反转。`;

      res.json({
        ok: true,
        title,
        logline,
        scenes: genScenes(topic, style),
      });
    }
  } catch (error) {
    console.error('Error generating script with Doubao:', error);
    // 如果 API 调用失败，使用备用逻辑
    const title = `《${topic}》${style}：四幕短剧`;
    const logline = `在“${topic}”的线索追逐中，角色们用误会点燃悬疑，用勇气完成反转。`;

    res.json({
      ok: true,
      title,
      logline,
      scenes: genScenes(topic, style),
    });
  }
});

app.post('/api/video/generate', (req, res) => {
  const body = req.body || {};
  const scenes = Array.isArray(body.scenes) ? body.scenes : [];
  const scriptTitle = typeof body.scriptTitle === 'string' ? body.scriptTitle : '未命名剧本';

  const base = scenes.length ? scenes : genScenes(pickTopic(body), pickStyle(body)).slice(0, 4);

  const storyboard = base.map((s, i) => ({
    shotIndex: i + 1,
    durationSec: 3 + (i % 2),
    camera: ['广角', '推近', '俯拍', '跟镜'][i] || '中景',
    visual: ` ${scriptTitle} 第 ${i + 1} 幕：${s.location}，情绪 ${s.emotion}，风格 ${s.style || '默认'}`,
    onScreenText: `第 ${i + 1} 幕：${s.emotion}`,
  }));

  res.json({
    ok: true,
    scriptTitle,
    storyboard,
  });
});

// 生成人物主体图和场景图
app.post('/api/video/generate-images', (req, res) => {
  const body = req.body || {};
  const scenesInput = Array.isArray(body.scenes) ? body.scenes : [];
  const scriptContent = typeof body.scriptContent === 'string' ? body.scriptContent : '';
  const scriptTitle = typeof body.scriptTitle === 'string' ? body.scriptTitle : '未命名剧本';
  const arkKey = process.env.ARK_API_KEY || '';
  if (!arkKey) {
    res.status(400).json({ ok: false, error: 'ARK_API_KEY 未配置' });
    return;
  }
  function arkGenerateImage(prompt, size) {
    return new Promise((resolve, reject) => {
      const data = JSON.stringify({
        model: 'doubao-seedream-5-0-260128',
        prompt,
        sequential_image_generation: 'disabled',
        response_format: 'url',
        size: size || '2K',
        stream: false,
        watermark: true
      });
      const options = {
        hostname: 'ark.cn-beijing.volces.com',
        port: 443,
        path: '/api/v3/images/generations',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${arkKey}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data)
        }
      };
      const req2 = https.request(options, (res2) => {
        let responseData = '';
        res2.on('data', (chunk) => { responseData += chunk; });
        res2.on('end', () => {
          try {
            const parsed = JSON.parse(responseData);
            let url = null;
            if (Array.isArray(parsed?.data) && parsed.data[0]?.url) url = parsed.data[0].url;
            if (!url && Array.isArray(parsed?.output) && parsed.output[0]?.url) url = parsed.output[0].url;
            if (!url && Array.isArray(parsed?.images) && parsed.images[0]?.url) url = parsed.images[0].url;
            if (!url) {
              const stack = JSON.stringify(parsed);
              reject(new Error(stack));
              return;
            }
            resolve(url);
          } catch (e) {
            reject(e);
          }
        });
      });
      req2.on('error', (err) => reject(err));
      req2.write(data);
      req2.end();
    });
  }
  const run = async () => {
    let charactersPlan = [];
    let scenesPlan = [];
    if (scriptContent && scriptContent.trim()) {
      try {
        const analyzed = await analyzeScriptToPrompts(scriptContent.trim());
        charactersPlan = Array.isArray(analyzed.characters) ? analyzed.characters : [];
        scenesPlan = Array.isArray(analyzed.scenes) ? analyzed.scenes : [];
      } catch {
        // fall back
      }
    }
    if (!scenesPlan.length) {
      const base = scenesInput.length ? scenesInput : genScenes(pickTopic(body), pickStyle(body)).slice(0, 4);
      scenesPlan = base.map((s) => ({
        location: s.location,
        emotion: s.emotion,
        prompt: `电影镜头，${s.location} 场景，${s.emotion} 情绪，真实材质细节，体积光，景深，高对比`
      }));
    }
    if (!charactersPlan.length) {
      charactersPlan = [
        { name: '主角A', description: '勇敢正直的年轻人', prompt: '电影质感人物肖像，青年主角，写实光影，清晰五官' },
        { name: '配角B', description: '神秘的角色', prompt: '电影质感人物肖像，神秘气质角色，戏剧化用光' }
      ];
    }
    const [characters, sceneImages] = await Promise.all([
      Promise.all(charactersPlan.map(async (c, idx) => {
        const url = await arkGenerateImage(c.prompt || '', '2K').catch(() => null);
        return { id: idx + 1, name: c.name || `角色${idx + 1}`, description: c.description || '', prompt: c.prompt || '', imageUrl: url };
      })),
      Promise.all(scenesPlan.map(async (s, idx) => {
        const url = await arkGenerateImage(s.prompt || `电影镜头，${s.location}`, '2K').catch(() => null);
        return {
          id: idx + 1,
          location: s.location || `场景${idx + 1}`,
          description: `场景：${s.location || ''}，情绪：${s.emotion || ''}`,
          prompt: s.prompt || '',
          imageUrl: url
        };
      }))
    ]);
    return { characters, scenes: sceneImages };
  };
  run()
    .then(({ characters, scenes }) => {
      res.json({ ok: true, scriptTitle, characters, scenes });
    })
    .catch((e) => {
      res.status(502).json({ ok: false, error: String(e && e.message ? e.message : e) });
    });
});

// 重新生成单张图片
app.post('/api/video/regenerate-image', (req, res) => {
  const body = req.body || {};
  const prompt = typeof body.prompt === 'string' ? body.prompt : '';
  const arkKey = process.env.ARK_API_KEY || '';
  
  if (!arkKey) {
    res.status(400).json({ ok: false, error: 'ARK_API_KEY 未配置' });
    return;
  }
  
  if (!prompt) {
    res.status(400).json({ ok: false, error: '缺少 prompt 参数' });
    return;
  }

  const data = JSON.stringify({
    model: 'doubao-seedream-5-0-260128',
    prompt,
    sequential_image_generation: 'disabled',
    response_format: 'url',
    size: '2K',
    stream: false,
    watermark: true
  });
  
  const options = {
    hostname: 'ark.cn-beijing.volces.com',
    port: 443,
    path: '/api/v3/images/generations',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${arkKey}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data)
    }
  };
  
  const req2 = https.request(options, (res2) => {
    let responseData = '';
    res2.on('data', (chunk) => { responseData += chunk; });
    res2.on('end', () => {
      try {
        const parsed = JSON.parse(responseData);
        let url = null;
        if (Array.isArray(parsed?.data) && parsed.data[0]?.url) url = parsed.data[0].url;
        if (!url && Array.isArray(parsed?.output) && parsed.output[0]?.url) url = parsed.output[0].url;
        if (!url && Array.isArray(parsed?.images) && parsed.images[0]?.url) url = parsed.images[0].url;
        
        if (!url) {
          return res.status(500).json({ ok: false, error: '生图接口未返回有效的 URL', raw: parsed });
        }
        res.json({ ok: true, imageUrl: url });
      } catch (e) {
        res.status(500).json({ ok: false, error: '解析外部接口响应失败' });
      }
    });
  });
  
  req2.on('error', (err) => {
    res.status(502).json({ ok: false, error: String(err && err.message ? err.message : err) });
  });
  
  req2.write(data);
  req2.end();
});

// 生成分镜提示词
app.post('/api/video/generate-storyboard', async (req, res) => {
  const body = req.body || {};
  const episodes = Array.isArray(body.episodes) ? body.episodes : [];
  const scriptContent = typeof body.scriptContent === 'string' ? body.scriptContent : '';
  const scenes = Array.isArray(body.scenes) ? body.scenes : [];
  const characters = Array.isArray(body.characters) ? body.characters : [];
  const approvedAssets = typeof body.approvedAssets === 'object' && body.approvedAssets !== null ? body.approvedAssets : {};
  const scriptTitle = typeof body.scriptTitle === 'string' ? body.scriptTitle : '未命名剧本';

  // 根据前端传入的 episodes 构建基础分镜信息
  let base = [];
  if (episodes.length > 0) {
    base = episodes.map((ep, idx) => ({
      index: idx + 1,
      title: ep.title,
      summary: ep.summary,
      script: ep.script,
      durationSec: ep.durationSec || 15
    }));
  } else if (scenes.length > 0) {
    base = scenes.map((s, idx) => ({
      index: idx + 1,
      title: s.location,
      summary: s.emotion,
      script: s.description || s.prompt || '',
      durationSec: 15
    }));
  } else {
    // 兜底逻辑
    base = genScenes(pickTopic(body), pickStyle(body)).slice(0, 4).map((s, i) => ({
      index: i + 1,
      title: s.location,
      summary: s.emotion,
      script: s.dialogue || '',
      durationSec: 15
    }));
  }

  // 辅助函数：替换提示词中的角色/场景名称为 @assetUri 格式
  const replaceWithAssets = (text) => {
    if (!text) return '';
    let result = text;
    // 遍历已审核通过的资产映射表
    Object.entries(approvedAssets).forEach(([name, assetUri]) => {
      // 简单字符串替换，实际可能需要更复杂的正则以避免部分匹配
      const regex = new RegExp(name, 'g');
      result = result.replace(regex, `${name} @${assetUri} `);
    });
    return result;
  };

  try {
    // 构建资产映射说明，告知大模型如何使用
    const assetInstructions = Object.keys(approvedAssets).length > 0 
      ? `\n\n【重要要求：资产绑定】
以下是已通过审核的资产（角色或场景）的 URI 映射：
${Object.entries(approvedAssets).map(([name, uri]) => `- ${name}: @${uri}`).join('\n')}
如果给定的文本中出现了上述资产（例如某个角色或在某个场景中），请将它们的名字替换为“名字 @对应的URI”。
例如：如果“张飞”在列表里对应 “@asset://123”，在生成替换内容时应该写成：“张飞 @asset://123”。` 
      : '';

    const systemPrompt = `你是一个提示词替换助手。
你的任务是根据提供的文本，将其中的指定实体名（角色名或场景名）替换为带有资产ID的格式，并返回替换的结果。
如果文本中不需要替换任何内容，请返回空对象 {}。
返回格式必须是合法的JSON对象，键为原文内容，值为替换后的内容，形如：{"原词": "原词 @assetUri"}。${assetInstructions}`;

    const arkApiKey = process.env.ARK_API_KEY || '';
    
    // 并发调用大模型，对每一集独立进行融合
    const storyboard = await Promise.all(base.map(async (s, i) => {
      let mergedScript = s.script || '';
      
      if (arkApiKey && Object.keys(approvedAssets).length > 0) {
        try {
          const userPrompt = `需要替换的文本：\n${s.script}\n\n请按要求输出 JSON 对象。`;
          const payload = {
            model: 'doubao-seed-2-0-pro-260215',
            input: [
              { role: 'system', content: [{ type: 'input_text', text: systemPrompt }] },
              { role: 'user', content: [{ type: 'input_text', text: userPrompt }] }
            ]
          };
          
          const options = {
            hostname: 'ark.cn-beijing.volces.com',
            port: 443,
            path: '/api/v3/responses',
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${arkApiKey}`,
              'Content-Type': 'application/json',
            }
          };
          
          const resObj = await new Promise((resolve, reject) => {
            const req2 = https.request(options, (res2) => {
              let responseData = '';
              res2.on('data', (chunk) => { responseData += chunk; });
              res2.on('end', () => {
                try { resolve(JSON.parse(responseData)); } catch (e) { reject(e); }
              });
            });
            req2.on('error', reject);
            req2.write(JSON.stringify(payload));
            req2.end();
          });
          
          let content = '';
          if (Array.isArray(resObj?.output)) {
            const messageObj = resObj.output.find(item => item.type === 'message' && item.role === 'assistant');
            if (messageObj && Array.isArray(messageObj.content)) {
              const textObj = messageObj.content.find(c => c.type === 'output_text');
              if (textObj) {
                content = textObj.text;
              }
            }
          }
          
          const start = content.indexOf('{');
          const end = content.lastIndexOf('}');
          if (start >= 0 && end > start) {
            const replaceMap = JSON.parse(content.slice(start, end + 1));
            // 将大模型返回的键值对替换到原文中
            Object.entries(replaceMap).forEach(([oldStr, newStr]) => {
              if (oldStr && newStr && typeof oldStr === 'string' && typeof newStr === 'string') {
                // 简单替换，注意处理可能的特殊字符，或者直接 replaceAll
                mergedScript = mergedScript.split(oldStr).join(newStr);
              }
            });
          }
        } catch (e) {
          console.error(`第 ${i+1} 集大模型融合失败，使用本地正则替换兜底`, e);
          mergedScript = replaceWithAssets(s.script);
        }
      } else {
        // 如果没有配置 api key 或者没有资产，直接使用本地正则替换
        mergedScript = replaceWithAssets(s.script);
      }
      
      const titlePrompt = replaceWithAssets(s.title);
      const summaryPrompt = replaceWithAssets(s.summary);
      
      return {
        shotIndex: i + 1,
        durationSec: s.durationSec || 15,
        visual: s.script || ` ${scriptTitle} 第 ${i + 1} 幕：${s.title}，${s.summary}`,
        prompt: mergedScript || `专业电影镜头，${titlePrompt}，${summaryPrompt}情绪，高清细节，电影级质感`,
        onScreenText: `第 ${i + 1} 幕：${s.title}`,
        // 新增前后帧连接配置开关，默认首尾分镜只开单边，中间分镜双开
        connectStart: i > 0, // 第一个分镜默认不连接前帧
        connectEnd: i < base.length - 1 // 最后一个分镜默认不连接后帧
      };
    }));

    res.json({
      ok: true,
      scriptTitle,
      storyboard
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: '生成分镜失败' });
  }
});

// 修改分镜提示词
app.post('/api/video/modify-storyboard', (req, res) => {
  const body = req.body || {};
  const storyboard = Array.isArray(body.storyboard) ? body.storyboard : [];
  const modifyCount = typeof body.modifyCount === 'number' ? body.modifyCount : 1;

  // 占位数据：修改分镜提示词
  const modifiedStoryboard = storyboard.map((shot, i) => ({
    ...shot,
    prompt: `修改版 ${modifyCount}：专业电影镜头，${shot.visual}，更具戏剧性，动态构图，光影效果`,
    camera: ['推近', '俯拍', '跟镜', '广角'][i] || '中景' // 轮换相机角度
  }));

  res.json({
    ok: true,
    storyboard: modifiedStoryboard,
    modifyCount
  });
});

// 生成完整视频
app.post('/api/video/generate-video', (req, res) => {
  const body = req.body || {};
  const storyboard = Array.isArray(body.storyboard) ? body.storyboard : [];
  const scriptTitle = typeof body.scriptTitle === 'string' ? body.scriptTitle : '未命名剧本';
  const baseUrl = process.env.VIDEO_API_BASE || 'https://autos.zhijiucity.com:51012';
  const token = process.env.VIDEO_API_TOKEN || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJlYjMxNGVhMC02ZjgxLTRhNzQtOWU1NC1kZGY2MDg1ZjUxMmEiLCJlbWFpbCI6ImNtakBvdXRvcy5jbiIsInJvbGUiOiJWSUVXRVIiLCJvcmdJZCI6ImRjMGZjYjA2LTUwNjgtNGQ0OC1iMDExLTQ5MDA3OWQzY2M2MCIsInR5cGUiOiJhY2Nlc3MiLCJzdmMiOnRydWUsImV4cCI6MTc3Njc5NTg5MSwiaWF0IjoxNzc0MjAzODkxfQ.9geLY-xl27KNIA-2VugfBMRUhTgQcEv-90AR9QwdL8M';
  const sessionId = process.env.VIDEO_API_SESSION_ID || '64cb2336-f3fe-4ecf-a19d-23d61122fdd0';
  if (!token) {
    res.status(400).json({ ok: false, error: 'VIDEO_API_TOKEN 未配置' });
    return;
  }
  
  // 测试：只取前2个分镜来生成视频，避免接口压力过大或一次性生成过长视频导致失败
  const testStoryboard = storyboard.slice(0, 2);
  
  if (testStoryboard.length === 0) {
    return res.status(400).json({ ok: false, error: '没有提供任何分镜内容' });
  }

  // 并行调用生成视频接口
  const tasks = testStoryboard.map((s, i) => {
    return new Promise((resolve, reject) => {
      const content = `第${i + 1}段：${s.prompt || s.visual || ''}`;
      
      // 解析 content 中的素材引用
      const images = [];
      const assetMatches = content.match(/@asset:\/\/([a-zA-Z0-9-_]+)/g);
      if (assetMatches) {
        assetMatches.forEach(match => {
          images.push(match.replace('@', '')); // 移除 @ 符号，保留 asset://...
        });
      }

      const payload = {
        content,
        modelId: 'doubao-seedance-2-0',
        modelType: 'VIDEO',
        ...(images.length > 0 && { images }),
        params: {
          videoMode: 'universal-ref',
          videoDuration: 3,
          resolution: '720p',
          aspectRatio: '16:9',
          audio: true
        }
      };
      
      const url = new URL(baseUrl);
      const options = {
        hostname: url.hostname,
        port: url.port ? Number(url.port) : 443,
        path: `/api/playground/sessions/${sessionId}/messages`,
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      };

      const req2 = https.request(options, (res2) => {
        let responseData = '';
        res2.on('data', (chunk) => { responseData += chunk; });
        res2.on('end', () => {
          try {
            const parsed = JSON.parse(responseData);
            resolve(parsed);
          } catch (e) {
            resolve({ ok: false, error: '解析外部接口响应失败' });
          }
        });
      });

      req2.on('error', (err) => {
        resolve({ ok: false, error: String(err && err.message ? err.message : err) });
      });

      req2.write(JSON.stringify(payload));
      req2.end();
    });
  });

  Promise.all(tasks)
    .then(results => {
      // 检查是否有任何一个任务失败
      const failedResult = results.find(r => r.ok === false || r.status === 'failed');
      if (failedResult) {
         return res.status(500).json({ ok: false, error: failedResult.error || '部分视频生成任务失败' });
      }
      
      // 保存到数据库
      const validResults = results.filter(r => r && r.userMessage && r.userMessage.id);
      if (validResults.length > 0) {
        const { getClient } = require('./db');
        getClient().then(async (client) => {
          for (const r of validResults) {
            const videoUrl = r.userMessage.mediaUrl || '';
            const coverImageUrl = r.userMessage.thumbnailUrl || '';
            const id = r.userMessage.id;
            const prompt = r.userMessage.content || 'AI生成的视频';
            const taskId = r.taskId || '';

            try {
              const existing = await client.execute({
                sql: 'SELECT id FROM generated_videos WHERE id = ?',
                args: [id]
              });

              if (existing.rows.length === 0) {
                await client.execute({
                  sql: 'INSERT INTO generated_videos (id, task_id, prompt, video_url, cover_image_url) VALUES (?, ?, ?, ?, ?)',
                  args: [id, taskId, prompt, videoUrl, coverImageUrl]
                });
              }
            } catch (err) {
              console.error('保存视频到数据库失败:', err);
            }
          }
        }).catch(err => {
          console.error('获取数据库客户端失败:', err);
        });
      }
      
      // 返回所有的结果列表
      res.json({
        ok: true,
        results: results
      });
    })
    .catch(err => {
      res.status(500).json({ ok: false, error: '批量生成视频失败' });
    });
});

// 提升视频清晰度
app.post('/api/video/enhance', (req, res) => {
  const body = req.body || {};
  const videoId = typeof body.videoId === 'string' ? body.videoId : '';

  // 占位数据：提升视频清晰度
  const enhancedVideo = {
    id: videoId || Date.now().toString(),
    title: '高清版 - 短视频',
    duration: 15,
    resolution: '4K',
    status: 'enhanced',
    videoUrl: 'https://example.com/video-enhanced.mp4',
    enhanced: true,
    voiceover: false
  };

  res.json({
    ok: true,
    ...enhancedVideo
  });
});

app.post('/api/video/detect-prompt', async (req, res) => {
  const prompt = req.body.prompt || '';
  if (!prompt.trim()) {
    return res.json({ ok: true, result: { words: [], suggestion: '提示词为空' } });
  }

  const arkApiKey = process.env.ARK_API_KEY || '';
  if (!arkApiKey) {
    return res.status(400).json({ ok: false, error: 'ARK_API_KEY 未配置' });
  }

  const systemPrompt = `你是一个视频生成提示词审核助手。
请分析用户提供的提示词，找出其中可能导致视频生成平台报错的词语。视频平台通常对以下几类内容非常严格：
1. 政治敏感
2. 色情/低俗/擦边
3. 血腥/暴力/恐怖/惊悚
4. 知名IP/版权人物/真实公众人物（如明星、政客、动漫角色等）

如果提示词中包含明显的违禁词，请将它们列出。
如果提示词中**没有明显违禁词，但视频生成依然失败了**，请你发挥想象力，挑选出提示词中**最有可能**被机器误判为违禁的 1~3 个词语（比如带有攻击性色彩的动词、可能涉及版权的普通名词、或者可能引申为暴力的形容词）。

返回格式必须是 JSON 对象，格式为: {"words": ["词语1", "词语2"], "suggestion": "修改建议"}。
必须保证 words 数组里至少有 1 个词语。
不要输出任何其他解释文字。`;

  const data = JSON.stringify({
    model: 'doubao-seed-2-0-pro-260215',
    input: [
      { role: 'system', content: [{ type: 'input_text', text: systemPrompt }] },
      { role: 'user', content: [{ type: 'input_text', text: prompt }] }
    ]
  });

  const options = {
    hostname: 'ark.cn-beijing.volces.com',
    port: 443,
    path: '/api/v3/responses',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${arkApiKey}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data)
    }
  };

  const req2 = https.request(options, (res2) => {
    let responseData = '';
    res2.on('data', (chunk) => { responseData += chunk; });
    res2.on('end', () => {
      try {
        const parsed = JSON.parse(responseData);
        let content = '';
        if (Array.isArray(parsed?.output)) {
          const messageObj = parsed.output.find(item => item.type === 'message' && item.role === 'assistant');
          if (messageObj && Array.isArray(messageObj.content)) {
            const textObj = messageObj.content.find(c => c.type === 'output_text');
            if (textObj) {
              content = textObj.text;
            }
          }
        }
        
        const start = content.indexOf('{');
        const end = content.lastIndexOf('}');
        if (start >= 0 && end > start) {
          const result = JSON.parse(content.slice(start, end + 1));
          res.json({ ok: true, result });
        } else {
          res.json({ ok: true, result: { words: [], suggestion: '未检测到违禁词' } });
        }
      } catch (e) {
        console.error('检测违禁词解析失败:', e);
        res.status(500).json({ ok: false, error: '检测失败' });
      }
    });
  });

  req2.on('error', (err) => {
    console.error('检测违禁词请求失败:', err);
    res.status(502).json({ ok: false, error: '请求大模型失败' });
  });

  req2.write(data);
  req2.end();
});

// 为视频配音
app.post('/api/video/add-voiceover', (req, res) => {
  const body = req.body || {};
  const videoId = typeof body.videoId === 'string' ? body.videoId : '';

  // 占位数据：为视频配音
  const voiceoverVideo = {
    id: videoId || Date.now().toString(),
    title: '带配音 - 短视频',
    duration: 15,
    resolution: '1080p',
    status: 'voiceover-added',
    videoUrl: 'https://example.com/video-with-voiceover.mp4',
    enhanced: false,
    voiceover: true,
    voiceoverLanguage: '中文',
    voiceoverStyle: '专业旁白'
  };

  res.json({
    ok: true,
    ...voiceoverVideo
  });
});

app.get('/api/video/tasks/:taskId', (req, res) => {
  const baseUrl = process.env.VIDEO_API_BASE || 'https://autos.zhijiucity.com:51012';
  const token = process.env.VIDEO_API_TOKEN || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJlYjMxNGVhMC02ZjgxLTRhNzQtOWU1NC1kZGY2MDg1ZjUxMmEiLCJlbWFpbCI6ImNtakBvdXRvcy5jbiIsInJvbGUiOiJWSUVXRVIiLCJvcmdJZCI6ImRjMGZjYjA2LTUwNjgtNGQ0OC1iMDExLTQ5MDA3OWQzY2M2MCIsInR5cGUiOiJhY2Nlc3MiLCJzdmMiOnRydWUsImV4cCI6MTc3Njc5NTg5MSwiaWF0IjoxNzc0MjAzODkxfQ.9geLY-xl27KNIA-2VugfBMRUhTgQcEv-90AR9QwdL8M';
  const taskId = req.params.taskId;
  if (!token) {
    res.status(400).json({ ok: false, error: 'VIDEO_API_TOKEN 未配置' });
    return;
  }
  const url = new URL(baseUrl);
  const options = {
    hostname: url.hostname,
    port: url.port ? Number(url.port) : 443,
    path: `/api/playground/tasks/${encodeURIComponent(taskId)}`,
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  };
  const req2 = https.request(options, (res2) => {
    let responseData = '';
    res2.on('data', (chunk) => { responseData += chunk; });
    res2.on('end', () => {
      try {
        const parsed = JSON.parse(responseData);
        // 如果后端接口直接返回了结果，且状态为 completed
        // 直接在这个接口里也带上结果信息，方便前端
        if (parsed.status === 'completed' && parsed.userMessage) {
          parsed.latest = parsed.userMessage;
        } else if (parsed.status === 'completed' && parsed.mediaUrl) {
          parsed.latest = { mediaUrl: parsed.mediaUrl, thumbnailUrl: parsed.thumbnailUrl };
        }
        res.json(parsed);
      } catch (e) {
        res.status(500).json({ ok: false, error: '解析外部接口响应失败' });
      }
    });
  });
  req2.on('error', (err) => {
    res.status(502).json({ ok: false, error: String(err && err.message ? err.message : err) });
  });
  req2.end();
});

// 按 taskId 获取视频生成结果
app.get('/api/video/messages/:taskId', (req, res) => {
  const baseUrl = process.env.VIDEO_API_BASE || 'https://autos.zhijiucity.com:51012';
  const token = process.env.VIDEO_API_TOKEN || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJlYjMxNGVhMC02ZjgxLTRhNzQtOWU1NC1kZGY2MDg1ZjUxMmEiLCJlbWFpbCI6ImNtakBvdXRvcy5jbiIsInJvbGUiOiJWSUVXRVIiLCJvcmdJZCI6ImRjMGZjYjA2LTUwNjgtNGQ0OC1iMDExLTQ5MDA3OWQzY2M2MCIsInR5cGUiOiJhY2Nlc3MiLCJzdmMiOnRydWUsImV4cCI6MTc3Njc5NTg5MSwiaWF0IjoxNzc0MjAzODkxfQ.9geLY-xl27KNIA-2VugfBMRUhTgQcEv-90AR9QwdL8M';
  const taskId = req.params.taskId;
  
  if (!token) {
    res.status(400).json({ ok: false, error: 'VIDEO_API_TOKEN 未配置' });
    return;
  }
  
  if (!taskId || taskId === 'undefined') {
    res.status(400).json({ ok: false, error: '缺少 taskId' });
    return;
  }
  
  const url = new URL(baseUrl);
  const options = {
    hostname: url.hostname,
    port: url.port ? Number(url.port) : 443,
    path: `/api/playground/tasks/${encodeURIComponent(taskId)}/result`,
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  };
  
  const req2 = https.request(options, (res2) => {
    let responseData = '';
    res2.on('data', (chunk) => { responseData += chunk; });
    res2.on('end', async () => {
      try {
        const parsed = JSON.parse(responseData);
        const latest = parsed;

        // 如果生成成功了，我们将其持久化到数据库
        if (latest && latest.status === 'completed' && latest.mediaUrl) {
          const videoUrl = latest.mediaUrl;
          const coverImageUrl = latest.thumbnailUrl || '';
          const id = latest.taskId;
          
          // 在没有上下文的情况下，使用一个默认 prompt，因为新接口不带 user message
          const prompt = 'AI生成的视频';

          if (videoUrl && id) {
            const { getClient } = require('./db');
            const client = await getClient();
            
            // 检查是否已经存过
            const existing = await client.execute({
              sql: 'SELECT id FROM generated_videos WHERE id = ?',
              args: [id]
            });

            if (existing.rows.length === 0) {
              await client.execute({
                sql: 'INSERT INTO generated_videos (id, prompt, video_url, cover_image_url) VALUES (?, ?, ?, ?)',
                args: [id, prompt, videoUrl, coverImageUrl]
              });
            }
          }
        }

        res.json({ ok: true, latest });
      } catch (e) {
        console.error('获取或保存视频失败:', e);
        res.status(500).json({ ok: false, error: '解析外部接口响应失败' });
      }
    });
  });
  req2.on('error', (err) => {
    res.status(502).json({ ok: false, error: String(err && err.message ? err.message : err) });
  });
  req2.end();
});

// 获取生成的视频列表
app.get('/api/video/list', async (req, res) => {
  try {
    const client = await getClient();
    const result = await client.execute('SELECT * FROM generated_videos ORDER BY created_at DESC');
    res.json({ ok: true, data: result.rows });
  } catch (error) {
    console.error('获取视频列表失败:', error);
    res.status(500).json({ ok: false, error: '获取视频列表失败' });
  }
});

// 审核/提交生成视频图像
app.post('/api/video/approve-image', async (req, res) => {
  const body = req.body || {};
  const imageUrl = typeof body.imageUrl === 'string' ? body.imageUrl : '';
  const prompt = typeof body.prompt === 'string' ? body.prompt : '镜头推进，角色转身';
  const baseUrl = process.env.VIDEO_API_BASE || 'https://autos.zhijiucity.com:51012';
  const token = process.env.VIDEO_API_TOKEN || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJlYjMxNGVhMC02ZjgxLTRhNzQtOWU1NC1kZGY2MDg1ZjUxMmEiLCJlbWFpbCI6ImNtakBvdXRvcy5jbiIsInJvbGUiOiJWSUVXRVIiLCJvcmdJZCI6ImRjMGZjYjA2LTUwNjgtNGQ0OC1iMDExLTQ5MDA3OWQzY2M2MCIsInR5cGUiOiJhY2Nlc3MiLCJzdmMiOnRydWUsImV4cCI6MTc3Njc5NTg5MSwiaWF0IjoxNzc0MjAzODkxfQ.9geLY-xl27KNIA-2VugfBMRUhTgQcEv-90AR9QwdL8M';
  const sessionId = process.env.VIDEO_API_SESSION_ID || '64cb2336-f3fe-4ecf-a19d-23d61122fdd0';

  if (!imageUrl) {
    return res.status(400).json({ ok: false, error: '缺少 imageUrl' });
  }

  try {
    // 1. 获取图片并转为 base64
    const fetchImage = (url) => {
      return new Promise((resolve, reject) => {
        const lib = url.startsWith('https') ? https : require('http');
        lib.get(url, (res) => {
          const data = [];
          res.on('data', (chunk) => data.push(chunk));
          res.on('end', () => resolve(Buffer.concat(data)));
        }).on('error', reject);
      });
    };
    
    const imgBuffer = await fetchImage(imageUrl);
    const base64Data = imgBuffer.toString('base64');

    // 封装通用请求
    const requestApi = (method, path, payload) => {
      return new Promise((resolve, reject) => {
        const u = new URL(baseUrl);
        const options = {
          hostname: u.hostname,
          port: u.port ? Number(u.port) : 443,
          path,
          method,
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        };
        const req2 = https.request(options, (res2) => {
          let responseData = '';
          res2.on('data', (chunk) => { responseData += chunk; });
          res2.on('end', () => {
            try { resolve(JSON.parse(responseData)); }
            catch (e) { reject(e); }
          });
        });
        req2.on('error', reject);
        if (payload) req2.write(JSON.stringify(payload));
        req2.end();
      });
    };

    // 2. 上传到私域素材库
    const uploadRes = await requestApi('POST', '/api/assets/private-domain/assets', {
      filename: 'approve-image.png',
      data: base64Data,
      name: body.name || '审核图像' // 将角色的名字或场景的名字传给素材库
    });
    
    const assetId = uploadRes?.asset?.id;
    let assetUri = uploadRes?.asset?.assetUri;
    
    if (!assetId && !assetUri) {
      throw new Error('素材上传失败');
    }

    // 3. 轮询直到 active
    if (!assetUri) {
      for (let i = 0; i < 15; i++) {
        await new Promise(r => setTimeout(r, 3000));
        const statusRes = await requestApi('GET', '/api/assets/private-domain/assets');
        const asset = (statusRes?.assets || []).find(a => a.id === assetId);
        if (asset && asset.status === 'active') {
          assetUri = asset.assetUri;
          break;
        } else if (asset && asset.status === 'failed') {
          throw new Error('素材入库失败');
        }
      }
    }

    if (!assetUri) throw new Error('获取素材 URI 超时');

    // 4. 提交视频生成 (img2video)
    const submitRes = await requestApi('POST', `/api/playground/sessions/${sessionId}/messages`, {
      content: prompt,
      modelId: 'doubao-seedance-2-0',
      modelType: 'VIDEO',
      images: [assetUri],
      params: {
        videoMode: 'img2video',
        videoDuration: 5,
        resolution: '720p',
        aspectRatio: '16:9'
      }
    });

    if (submitRes?.taskId) {
      res.json({ ok: true, taskId: submitRes.taskId, assetUri });
    } else {
      throw new Error('生成任务创建失败');
    }
  } catch (err) {
    console.error('Approve image error:', err);
    res.status(500).json({ ok: false, error: err.message || '审核失败' });
  }
});

// 获取私域素材库列表
app.get('/api/assets/private-domain', (req, res) => {
  const baseUrl = process.env.VIDEO_API_BASE || 'https://autos.zhijiucity.com:51012';
  const token = process.env.VIDEO_API_TOKEN || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJlYjMxNGVhMC02ZjgxLTRhNzQtOWU1NC1kZGY2MDg1ZjUxMmEiLCJlbWFpbCI6ImNtakBvdXRvcy5jbiIsInJvbGUiOiJWSUVXRVIiLCJvcmdJZCI6ImRjMGZjYjA2LTUwNjgtNGQ0OC1iMDExLTQ5MDA3OWQzY2M2MCIsInR5cGUiOiJhY2Nlc3MiLCJzdmMiOnRydWUsImV4cCI6MTc3Njc5NTg5MSwiaWF0IjoxNzc0MjAzODkxfQ.9geLY-xl27KNIA-2VugfBMRUhTgQcEv-90AR9QwdL8M';
  
  if (!token) {
    res.status(400).json({ ok: false, error: 'VIDEO_API_TOKEN 未配置' });
    return;
  }
  
  const url = new URL(baseUrl);
  const options = {
    hostname: url.hostname,
    port: url.port ? Number(url.port) : 443,
    path: '/api/assets/private-domain/assets',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  };
  
  const req2 = https.request(options, (res2) => {
    let responseData = '';
    res2.on('data', (chunk) => { responseData += chunk; });
    res2.on('end', () => {
      try {
        const parsed = JSON.parse(responseData);
        res.json({ ok: true, assets: parsed.assets || [] });
      } catch (e) {
        res.status(500).json({ ok: false, error: '解析外部接口响应失败' });
      }
    });
  });
  req2.on('error', (err) => {
    res.status(502).json({ ok: false, error: String(err && err.message ? err.message : err) });
  });
  req2.end();
});

app.post('/api/music/generate', (req, res) => {
  const body = req.body || {};
  const mood = typeof body.mood === 'string' && body.mood.trim() ? body.mood.trim() : '悬疑、节奏明确';

  const tempo = typeof body.tempo === 'number' ? body.tempo : 112;
  const tracks = [
    { name: '主旋律', kind: 'melody', vibe: mood, tempo },
    { name: '氛围垫底', kind: 'pad', vibe: '低频氛围 + 轻微脉冲', tempo },
    { name: '节奏鼓组', kind: 'drums', vibe: '短促切分，制造推进感', tempo: tempo + 4 },
  ];

  res.json({
    ok: true,
    mood,
    tempo,
    tracks,
  });
});

app.post('/api/edit/generate', (req, res) => {
  const body = req.body || {};
  const storyboard = Array.isArray(body.storyboard) ? body.storyboard : [];
  const tracks = Array.isArray(body.tracks) ? body.tracks : [];

  const timeline = (storyboard.length ? storyboard : Array.from({ length: 4 }).map((_, i) => ({
    shotIndex: i + 1,
    durationSec: 4,
  }))).map((s, i) => ({
    segmentIndex: i + 1,
    startSec: storyboard?.length
      ? storyboard.slice(0, i).reduce((sum, x) => sum + (x.durationSec || 0), 0)
      : i * 4,
    durationSec: s.durationSec || 4,
    cuts: [
      { t: (s.durationSec || 4) * 0.2, type: '转场' },
      { t: (s.durationSec || 4) * 0.6, type: '节奏点' },
    ],
    audio: tracks.length ? { selectedTracks: tracks.map((t) => t.name) } : { selectedTracks: ['主旋律'] },
    captions: `字幕：第 ${s.shotIndex} 段（占位）`,
  }));

  res.json({
    ok: true,
    timeline,
  });
});

// 兜底错误处理
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  // eslint-disable-next-line no-console
  console.error(err);
  res.status(500).json({ ok: false, error: 'Internal Server Error' });
});

const port = Number(process.env.PORT || 3002);
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`[backend] listening on http://localhost:${port}`);
});
