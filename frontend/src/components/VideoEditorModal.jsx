import React, { useEffect, useMemo, useState } from 'react';
import Modal from './Modal.jsx';
import Button from './Button.jsx';
import Input from './Input.jsx';

export default function VideoEditorModal({ open, onClose, episode, characters = [], scenes = [], storyboard = [], onSave }) {
  const [title, setTitle] = useState('');
  const [outline, setOutline] = useState('');
  const [shots, setShots] = useState([]);
  const timeline = useMemo(() => {
    const count = Math.max(6, Math.min(12, storyboard?.length || 8));
    return Array.from({ length: count }).map((_, i) => ({
      id: `${episode?.id || 'ep'}-shot-${i + 1}`,
      t: i,
      thumb: `https://picsum.photos/seed/shot-${i + 1}/320/180`,
      dur: 10 + (i % 5),
    }));
  }, [episode, storyboard]);
  useEffect(() => {
    setTitle(episode?.title || '');
    const base = storyboard?.map((s, i) => `第${i + 1}段 ${s.visual || ''}`).join('\n') || '';
    setOutline(base || '片段描述可在此编辑，保存后用于指导再次生成与剪辑。');
    setShots(timeline);
  }, [episode, storyboard, timeline]);
  const footer = (
    <div className="flex justify-between w-full">
      <div className="text-sm text-muted-foreground">最长不超过 100 秒，以竖版优先</div>
      <div className="flex gap-3">
        <Button variant="secondary" onClick={onClose}>取消</Button>
        <Button onClick={() => onSave && onSave({ ...episode, title, outline })}>保存</Button>
      </div>
    </div>
  );
  return (
    <Modal open={open} onClose={onClose} title={title || '编辑视频'} footer={footer} className="max-w-7xl w-[92vw]">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-3 space-y-4">
          <div className="border border-border rounded-2xl p-4">
            <div className="font-medium mb-3">资产库</div>
            <div className="text-xs text-muted-foreground mb-2">角色</div>
            <div className="grid grid-cols-2 gap-3">
              {characters.slice(0, 6).map((c) => (
                <div key={`char-lib-${c.id}`} className="flex items-center gap-2 p-2 rounded-lg border border-border">
                  <img src={c.imageUrl} alt={c.name} className="w-10 h-10 rounded-md object-cover border border-border" />
                  <div className="text-xs">{c.name}</div>
                </div>
              ))}
            </div>
            <div className="text-xs text-muted-foreground mt-4 mb-2">场景</div>
            <div className="grid grid-cols-2 gap-3">
              {scenes.slice(0, 4).map((s) => (
                <div key={`scene-lib-${s.id}`} className="flex items-center gap-2 p-2 rounded-lg border border-border">
                  <img src={s.imageUrl} alt={s.location} className="w-10 h-10 rounded-md object-cover border border-border" />
                  <div className="text-xs">{s.location}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="md:col-span-5 space-y-4">
          <div className="border border-border rounded-2xl p-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">标题</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-2 mt-4">
              <label className="text-sm font-medium">片段描述</label>
              <textarea value={outline} onChange={(e) => setOutline(e.target.value)} className="w-full min-h-64 rounded-2xl border border-border bg-background px-3 py-3 text-sm" />
            </div>
            <div className="flex justify-end mt-3">
              <Button size="small" variant="outline">生成镜头</Button>
            </div>
          </div>
        </div>
        <div className="md:col-span-4 space-y-4">
          <div className="border border-border rounded-2xl p-4">
            <div className="rounded-xl overflow-hidden border border-border">
              <video src={episode?.videoUrl} controls className="w-full rounded-md" />
            </div>
          </div>
        </div>
      </div>
      <div className="mt-6 border border-border rounded-2xl p-4">
        <div className="text-sm text-muted-foreground mb-3">时间线</div>
        <div className="flex gap-3 overflow-x-auto">
          {shots.map((s, idx) => (
            <div key={s.id} className="relative w-40 flex-shrink-0 p-2 border border-border rounded-xl bg-card">
              <div className="text-xs text-muted-foreground mb-1">00:{String(idx).padStart(2, '0')}</div>
              <div className="relative h-24 rounded-lg overflow-hidden border border-border">
                <img src={s.thumb} alt="" className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/70 text-white text-[10px]">{s.dur}s</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}
