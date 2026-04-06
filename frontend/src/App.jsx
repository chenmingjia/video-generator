import React, { useMemo, useState, useEffect } from 'react';
import WriterTab from './pages/WriterTab.jsx';
import VideoTab from './pages/VideoTab.jsx';
import MusicTab from './pages/MusicTab.jsx';
import EditTab from './pages/EditTab.jsx';
import AssetsTab from './pages/AssetsTab.jsx';
import VideoLibraryTab from './pages/VideoLibraryTab.jsx';
import { Card } from './components/Card.jsx';
import { api } from './api/client.js';

const TABS = [
  { key: 'writer', label: 'AI 编剧' },
  { key: 'video', label: 'AI 短视频生成' },
  { key: 'music', label: 'AI 音乐' },
  { key: 'edit', label: 'AI 剪辑' },
  { key: 'library', label: 'AI 视频中心' },
  { key: 'assets', label: 'AI 素材中心' },
];

export default function App() {
  const [activeTabIdx, setActiveTabIdx] = useState(0);

  // 共享生成结果：切换 Tab 不丢数据
  const [script, setScript] = useState(null);
  const [videoPlan, setVideoPlan] = useState(null);
  const [musicPlan, setMusicPlan] = useState(null);
  const [editPlan, setEditPlan] = useState(null);

  // 全局素材状态
  const [globalAssets, setGlobalAssets] = useState([]);
  const [fetchingAssets, setFetchingAssets] = useState(false);

  const fetchGlobalAssets = async () => {
    setFetchingAssets(true);
    try {
      const { data } = await api.get('/assets/private-domain');
      if (data.ok) {
        setGlobalAssets(data.assets || []);
      }
    } catch (err) {
      console.error('Failed to fetch global assets:', err);
    } finally {
      setFetchingAssets(false);
    }
  };

  useEffect(() => {
    fetchGlobalAssets();
  }, []);

  const activeTab = useMemo(() => TABS[activeTabIdx], [activeTabIdx]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* 顶部导航栏 */}
      <header className="sticky top-0 z-40 bg-card/80 backdrop-blur border-b border-border">
        <div className="w-full px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="brand">
            <h1 className="text-2xl font-bold">AI 短剧生成平台</h1>
            <p className="text-sm text-muted-foreground">从剧本到分镜、音乐与剪辑</p>
          </div>
          <nav className="flex flex-wrap gap-2" role="tablist" aria-label="AI 模块切换">
            {TABS.map((t, idx) => (
              <button
                key={t.key}
                className={`px-6 py-3 rounded-full font-medium transition-all focus:outline-none focus:ring-2 focus:ring-primary ${idx === activeTabIdx 
                  ? 'bg-primary text-primary-foreground shadow-sm' 
                  : 'bg-card text-foreground border border-border hover:bg-accent'}`}
                onClick={() => setActiveTabIdx(idx)}
                type="button"
                role="tab"
                aria-selected={idx === activeTabIdx}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <div className="w-full px-6 py-8">
        <Card className="p-6 shadow-sm">
          {/* 内容区域 */}
          {activeTab.key === 'writer' && (
            <WriterTab
              initialScript={script}
              onGenerated={(nextScript) => {
                setScript(nextScript);
                setVideoPlan(null);
                setMusicPlan(null);
                setEditPlan(null);
              }}
            />
          )}

          {activeTab.key === 'video' && (
            <VideoTab
              script={script}
              initialVideoPlan={videoPlan}
              globalAssets={globalAssets}
              onGenerated={(nextPlan) => {
                setVideoPlan(nextPlan);
                setEditPlan(null);
              }}
            />
          )}

          {activeTab.key === 'music' && (
            <MusicTab
              script={script}
              initialMusicPlan={musicPlan}
              onGenerated={(nextPlan) => {
                setMusicPlan(nextPlan);
                setEditPlan(null);
              }}
            />
          )}

          {activeTab.key === 'edit' && (
            <EditTab
              script={script}
              videoPlan={videoPlan}
              musicPlan={musicPlan}
              initialEditPlan={editPlan}
              onGenerated={(nextPlan) => setEditPlan(nextPlan)}
            />
          )}

          {activeTab.key === 'library' && (
            <VideoLibraryTab />
          )}

          {activeTab.key === 'assets' && (
            <AssetsTab 
              assets={globalAssets} 
              loading={fetchingAssets} 
              onRefresh={fetchGlobalAssets} 
            />
          )}
        </Card>
      </div>

      {/* 页脚 */}
      <footer className="mt-12 border-t border-border py-6">
        <div className="max-w-6xl mx-auto px-6 text-center text-sm text-muted-foreground">
          <p>© 2026 AI 短剧生成平台 | 技术驱动创意</p>
        </div>
      </footer>
    </div>
  );
}
