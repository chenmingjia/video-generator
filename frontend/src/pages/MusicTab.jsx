import React, { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import ResultBox from '../components/ResultBox.jsx';
import Button from '../components/Button.jsx';
import Input from '../components/Input.jsx';

export default function MusicTab({ script, initialMusicPlan, onGenerated }) {
  const [mood, setMood] = useState('悬疑、节奏明确');
  const [tempo, setTempo] = useState(112);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(initialMusicPlan || null);

  useEffect(() => {
    setResult(initialMusicPlan || null);
  }, [initialMusicPlan]);

  async function handleGenerate() {
    setError('');
    setLoading(true);
    try {
      const payload = {
        mood: mood.trim() ? mood.trim() : undefined,
        tempo: Number.isFinite(Number(tempo)) ? Number(tempo) : undefined,
      };
      const { data } = await api.post('/music/generate', payload);
      setResult(data);
      onGenerated?.(data);
    } catch (e) {
      setError(e?.response?.data?.error || e.message || '生成失败');
    } finally {
      setLoading(false);
    }
  }

  const canGenerate = Boolean(script);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="block text-sm font-medium">情绪/风格</label>
          <Input
            type="text"
            value={mood}
            onChange={(e) => setMood(e.target.value)}
            placeholder="比如：温柔、治愈"
            className="bg-background border-border focus:ring-primary"
          />
          <p className="text-xs text-muted-foreground">
            占位逻辑：后端会根据情绪生成 tracks（示例数据）。
          </p>
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium">Tempo（BPM）</label>
          <Input
            type="number"
            value={tempo}
            onChange={(e) => setTempo(e.target.value)}
            className="bg-background border-border focus:ring-primary"
          />
          <p className="text-xs text-muted-foreground">
            默认 112 BPM。你也可以不改。
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <Button 
          onClick={handleGenerate} 
          disabled={!canGenerate || loading}
          size="large"
          className="w-full md:w-auto"
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="loading-spinner"></div>
              <span>生成中...</span>
            </div>
          ) : '生成音乐计划'}
        </Button>
        {error ? (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg">
            {error}
          </div>
        ) : (
          <div className="bg-secondary/50 px-4 py-3 rounded-lg text-sm text-muted-foreground">
            {canGenerate ? '生成后会得到 mood/tempo/tracks（占位）。' : '请先在“AI 编剧”生成剧本。'}
          </div>
        )}
      </div>

      {result ? <ResultBox title="生成结果（音乐计划）" value={result} /> : null}
    </div>
  );
}