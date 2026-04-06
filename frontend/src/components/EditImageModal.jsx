import React, { useEffect, useState } from 'react';
import Modal from './Modal.jsx';
import Button from './Button.jsx';
import Input from './Input.jsx';

export default function EditImageModal({ open, onClose, item, type, onSave, onRegenerate }) {
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [emotion, setEmotion] = useState('');
  const [description, setDescription] = useState('');
  const [prompt, setPrompt] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [regenLoading, setRegenLoading] = useState(false);

  useEffect(() => {
    if (!item) return;
    setName(item.name || '');
    setLocation(item.location || '');
    setEmotion(item.emotion || '');
    setDescription(item.description || '');
    setPrompt(item.prompt || '');
    setImageUrl(item.imageUrl || '');
  }, [item]);

  const footer = (
    <div className="flex justify-end gap-3">
      <Button variant="secondary" onClick={onClose}>取消</Button>
      <Button
        onClick={async () => {
          setSaving(true);
          await onSave({
            ...item,
            name,
            location,
            emotion,
            description,
            prompt,
            imageUrl
          });
          setSaving(false);
        }}
        disabled={saving}
      >
        {saving ? '保存中...' : '保存'}
      </Button>
    </div>
  );

  return (
    <Modal open={open} onClose={onClose} title={type === 'character' ? '编辑形象' : '编辑场景'} footer={footer}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          {type === 'character' ? (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">形象名称</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="输入名称" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">形象描述</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full rounded-2xl border border-border bg-background px-3 py-3 text-sm min-h-36" />
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">场景地点</label>
                  <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="如：雨夜巷口" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">情绪</label>
                  <Input value={emotion} onChange={(e) => setEmotion(e.target.value)} placeholder="如：紧张" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">场景描述</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full rounded-2xl border border-border bg-background px-3 py-3 text-sm min-h-36" />
              </div>
            </>
          )}
          <div className="space-y-2">
            <label className="text-sm font-medium">提示词</label>
            <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} className="w-full rounded-2xl border border-border bg-background px-3 py-3 text-sm min-h-32" />
          </div>
          <div>
            <Button
              variant="outline"
              onClick={async () => {
                setRegenLoading(true);
                const next = await onRegenerate({ ...item, name, location, emotion, description, prompt }).catch(() => null);
                if (next?.imageUrl) setImageUrl(next.imageUrl);
                setRegenLoading(false);
              }}
              disabled={regenLoading}
            >
              {regenLoading ? '生成中...' : '重新生成'}
            </Button>
          </div>
        </div>
        <div className="flex items-center justify-center">
          <img src={imageUrl} alt="预览" className="max-h-[520px] rounded-xl border border-border object-contain" />
        </div>
      </div>
    </Modal>
  );
}
