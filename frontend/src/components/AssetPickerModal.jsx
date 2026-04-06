import React, { useMemo, useState } from 'react';
import Modal from './Modal.jsx';
import Button from './Button.jsx';

export default function AssetPickerModal({ open, onClose, onPick, scenes = [], characters = [], defaultTab = 'scene' }) {
  const [tab, setTab] = useState(defaultTab);
  const data = useMemo(() => (tab === 'scene' ? scenes : characters), [tab, scenes, characters]);
  const title = tab === 'scene' ? '选择场景插入' : '选择人物插入';
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={(
        <div className="flex justify-between w-full">
          <div className="text-sm text-muted-foreground">按 Enter 插入，Esc 关闭</div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>关闭</Button>
          </div>
        </div>
      )}
      className="max-w-5xl w-[92vw]"
    >
      <div className="flex items-center gap-2 mb-4">
        <button
          className={`px-4 py-2 rounded-full text-sm border ${tab === 'scene' ? 'bg-primary text-primary-foreground border-transparent' : 'bg-card border-border'}`}
          onClick={() => setTab('scene')}
        >场景</button>
        <button
          className={`px-4 py-2 rounded-full text-sm border ${tab === 'character' ? 'bg-primary text-primary-foreground border-transparent' : 'bg-card border-border'}`}
          onClick={() => setTab('character')}
        >人物</button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {data.map((item) => (
          <button
            key={`${tab}-${item.id}`}
            onClick={() => onPick(item, tab)}
            className="relative rounded-2xl overflow-hidden border border-border bg-card hover:shadow"
          >
            <img
              src={item.imageUrl}
              alt={tab === 'scene' ? (item.location || '') : (item.name || '')}
              className="w-full h-28 object-cover"
            />
            <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/60 text-white text-xs">
              {tab === 'scene' ? (item.location || `场景${item.id}`) : (item.name || `角色${item.id}`)}
            </span>
          </button>
        ))}
      </div>
    </Modal>
  );
}
