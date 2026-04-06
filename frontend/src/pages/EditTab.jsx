import React, { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import ResultBox from '../components/ResultBox.jsx';
import Button from '../components/Button.jsx';

export default function EditTab({ videoPlan, musicPlan, initialEditPlan, onGenerated }) {
  const [result, setResult] = useState(initialEditPlan || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setResult(initialEditPlan || null);
  }, [initialEditPlan]);

  async function handleGenerate() {
    setError('');
    setLoading(true);
    try {
      const payload = {
        storyboard: videoPlan?.storyboard || [],
        tracks: musicPlan?.tracks || [],
      };
      const { data } = await api.post('/edit/generate', payload);
      setResult(data);
      onGenerated?.(data);
    } catch (e) {
      setError(e?.response?.data?.error || e.message || '生成失败');
    } finally {
      setLoading(false);
    }
  }

  const canGenerate =
    Boolean(videoPlan && Array.isArray(videoPlan.storyboard) && videoPlan.storyboard.length) &&
    Boolean(musicPlan && Array.isArray(musicPlan.tracks) && musicPlan.tracks.length);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="block text-sm font-medium">输入检查</label>
          <div className={`px-4 py-3 rounded-lg ${videoPlan?.storyboard?.length ? 'bg-primary/10 border border-primary/20 text-primary' : 'bg-destructive/10 border border-destructive/20 text-destructive'}`}>
            {videoPlan?.storyboard?.length ? `已获取 storyboard（${videoPlan.storyboard.length} 段）` : '缺少 storyboard：请先生成“AI 短视频生成”。'}
          </div>
          <div className={`px-4 py-3 rounded-lg ${musicPlan?.tracks?.length ? 'bg-primary/10 border border-primary/20 text-primary' : 'bg-destructive/10 border border-destructive/20 text-destructive'}`}>
            {musicPlan?.tracks?.length ? `已获取 tracks（${musicPlan.tracks.length} 条）` : '缺少 tracks：请先生成“AI 音乐”。'}
          </div>
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium">剪辑目标</label>
          <div className="bg-secondary/50 border border-border rounded-lg px-4 py-3">
            <p className="text-sm text-muted-foreground">
              占位逻辑：后端会根据 storyboard 的每段时长生成 cuts + 字幕占位，并把音乐 tracks 关联到时间线上。
            </p>
          </div>
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
          ) : '生成剪辑计划'}
        </Button>
        {error ? (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg">
            {error}
          </div>
        ) : (
          <div className="bg-secondary/50 px-4 py-3 rounded-lg text-sm text-muted-foreground">
            生成结果将包含 timeline（片段开始/时长、转场与字幕占位）。
          </div>
        )}
      </div>

      {result ? <ResultBox title="生成结果（剪辑时间线）" value={result} /> : null}
    </div>
  );
}