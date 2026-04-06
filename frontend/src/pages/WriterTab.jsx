import React, { useEffect, useState } from 'react';
import Button from '../components/Button.jsx';
import Input from '../components/Input.jsx';
import Modal from '../components/Modal.jsx';

export default function WriterTab() {
  const defaultModel = 'doubao-seed-2-0-pro-260215';
  const [templates, setTemplates] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [newTpl, setNewTpl] = useState({
    name: '新提示词',
    modelId: defaultModel,
    userPrompt: '',
    sceneType: 'script' // 默认场景类型为剧本场景
  });
  const [addOpen, setAddOpen] = useState(false);
  const [error, setError] = useState('');

  // 加载/保存 模板
  useEffect(() => {
    try {
      const raw = localStorage.getItem('aiTemplates');
      if (raw) {
        setTemplates(JSON.parse(raw));
      } else {
        const defaults = [
          {
            id: Date.now(),
            name: '分集剧本（15s）',
            modelId: defaultModel,
            userPrompt: '生成一个现代都市情感小剧，主题包含反转与温情',
            sceneType: 'script'
          }
        ];
        setTemplates(defaults);
        localStorage.setItem('aiTemplates', JSON.stringify(defaults));
      }
    } catch {}
  }, []);

  const saveTemplate = () => {
    if (!newTpl.name.trim() || !newTpl.userPrompt.trim()) {
      setError('请输入模板名称与系统提示词');
      return;
    }
    setError('');
    
    let next;
    if (editingId) {
      next = templates.map(t => t.id === editingId ? { ...newTpl, id: editingId } : t);
    } else {
      const item = { ...newTpl, id: Date.now() };
      next = [item, ...templates].slice(0, 50);
    }
    
    setTemplates(next);
    localStorage.setItem('aiTemplates', JSON.stringify(next));
    setAddOpen(false);
  };

  const deleteTemplate = (id) => {
    const next = templates.filter(t => t.id !== id);
    setTemplates(next);
    localStorage.setItem('aiTemplates', JSON.stringify(next));
  };

  const openAddModal = () => {
    setError('');
    setEditingId(null);
    setNewTpl({
      name: '新提示词',
      modelId: defaultModel,
      userPrompt: '',
      sceneType: 'script'
    });
    setAddOpen(true);
  };

  const openEditModal = (tpl) => {
    setError('');
    setEditingId(tpl.id);
    setNewTpl({
      name: tpl.name,
      modelId: tpl.modelId,
      userPrompt: tpl.userPrompt,
      sceneType: tpl.sceneType || 'script'
    });
    setAddOpen(true);
  };

  return (
    <div className="space-y-8 min-h-[500px]">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="text-xl font-bold">AI 提示词模版管理</div>
        <Button onClick={openAddModal}>新增提示词</Button>
      </div>

      {templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground border-2 border-dashed border-border rounded-2xl bg-muted/30">
          <svg className="w-12 h-12 mb-4 text-muted-foreground/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <span className="text-sm">暂无提示词模版，请点击右上角新增</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {templates.map(tpl => (
            <div key={tpl.id} className="group border border-border rounded-2xl bg-card flex flex-col justify-between hover:shadow-md hover:border-primary/50 transition-all duration-300 overflow-hidden">
              <div className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="font-semibold text-foreground text-base truncate pr-3" title={tpl.name}>{tpl.name}</div>
                  <div className="flex flex-col items-end gap-1">
                    <div className="text-[10px] font-medium bg-primary/10 text-primary px-2.5 py-1 rounded-full shrink-0 max-w-[100px] truncate" title={tpl.modelId}>{tpl.modelId}</div>
                    <div className={`text-[10px] font-medium px-2.5 py-1 rounded-full shrink-0 ${tpl.sceneType === 'image' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                      {tpl.sceneType === 'image' ? '生图场景' : '剧本场景'}
                    </div>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground mb-2 line-clamp-4 leading-relaxed" title={tpl.userPrompt}>
                  {tpl.userPrompt}
                </div>
              </div>
              <div className="flex items-center justify-end px-4 py-3 bg-muted/30 border-t border-border gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <Button variant="outline" size="small" onClick={() => openEditModal(tpl)} className="h-7 text-xs px-3">
                  编辑
                </Button>
                <Button variant="destructive" size="small" onClick={() => deleteTemplate(tpl.id)} className="h-7 text-xs px-3">
                  删除
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title={editingId ? "编辑提示词" : "新增提示词"}
        footer={(
          <div className="flex justify-end gap-3 w-full">
            <Button variant="outline" onClick={() => setAddOpen(false)}>取消</Button>
            <Button onClick={saveTemplate}>保存</Button>
          </div>
        )}
      >
        <div className="space-y-5 pt-2">
          {error ? (
            <div className="text-sm text-destructive bg-destructive/10 px-4 py-3 rounded-xl border border-destructive/20 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              {error}
            </div>
          ) : null}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">模版名称</label>
            <Input 
              placeholder="例如：古装悬疑短剧"
              value={newTpl.name} 
              onChange={(e) => setNewTpl(v => ({ ...v, name: e.target.value }))} 
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">场景类型</label>
            <div className="flex gap-4 mt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio" 
                  name="sceneType" 
                  value="script" 
                  checked={newTpl.sceneType === 'script' || !newTpl.sceneType} 
                  onChange={() => setNewTpl(v => ({ ...v, sceneType: 'script' }))}
                  className="text-primary focus:ring-primary"
                />
                <span className="text-sm">剧本场景</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio" 
                  name="sceneType" 
                  value="image" 
                  checked={newTpl.sceneType === 'image'} 
                  onChange={() => setNewTpl(v => ({ ...v, sceneType: 'image' }))}
                  className="text-primary focus:ring-primary"
                />
                <span className="text-sm">生图场景</span>
              </label>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">模型标识 (可选)</label>
            <Input 
              placeholder="例如：doubao-seed-2-0-pro-260215"
              value={newTpl.modelId} 
              onChange={(e) => setNewTpl(v => ({ ...v, modelId: e.target.value }))} 
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">系统提示词</label>
            <textarea 
              placeholder="请输入您需要的系统提示词..."
              value={newTpl.userPrompt} 
              onChange={(e) => setNewTpl(v => ({ ...v, userPrompt: e.target.value }))} 
              className="w-full h-36 rounded-xl border border-input bg-background px-4 py-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-all resize-none shadow-sm" 
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
