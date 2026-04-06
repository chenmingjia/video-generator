import React, { useEffect, useRef, useState } from 'react';
import Modal from './Modal.jsx';
import Button from './Button.jsx';
import Input from './Input.jsx';
import AssetPickerModal from './AssetPickerModal.jsx';

export default function ShotEditorModal({ open, onClose, shot, onSave, scenes = [], characters = [], approvedAssets = {}, globalAssets = [] }) {
  const [camera, setCamera] = useState('');
  const [durationSec, setDurationSec] = useState(3);
  const [visual, setVisual] = useState('');
  const [prompt, setPrompt] = useState('');
  const [onScreenText, setOnScreenText] = useState('');
  const [saving, setSaving] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuType, setMenuType] = useState('scene');
  const menuRef = useRef(null);
  const editorRef = useRef(null);

  useEffect(() => {
    if (!shot) return;
    setCamera(shot.camera || '');
    setDurationSec(Number(shot.durationSec || 3));
    setVisual(shot.visual || '');
    setPrompt(shot.prompt || '');
    setOnScreenText(shot.onScreenText || '');
    // 将 @asset://xxx 转为对应的资产标签显示
    const sceneMap = {};
    (scenes || []).forEach(s => { sceneMap[String(s.id)] = s; });
    const charMap = {};
    (characters || []).forEach(c => { charMap[String(c.id)] = c; });
    
    let converted = String(shot.prompt || '');
    
    // 如果提示词中包含我们新格式的 @asset://xxx
    // 注意：这里的正则需要避免匹配到后面的标点符号或汉字
    const assetRegex = /@asset:\/\/[a-zA-Z0-9-_]+/g;
    converted = converted.replace(assetRegex, (match) => {
      const uri = match.replace('@asset://', '');
      return `[[asset:${uri}]]`;
    });
    
    // 兼容旧格式 [img:scene:id]
    converted = converted.replace(/\[img:scene:(\d+)\]/g, (_m, id) => {
      const s = sceneMap[String(id)];
      const label = (s?.location || `场景${id}`).replace(/:/g, '_');
      return `[[img:scene:${id}:${label}]]`;
    });
    converted = converted.replace(/\[img:char:(\d+)\]/g, (_m, id) => {
      const c = charMap[String(id)];
      const label = (c?.name || `角色${id}`).replace(/:/g, '_');
      return `[[img:char:${id}:${label}]]`;
    });
    converted = converted.replace(/\[img:(\d+)\]/g, (_m, id) => {
      const s = sceneMap[String(id)];
      const label = (s?.location || `场景${id}`).replace(/:/g, '_');
      return `[[img:scene:${id}:${label}]]`;
    });
    setTimeout(() => {
      if (editorRef.current) {
        renderFromRaw(converted);
      }
    }, 0);
  }, [shot, scenes, characters]);

  function buildRawFromDOM() {
    const el = editorRef.current;
    if (!el) return '';
    let raw = '';
    el.childNodes.forEach((node) => {
      if (node.nodeType === 3) {
        raw += node.textContent;
      } else if (node.nodeType === 1) {
        const eln = node;
        if (eln.classList && eln.classList.contains('asset-chip')) {
          const uri = eln.getAttribute('data-uri');
          raw += `@asset://${uri}`;
        } else if (eln.classList && eln.classList.contains('img-chip')) {
          const id = eln.getAttribute('data-id');
          const label = eln.getAttribute('data-label') || '';
          const type = eln.getAttribute('data-type') || 'scene';
          raw += `[[img:${type}:${id}:${label}]]`;
        } else {
          raw += eln.textContent || '';
        }
      }
    });
    return raw;
  }

  function renderFromRaw(raw) {
    const parts = String(raw || '').split(/(\[\[asset:[^\]]+\]\]|\[\[img:[^\]]+\]\])/g);
    const frag = document.createDocumentFragment();
    parts.forEach(part => {
      const mAsset = part.match(/^\[\[asset:([^\]]+)\]\]$/);
      if (mAsset) {
        const uri = mAsset[1];
        
        // 尝试从人物或场景中找到对应的资产，提取它的名称和图片
        // 在实际应用中，你可能需要将 approvedAssets 的映射传给这个组件
        // 这里我们用一个比较通用的查找方式：遍历所有 characters 和 scenes，看有没有 match 的
        let displayName = '资产';
        let displayImg = '';
        
        // 如果当前组件拿不到 approvedAssets 映射，尝试从全局的 characters / scenes 中找线索
        // 或者至少可以给个好看的样式
        // 注意：如果你需要在弹窗中显示图片，建议在父组件传入 approvedAssets
        // 为了安全起见，这里提供一个带小图标的基础样式
        
        const span = document.createElement('span');
        span.className = 'asset-chip inline-flex items-center gap-1 bg-primary/10 text-primary px-1.5 py-0.5 rounded text-xs font-mono mx-0.5 border border-primary/20 align-middle';
        span.setAttribute('contenteditable', 'false');
        span.setAttribute('data-uri', uri);
        
        // 我们需要一种方法通过 URI 找回名称和图片，这里假设父组件没有传入
        // 我们暂时渲染 URI，等下你在 VideoTab.jsx 中也传入 approvedAssets 就能显示名称了
        // 这里为了防错，先显示部分 URI，然后在后面的修改中补全逻辑
        if (approvedAssets && Object.keys(approvedAssets).length > 0) {
          const assetEntry = Object.entries(approvedAssets).find(([name, data]) => {
            const assetUri = typeof data === 'object' ? data.uri : data;
            return assetUri === `asset://${uri}` || assetUri === uri;
          });
          if (assetEntry) {
            displayName = assetEntry[0];
            if (typeof assetEntry[1] === 'object' && assetEntry[1].httpUrl) {
              displayImg = assetEntry[1].httpUrl;
            }
          }
        }
        
        // 从全局素材库中查找真实的图片 URL
        if (!displayImg && globalAssets && globalAssets.length > 0) {
          const fullUri = `asset://${uri}`;
          const matchAsset = globalAssets.find(a => a.assetUri === fullUri || a.volcAssetId === uri);
          if (matchAsset && matchAsset.sourceUrl) {
            displayImg = matchAsset.sourceUrl;
            if (displayName === '资产' && matchAsset.name) {
              displayName = matchAsset.name;
            }
          }
        }
        
        // 渲染一个小图标
        const img = document.createElement('img');
        if (displayImg) {
          img.src = displayImg;
        } else {
          img.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>';
        }
        img.className = 'w-4 h-4 rounded object-cover opacity-90';
        
        const text = document.createElement('span');
        text.textContent = displayName !== '资产' ? displayName : `asset://${uri.substring(0, 8)}...`;
        text.className = 'truncate max-w-[120px] ml-1';
        
        const btn = document.createElement('button');
        btn.textContent = '×';
        btn.className = 'ml-1 text-primary/70 hover:text-primary';
        btn.onclick = () => span.remove();
        
        span.appendChild(img);
        span.appendChild(text);
        span.appendChild(btn);
        
        frag.appendChild(span);
        frag.appendChild(document.createTextNode(' '));
        return;
      }

      const m = part.match(/^\[\[img:(scene|char):([^:]+):([^\]]+)\]\]$/);
      if (m) {
        const type = m[1];
        const id = m[2];
        const label = m[3];
        const s = type === 'scene'
          ? (scenes || []).find(x => String(x.id) === String(id))
          : (characters || []).find(x => String(x.id) === String(id));
        const span = document.createElement('span');
        span.className = 'img-chip inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent text-xs border border-border align-middle';
        span.setAttribute('contenteditable', 'false');
        span.setAttribute('data-id', id);
        span.setAttribute('data-label', label);
        span.setAttribute('data-type', type);
        const img = document.createElement('img');
        img.src = s?.imageUrl || s?.avatar || '';
        img.alt = label;
        img.className = 'w-4 h-4 rounded object-cover';
        const text = document.createElement('span');
        text.textContent = label;
        const btn = document.createElement('button');
        btn.textContent = '×';
        btn.className = 'ml-1 text-muted-foreground hover:text-foreground';
        btn.onclick = () => {
          span.remove();
        };
        span.appendChild(img);
        span.appendChild(text);
        span.appendChild(btn);
        frag.appendChild(span);
        frag.appendChild(document.createTextNode(' '));
      } else {
        frag.appendChild(document.createTextNode(part));
      }
    });
    editorRef.current.innerHTML = '';
    editorRef.current.appendChild(frag);
  }

  function insertChip(item, type) {
    if (!editorRef.current) return;
    const sel = document.getSelection();
    let range = sel && sel.rangeCount ? sel.getRangeAt(0) : null;
    // 优先清理触发菜单的 @ 符号
    if (range) {
      const container = range.startContainer;
      if (container.nodeType === 3) {
        const text = container.textContent || '';
        const idx = range.startOffset;
        if (idx >= 1 && text[idx - 1] === '@') {
          const newText = text.slice(0, idx - 1) + text.slice(idx);
          container.textContent = newText;
          range.setStart(container, idx - 1);
          range.setEnd(container, idx - 1);
        }
      } else {
        // 如果光标在元素节点上，尝试查看前一个文本节点是否以 @ 结尾
        const prev =
          (container.childNodes && container.childNodes[range.startOffset - 1]) ||
          container.previousSibling;
        if (prev && prev.nodeType === 3) {
          const t = prev.textContent || '';
          if (t.endsWith('@')) {
            prev.textContent = t.slice(0, -1);
          }
        }
      }
    }
    const span = document.createElement('span');
    span.className = 'img-chip inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent text-xs border border-border align-middle';
    span.setAttribute('contenteditable', 'false');
    span.setAttribute('data-id', String(item.id));
    span.setAttribute('data-label', (type === 'scene' ? (item.location || `场景${item.id}`) : (item.name || `角色${item.id}`)));
    span.setAttribute('data-type', type);
    const img = document.createElement('img');
    img.src = item.imageUrl || item.avatar || '';
    img.alt = item.location || item.name || '';
    img.className = 'w-4 h-4 rounded object-cover';
    const text = document.createElement('span');
    text.textContent = type === 'scene' ? (item.location || `场景${item.id}`) : (item.name || `角色${item.id}`);
    const btn = document.createElement('button');
    btn.textContent = '×';
    btn.className = 'ml-1 text-muted-foreground hover:text-foreground';
    btn.onclick = () => span.remove();
    span.appendChild(img);
    span.appendChild(text);
    span.appendChild(btn);
    if (range) {
      range.insertNode(span);
      range.collapse(false);
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(range);
      }
    } else {
      editorRef.current.appendChild(span);
    }
    setMenuOpen(false);
  }

  const footer = (
    <div className="flex justify-end gap-3">
      <Button variant="secondary" onClick={onClose}>取消</Button>
      <Button
        onClick={async () => {
          setSaving(true);
          await onSave({
            ...shot,
            camera,
            durationSec: Number(durationSec) || 15, // 默认改为 15s
            visual,
            // 将 [[img:type:id:label]] => [img:type:id]
            prompt: buildRawFromDOM()
              .replace(/\[\[img:(scene|char):([^:]+):([^\]]+)\]\]/g, (_m, type, id) => `[img:${type}:${id}]`),
            onScreenText
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
    <Modal open={open} onClose={onClose} title={`编辑分镜 ${shot?.shotIndex || ''}`} footer={footer} className="max-w-5xl w-[92vw]">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-7 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">镜头类型</label>
              <Input value={camera} onChange={(e) => setCamera(e.target.value)} placeholder="如：广角/推近/俯拍" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">时长（秒）</label>
              <Input type="number" value={durationSec} onChange={(e) => setDurationSec(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">画面描述</label>
            <textarea value={visual} onChange={(e) => setVisual(e.target.value)} className="w-full min-h-28 rounded-2xl border border-border bg-background px-3 py-3 text-sm" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">提示词</label>
            <div
              ref={editorRef}
              className="w-full min-h-32 rounded-2xl border border-border bg-background px-3 py-3 text-sm"
              contentEditable
              onInput={() => {
                setPrompt(buildRawFromDOM());
              }}
              onKeyDown={(e) => {
                if (e.key === '@') {
                  setMenuType('scene');
                  setMenuOpen(true);
                  e.preventDefault();
                }
                if (e.key === 'Escape') setMenuOpen(false);
              }}
            />
            <div className="mt-2">
              <Button variant="outline" size="small" onClick={() => { setMenuType('scene'); setMenuOpen(true); }}>选择图片插入</Button>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">字幕</label>
            <Input value={onScreenText} onChange={(e) => setOnScreenText(e.target.value)} />
          </div>
        </div>
        <div className="md:col-span-5">
          <div className="rounded-xl overflow-hidden border border-border bg-card">
            <img src={shot?.thumb || `https://picsum.photos/seed/shot-${shot?.shotIndex || 1}/640/360`} alt="预览" className="w-full h-auto object-cover" />
          </div>
        </div>
      </div>
      <AssetPickerModal
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onPick={(item, type) => insertChip(item, type)}
        scenes={scenes}
        characters={characters}
        defaultTab={menuType}
      />
    </Modal>
  );
}
