import React, { useEffect, useState, useRef } from 'react';
import { api } from '../api/client.js';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/Card.jsx';
import EditImageModal from '../components/EditImageModal.jsx';
import Modal from '../components/Modal.jsx';
import VideoEditorModal from '../components/VideoEditorModal.jsx';
import ResultBox from '../components/ResultBox.jsx';
import ShotEditorModal from '../components/ShotEditorModal.jsx';
import Button from '../components/Button.jsx';
import Input from '../components/Input.jsx';

export default function VideoTab({ script, initialVideoPlan, globalAssets = [], onGenerated }) {
  // 工作流相关状态
  const [workflows, setWorkflows] = useState([]);
  const [activeWorkflowId, setActiveWorkflowId] = useState(null);
  const [editingWorkflowId, setEditingWorkflowId] = useState(null);
  const [editingWorkflowTitle, setEditingWorkflowTitle] = useState('');

  // 阶段状态：1-输入剧本，2-生成人物和场景图，3-生成分镜提示词，4-产出视频
  const [stage, setStage] = useState(1);
  const [scriptTitle, setScriptTitle] = useState(script?.title || '');
  const [scriptContent, setScriptContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(initialVideoPlan || null);

  // 各阶段数据
  const [characters, setCharacters] = useState([]);
  const [scenes, setScenes] = useState([]);
  const [storyboard, setStoryboard] = useState([]);
  const [videoOutput, setVideoOutput] = useState(null);
  const [genTaskId, setGenTaskId] = useState('');
  const [genStatus, setGenStatus] = useState('');
  const pollTimerRef = useRef(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorType, setEditorType] = useState('character');
  const [editorItem, setEditorItem] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [episodeEditorOpen, setEpisodeEditorOpen] = useState(false);
  const [episodeEditing, setEpisodeEditing] = useState(null);
  const [shotEditorOpen, setShotEditorOpen] = useState(false);
  const [shotEditing, setShotEditing] = useState(null);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiEpisodes, setAiEpisodes] = useState([]);
  const [aiCount, setAiCount] = useState(5);
  const [aiVia, setAiVia] = useState('');
  const [scriptGenMode, setScriptGenMode] = useState('prompt'); // 'prompt' | 'novel'
  const [novelText, setNovelText] = useState('');
  const [novelFileName, setNovelFileName] = useState('');
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [imageTemplateId, setImageTemplateId] = useState('');
  const [approvalStatus, setApprovalStatus] = useState({});
  const [approvedAssets, setApprovedAssets] = useState({});

  // 修改次数
  const [modifyCount, setModifyCount] = useState(0);
  const MAX_MODIFIES = 2;

  // 违禁词检测状态
  const [detectModalOpen, setDetectModalOpen] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [detectResult, setDetectResult] = useState(null);
  const [detectPromptText, setDetectPromptText] = useState('');

  // 使用 ref 跟踪当前的 activeWorkflowId，用于在异步操作回调中判断是否已切换工作流
  const activeWorkflowIdRef = useRef(activeWorkflowId);
  useEffect(() => {
    activeWorkflowIdRef.current = activeWorkflowId;
  }, [activeWorkflowId]);

  // 加载工作流列表
  const loadWorkflows = async () => {
    try {
      const res = await api.get('/storage/workflows');
      if (res.data?.data) {
        setWorkflows(res.data.data);
        if (res.data.data.length > 0 && !activeWorkflowId) {
          // 如果没有选中的工作流，默认选中第一个
          switchWorkflow(res.data.data[0]);
        } else if (res.data.data.length === 0) {
          // 如果没有工作流，自动创建一个
          handleCreateWorkflow();
        }
      }
    } catch (e) {
      console.error('获取工作流失败:', e);
    }
  };

  useEffect(() => {
    loadWorkflows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 切换工作流
  const switchWorkflow = async (wf) => {
    setActiveWorkflowId(wf.id);
    let state = {};
    
    if (wf.stateJson) {
      try {
        state = JSON.parse(wf.stateJson);
      } catch (e) {
        console.error('解析工作流状态失败:', e);
      }
    }
    
    setStage(state.stage || 1);
    setScriptTitle(wf.title || state.scriptTitle || '');
    setScriptContent(state.scriptContent || '');
    setCharacters(state.characters || []);
    setScenes(state.scenes || []);
    setStoryboard(state.storyboard || []);
    setVideoOutput(state.videoOutput || null);
    setGenTaskId(state.genTaskId || '');
    setGenStatus(state.genStatus || '');
    
    // 处理可能已经 completed 但没有 videoUrl 的数据
    let initialEpisodes = state.episodes || [];
    setEpisodes([...initialEpisodes]);
    
    setAiPrompt(state.aiPrompt || '');
    setNovelText(state.novelText || '');
    setNovelFileName(state.novelFileName || '');
    setScriptGenMode(state.scriptGenMode || 'prompt');
    setAiEpisodes(state.aiEpisodes || []);
    setAiCount(state.aiCount || 5);
    setAiVia(state.aiVia || '');
    setSelectedTemplateId(state.selectedTemplateId || '');
    setImageTemplateId(state.imageTemplateId || '');
    setApprovalStatus(state.approvalStatus || {});
    setApprovedAssets(state.approvedAssets || {});
    setModifyCount(state.modifyCount || 0);

    // 异步修复 completed 但缺失链接的视频
    if (initialEpisodes.length > 0) {
      let needsUpdate = false;
      const repairedEpisodes = await Promise.all(initialEpisodes.map(async (ep) => {
        if (ep.status === 'completed' && !ep.videoUrl && ep.taskId) {
          try {
            const r = await api.get(`/video/messages/${encodeURIComponent(ep.taskId)}`);
            const latest = r?.data?.latest || r?.data;
            if (latest && latest.mediaUrl) {
              needsUpdate = true;
              return {
                ...ep,
                videoUrl: latest.mediaUrl,
                thumb: latest.thumbnailUrl || ep.thumb
              };
            }
          } catch (e) {
            console.warn(`修复剧集视频链接失败 [taskId: ${ep.taskId}]:`, e);
          }
        }
        return ep;
      }));

      if (needsUpdate) {
        setEpisodes((prev) => {
          // 确保当前还是这个工作流
          if (activeWorkflowIdRef.current === wf.id) {
            return repairedEpisodes;
          }
          return prev;
        });
      }
    }
  };

  // 创建新工作流
  const handleCreateWorkflow = async () => {
    try {
      const defaultState = {
        stage: 1,
        aiCount: 5,
      };
      const res = await api.post('/storage/workflows', {
        title: '新剧集工作流',
        stateJson: JSON.stringify(defaultState)
      });
      if (res.data?.data) {
        setWorkflows(prev => [res.data.data, ...prev]);
        switchWorkflow(res.data.data);
      }
    } catch (e) {
      console.error('创建工作流失败:', e);
    }
  };

  // 删除工作流
  const handleDeleteWorkflow = async (id, e) => {
    e.stopPropagation();
    try {
      await api.delete(`/storage/workflows/${id}`);
      setWorkflows(prev => prev.filter(w => w.id !== id));
      if (activeWorkflowId === id) {
        const remaining = workflows.filter(w => w.id !== id);
        if (remaining.length > 0) {
          switchWorkflow(remaining[0]);
        } else {
          handleCreateWorkflow();
        }
      }
    } catch (err) {
      console.error('删除工作流失败:', err);
    }
  };

  // 保存工作流名称
  const handleSaveWorkflowTitle = async (id) => {
    try {
      const title = editingWorkflowTitle.trim() || '未命名剧集';
      await api.put(`/storage/workflows/${id}`, { title });
      setWorkflows(prev => prev.map(w => w.id === id ? { ...w, title } : w));
      if (activeWorkflowId === id) {
        setScriptTitle(title);
      }
    } catch (e) {
      console.error('更新工作流名称失败:', e);
    }
    setEditingWorkflowId(null);
  };

  // 自动保存当前工作流状态
  useEffect(() => {
    if (!activeWorkflowId || loading) return;
    const saveState = async () => {
      const stateToSave = {
        stage, scriptTitle, scriptContent, characters, scenes, storyboard,
        videoOutput, genTaskId, genStatus, episodes,
        aiPrompt, aiEpisodes, aiCount, aiVia, selectedTemplateId, imageTemplateId,
        approvalStatus, approvedAssets, modifyCount,
        scriptGenMode, novelText, novelFileName
      };
      try {
        await api.put(`/storage/workflows/${activeWorkflowId}`, {
          title: scriptTitle || '未命名剧集',
          stateJson: JSON.stringify(stateToSave)
        });
        setWorkflows(prev => prev.map(w => w.id === activeWorkflowId ? { ...w, title: scriptTitle || '未命名剧集', stateJson: JSON.stringify(stateToSave) } : w));
      } catch (e) {
        console.error('保存工作流状态失败:', e);
      }
    };
    // 增加防抖
    const timer = setTimeout(saveState, 1000);
    return () => clearTimeout(timer);
  }, [
    activeWorkflowId, stage, scriptTitle, scriptContent, characters, scenes, storyboard,
    videoOutput, genTaskId, genStatus, episodes, aiPrompt, aiEpisodes,
    aiCount, aiVia, selectedTemplateId, imageTemplateId, approvalStatus, approvedAssets, modifyCount,
    scriptGenMode, novelText, novelFileName, loading
  ]);

  // 加载提示词模版
  // 监听全局素材变化，同步更新本地的 approvalStatus
  useEffect(() => {
    if (!globalAssets || globalAssets.length === 0) return;

    setApprovalStatus(prev => {
      const next = { ...prev };
      let changed = false;

      // 辅助函数：判断资产是否匹配当前图片
      const isMatch = (asset, name, imageUrl) => {
        if (asset.status !== 'active') return false;
        if (asset.name === name) return true;
        // 检查资产中可能包含 URL 的多个字段，包括 volcUrl
        console.log('asset:', asset, imageUrl);
        const urlsToMatch = [asset.sourceUrl, asset.posterUrl, asset.url, asset.volcUrl].filter(Boolean);
        return urlsToMatch.includes(imageUrl);
      };

      // 遍历所有角色和场景，如果它们对应的名字或任意 URL 字段在全局素材库里并且是 active，就标记为 success
      characters.forEach(c => {
        const key = `character-${c.id}`;
        if (next[key] !== 'success') {
          const matched = globalAssets.find(a => isMatch(a, c.name, c.imageUrl));
          if (matched) {
            next[key] = 'success';
            changed = true;
          }
        }
      });

      scenes.forEach(s => {
        const key = `scene-${s.id}`;
        if (next[key] !== 'success') {
          const matched = globalAssets.find(a => isMatch(a, s.location, s.imageUrl));
          if (matched) {
            next[key] = 'success';
            changed = true;
          }
        }
      });

      return changed ? next : prev;
    });

    setApprovedAssets(prev => {
      const next = { ...prev };
      let changed = false;

      const isMatch = (asset, name, imageUrl) => {
        if (asset.status !== 'active') return false;
        if (asset.name === name) return true;
        console.log('asset:', asset.volcUrl, imageUrl, name);
        const urlsToMatch = [asset.sourceUrl, asset.posterUrl, asset.url, asset.volcUrl].filter(Boolean);
        return urlsToMatch.includes(imageUrl);
      };

      characters.forEach(c => {
        const matched = globalAssets.find(a => isMatch(a, c.name, c.imageUrl));
        if (matched && matched.assetUri && next[c.name] !== matched.assetUri) {
          next[c.name] = matched.assetUri;
          changed = true;
        }
      });

      scenes.forEach(s => {
        const matched = globalAssets.find(a => isMatch(a, s.location, s.imageUrl));
        if (matched && matched.assetUri && next[s.location] !== matched.assetUri) {
          next[s.location] = matched.assetUri;
          changed = true;
        }
      });

      return changed ? next : prev;
    });
  }, [globalAssets, characters, scenes]);

  // 加载提示词模版
  useEffect(() => {
    try {
      const raw = localStorage.getItem('aiTemplates');
      if (raw) {
        const tpls = JSON.parse(raw);
        setTemplates(tpls);

        // 筛选出剧本场景的模板
        const scriptTpls = tpls.filter(t => !t.sceneType || t.sceneType === 'script');
        if (scriptTpls.length > 0 && !selectedTemplateId) {
          setSelectedTemplateId(scriptTpls[0].id.toString());
        }

        // 筛选出生图场景的模板
        const imageTpls = tpls.filter(t => t.sceneType === 'image');
        if (imageTpls.length > 0 && !imageTemplateId) {
          setImageTemplateId(imageTpls[0].id.toString());
        }
      }
    } catch { }
  }, []);

  useEffect(() => {
    // 这里主要是通过 url 参数或顶层传入的 script，但如果用户在不同工作流之间切换，这可能会引起混乱。
    // 为了隔离状态，只有在没有 scriptContent 并且 script 有值时，或者专门处理导入动作时才覆盖
    if (!script) return;

    // 如果当前工作流已经有剧本内容了，就不轻易覆盖，避免切换回工作流时数据被顶掉
    if (scriptContent) return;

    setScriptTitle(script?.title || '');
    const fromScenes = Array.isArray(script?.scenes)
      ? script.scenes.map((s, i) => `第${i + 1}幕 ${s.location}（${s.emotion}）：${s.dialogue || ''}`).join('\n')
      : '';
    setScriptContent(script?.content || fromScenes || '');
    console.log('script:', script);
    console.log('script.scenes:', script?.scenes);
    console.log('canProceedToStage2:', Boolean(script && Array.isArray(script.scenes) && script.scenes.length));
  }, [script, scriptContent]);

  useEffect(() => {
    setResult(initialVideoPlan || null);
  }, [initialVideoPlan]);

  // 阶段 1: 输入剧本（复用已有剧本）
  const handleStage1Complete = () => {
    console.log('handleStage1Complete called');
    console.log('script:', script);
    console.log('script.scenes:', script?.scenes);
    console.log('canProceedToStage2:', Boolean(script && Array.isArray(script.scenes) && script.scenes.length));

    if (script && Array.isArray(script.scenes) && script.scenes.length) {
      setStage(2);
    } else {
      setError('请先在 AI 编剧模块生成剧本，确保剧本包含完整的场景信息');
    }
  };

  // 阶段 2: 生成人物主体图和场景图
  async function handleGenerateImages() {
    setError('');
    setLoading(true);
    const currentWfId = activeWorkflowIdRef.current;
    try {
      const payload = {
        scriptTitle: scriptTitle.trim() ? scriptTitle.trim() : undefined,
        scriptContent: scriptContent.trim() || undefined,
        scenes: script?.scenes || [],
      };
      const { data } = await api.post('/video/generate-images', payload);
      if (currentWfId !== activeWorkflowIdRef.current) return;
      const chars = data.characters || [];
      const scs = data.scenes || [];
      setCharacters(chars);
      setScenes(scs);
      try {
        await Promise.all([
          ...chars.map((c) => api.post('/storage/characters', { name: c.name, description: c.description, imageUrl: c.imageUrl, prompt: c.prompt || '' })),
          ...scs.map((s) => api.post('/storage/scenes', { location: s.location, emotion: s.emotion, imageUrl: s.imageUrl, prompt: s.prompt || '' }))
        ]);
      } catch { }
    } catch (e) {
      setError(e?.response?.data?.error || e.message || '生成失败');
    } finally {
      setLoading(false);
    }
  }

  // 切换分镜的连接状态
  const toggleStoryboardConnection = (index, type) => {
    setStoryboard(prev => prev.map((s, i) => {
      if (i === index) {
        return { ...s, [type]: !s[type] };
      }
      return s;
    }));
  };

  // 阶段 3: 生成分镜提示词
  async function handleGenerateStoryboard() {
    setError('');
    setLoading(true);
    setStoryboard([]); // 清空旧数据以展示 loading 状态
    const currentWfId = activeWorkflowIdRef.current;
    try {
      // 构建后端所需格式的 approvedAssets ({ name: uri })
      const backendApprovedAssets = {};
      Object.entries(approvedAssets).forEach(([name, data]) => {
        backendApprovedAssets[name] = typeof data === 'object' ? data.uri : data;
      });

      const payload = {
        scriptTitle: scriptTitle.trim() ? scriptTitle.trim() : undefined,
        scriptContent: scriptContent, // 传入全量剧本内容供后端使用
        episodes: aiEpisodes, // 传入具体的分集剧本
        scenes: scenes, // 传入前端分析出来的场景列表
        characters: characters, // 传入角色列表
        approvedAssets: backendApprovedAssets // 传递已审核通过的素材 URI，用于生成内嵌的 @xxx 标记
      };
      const { data } = await api.post('/video/generate-storyboard', payload);
      if (currentWfId !== activeWorkflowIdRef.current) return;
      const sb = data.storyboard || [];
      // 持久化到本地 DB，拿到带 id 的版本
      try {
        const saveRes = await api.post('/storage/storyboards', { storyboard: sb });
        const saved = saveRes?.data?.data || [];
        if (saved.length) {
          setStoryboard(saved);
        } else {
          setStoryboard(sb);
        }
      } catch {
        setStoryboard(sb);
      }
    } catch (e) {
      setError(e?.response?.data?.error || e.message || '生成失败');
    } finally {
      setLoading(false);
    }
  }

  // 修改分镜提示词
  async function handleModifyStoryboard() {
    if (modifyCount >= MAX_MODIFIES) {
      setError(`已达到最大修改次数（${MAX_MODIFIES}次）`);
      return;
    }
    
    setError('');
    setLoading(true);
    const currentWfId = activeWorkflowIdRef.current;
    try {
      const payload = {
        scriptTitle: scriptTitle.trim() ? scriptTitle.trim() : undefined,
        scenes: script?.scenes || [],
        characters: characters,
        storyboard: storyboard,
        modifyCount: modifyCount + 1,
      };
      const { data } = await api.post('/video/modify-storyboard', payload);
      if (currentWfId !== activeWorkflowIdRef.current) return;
      setStoryboard(data.storyboard || []);
      setModifyCount(modifyCount + 1);
    } catch (e) {
      setError(e?.response?.data?.error || e.message || '修改失败');
    } finally {
      setLoading(false);
    }
  }

  // 阶段 4: 产出完整视频
  async function handleGenerateVideo() {
    setError('');
    setLoading(true);
    const currentWfId = activeWorkflowIdRef.current;
    try {
      const payload = {
        scriptTitle: scriptTitle.trim() ? scriptTitle.trim() : undefined,
        storyboard: storyboard,
        characters: characters,
        scenes: scenes,
      };
      const { data } = await api.post('/video/generate-video', payload);
      
      if (currentWfId !== activeWorkflowIdRef.current) return;

      if (data.results && Array.isArray(data.results)) {
        const newEpisodes = data.results.map((r, i) => {
          const mediaUrl = r.userMessage?.mediaUrl || r.mediaUrl;
          const thumbUrl = r.userMessage?.thumbnailUrl || r.thumbnailUrl;
          const taskId = r.taskId;
          const sb = storyboard[i];
          const epTitle = sb?.visual
            ? sb.visual.replace(/\s+/g, ' ').trim()
            : `第 ${i + 1} 幕`;

          return {
            id: r.userMessage?.id || taskId || `gen-${i}`,
            idx: i + 1,
            title: `第 ${i + 1} 集：${epTitle.slice(0, 18)}`,
            duration: 15,
            people: characters.length || 2,
            shots: 8,
            scenes: scenes.length || 3,
            videoUrl: mediaUrl,
            thumb: thumbUrl,
            taskId: taskId,
            status: mediaUrl ? 'completed' : 'submitted'
          };
        });
        setEpisodes(newEpisodes);

        const firstCompleted = newEpisodes.find(ep => ep.status === 'completed');
        if (firstCompleted) {
          setVideoOutput({
            id: firstCompleted.id,
            title: scriptTitle || '生成结果',
            status: 'completed',
            mediaUrl: firstCompleted.videoUrl,
            thumbnailUrl: firstCompleted.thumb
          });
        }

        const incomplete = newEpisodes.filter(ep => ep.status !== 'completed' && ep.taskId);
        if (incomplete.length > 0) {
          // 如果有多个任务需要轮询，目前可以只轮询第一个，或者后端已经是同步返回
          setGenTaskId(incomplete[0].taskId);
          setGenStatus('submitted');
        } else {
          setGenStatus('completed');
        }

        // 尝试持久化保存到数据库
        try {
          const saveRes = await api.post('/storage/episodes', { episodes: newEpisodes });
          if (saveRes?.data?.data && saveRes.data.data.length > 0) {
            // 合并 dbId
            setEpisodes(prev => prev.map((ep, idx) => {
              const dbMatch = saveRes.data.data[idx] || saveRes.data.data.find(d => d.title === ep.title);
              return dbMatch ? { ...ep, dbId: dbMatch.id } : ep;
            }));
          }
        } catch (err) {
          console.error('保存 episodes 失败:', err);
        }
      } else {
        const taskId = data?.taskId;
        if (taskId) {
          setGenTaskId(taskId);
          setGenStatus('submitted');
        } else {
          setError('生成任务创建失败');
        }
      }
    } catch (e) {
      setError(e?.response?.data?.error || e.message || '生成失败');
    } finally {
      setLoading(false);
    }
  }

  // 单个视频重试生成
  async function handleRetryVideo(episodeIndex) {
    setError('');
    const currentWfId = activeWorkflowIdRef.current;
    
    // 更新状态为提交中
    setEpisodes(prev => prev.map((ep, i) => {
      if (i === episodeIndex) {
        return { ...ep, status: 'submitted', error: null };
      }
      return ep;
    }));

    try {
      const payload = {
        scriptTitle: scriptTitle.trim() ? scriptTitle.trim() : undefined,
        storyboard: [storyboard[episodeIndex]], // 只传当前分镜
        characters: characters,
        scenes: scenes,
      };
      
      const { data } = await api.post('/video/generate-video', payload);
      
      if (currentWfId !== activeWorkflowIdRef.current) return;

      if (data.results && Array.isArray(data.results) && data.results.length > 0) {
        const r = data.results[0];
        const mediaUrl = r.userMessage?.mediaUrl || r.mediaUrl;
        const thumbUrl = r.userMessage?.thumbnailUrl || r.thumbnailUrl;
        const taskId = r.taskId;
        
        setEpisodes(prev => prev.map((ep, i) => {
          if (i === episodeIndex) {
            return {
              ...ep,
              taskId: taskId,
              status: mediaUrl ? 'completed' : 'submitted',
              videoUrl: mediaUrl || ep.videoUrl,
              thumb: thumbUrl || ep.thumb,
              error: null
            };
          }
          return ep;
        }));
        
        if (!mediaUrl && taskId) {
          // 重新触发轮询
          setGenTaskId(taskId);
          setGenStatus('submitted');
        }
      } else {
        const taskId = data?.taskId;
        if (taskId) {
          setEpisodes(prev => prev.map((ep, i) => {
            if (i === episodeIndex) {
              return { ...ep, taskId: taskId, status: 'submitted', error: null };
            }
            return ep;
          }));
          setGenTaskId(taskId);
          setGenStatus('submitted');
        } else {
          setEpisodes(prev => prev.map((ep, i) => {
            if (i === episodeIndex) {
              return { ...ep, status: 'failed', error: '重试任务创建失败' };
            }
            return ep;
          }));
        }
      }
    } catch (e) {
      const errorMsg = e?.response?.data?.error || e.message || '重试失败';
      setEpisodes(prev => prev.map((ep, i) => {
        if (i === episodeIndex) {
          return { ...ep, status: 'failed', error: errorMsg };
        }
        return ep;
      }));
    }
  }

  // 提升视频清晰度
  async function handleEnhanceVideo() {
    if (!videoOutput) return;
    
    setError('');
    setLoading(true);
    const currentWfId = activeWorkflowIdRef.current;
    try {
      const payload = {
        videoId: videoOutput.id,
      };
      const { data } = await api.post('/video/enhance', payload);
      if (currentWfId !== activeWorkflowIdRef.current) return;
      setVideoOutput(data);
    } catch (e) {
      setError(e?.response?.data?.error || e.message || '提升失败');
    } finally {
      setLoading(false);
    }
  }

  // 为视频配音
  async function handleAddVoiceover() {
    if (!videoOutput) return;
    
    setError('');
    setLoading(true);
    const currentWfId = activeWorkflowIdRef.current;
    try {
      const payload = {
        videoId: videoOutput.id,
        script: script,
      };
      const { data } = await api.post('/video/add-voiceover', payload);
      if (currentWfId !== activeWorkflowIdRef.current) return;
      setVideoOutput(data);
    } catch (e) {
      setError(e?.response?.data?.error || e.message || '配音失败');
    } finally {
      setLoading(false);
    }
  }

  const canProceedToStage2 = Boolean(script && Array.isArray(script.scenes) && script.scenes.length);

  const handleDeleteImage = (type, id) => {
    if (type === 'character') {
      setCharacters(prev => prev.filter(c => c.id !== id));
    } else {
      setScenes(prev => prev.filter(s => s.id !== id));
    }
  };

  const handleApproveImage = async (item, type) => {
    // 为避免角色和场景的 ID 冲突（都是 1, 2, 3），拼接类型前缀
    const itemId = `${type}-${item.id}`;
    setApprovalStatus(prev => ({ ...prev, [itemId]: 'submitting' }));
    try {
      const payload = {
        imageUrl: item.imageUrl,
        prompt: item.description || item.prompt || '默认提示词',
        name: item.name || item.location || '审核图像' // 将名称传给后端，以便同步全局状态
      };
      const { data } = await api.post('/video/approve-image', payload);
      if (data.taskId) {
        setApprovalStatus(prev => ({ ...prev, [itemId]: 'success' }));
        // 保存成功的 assetUri 和 httpUrl 供后续分镜使用
        if (data.assetUri) {
          setApprovedAssets(prev => ({
            ...prev,
            [item.name || item.location]: {
              uri: data.assetUri,
              httpUrl: item.imageUrl
            }
          }));
        }
        // 不要清除成功状态，让它一直显示
      } else {
        throw new Error('未返回任务 ID');
      }
    } catch (e) {
      setApprovalStatus(prev => ({ ...prev, [itemId]: 'error' }));
      setTimeout(() => {
        setApprovalStatus(prev => {
          const next = { ...prev };
          delete next[itemId];
          return next;
        });
      }, 3000);
    }
  };

  useEffect(() => {
    if (!genTaskId) return;
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    pollTimerRef.current = setInterval(async () => {
      const currentWfId = activeWorkflowIdRef.current;
      try {
        const { data } = await api.get(`/video/tasks/${encodeURIComponent(genTaskId)}`);
        if (currentWfId !== activeWorkflowIdRef.current) return;
        const status = data?.status;
        if (status) setGenStatus(status);
        
        let taskError = null;
        if (status === 'failed') {
          // 有些 API 返回错误在 error 字段，有些在 data 顶层，如果都没有，我们去调 /messages 接口拿详细错误
          taskError = data?.error || data?.latest?.error || null;
          
          if (!taskError) {
             try {
               const r = await api.get(`/video/messages/${encodeURIComponent(genTaskId)}`);
               const latest = r?.data?.latest || r?.data;
               if (latest && latest.error) {
                 taskError = latest.error;
               } else {
                 taskError = '视频生成失败';
               }
             } catch (err) {
               taskError = '视频生成失败';
             }
          }
        }

        if (status === 'completed' || status === 'failed') {
          let mediaUrl = '';
          let thumbUrl = '';

          if (status === 'completed') {
            const r = await api.get(`/video/messages/${encodeURIComponent(genTaskId)}`);
            if (currentWfId !== activeWorkflowIdRef.current) return;
            // 根据新接口的数据结构，获取实际的 mediaUrl 和 thumbnailUrl
            const latest = r?.data?.latest || r?.data;
            if (latest) {
              mediaUrl = latest.mediaUrl;
              thumbUrl = latest.thumbnailUrl;

              setVideoOutput(prev => {
                if (!prev) {
                  return {
                    id: genTaskId,
                    title: `${(scriptTitle && scriptTitle.trim()) ? scriptTitle.trim() : '未命名剧本'} - 生成结果`,
                    status: 'completed',
                    mediaUrl: mediaUrl,
                    thumbnailUrl: thumbUrl
                  };
                }
                return prev;
              });
            }
          }

          setEpisodes(prev => {
            let nextIncomplete = null;
            const next = prev.map(ep => {
              if (ep.taskId === genTaskId) {
                return {
                  ...ep,
                  status,
                  videoUrl: mediaUrl || ep.videoUrl,
                  thumb: thumbUrl || ep.thumb,
                  error: taskError || ep.error
                };
              }
              return ep;
            });

            // 如果状态变为了 completed，同步更新到数据库
            if (status === 'completed' && mediaUrl) {
              const updatedEp = next.find(ep => ep.taskId === genTaskId);
              if (updatedEp) {
                api.post('/storage/episodes', { episodes: [updatedEp] }).catch(console.error);
              }
            }

            // 查找下一个还需要轮询的任务
            nextIncomplete = next.find(ep => (ep.status === 'submitted' || ep.status === 'running') && ep.taskId);
            if (nextIncomplete) {
              setTimeout(() => {
                setGenTaskId(nextIncomplete.taskId);
                setGenStatus(nextIncomplete.status);
              }, 0);
            } else {
              // 全部完成
              setTimeout(() => {
                setGenTaskId('');
                setGenStatus('completed'); // 更新整体状态为已完成
              }, 0);
            }

            if (pollTimerRef.current && (!nextIncomplete)) {
              clearInterval(pollTimerRef.current);
              pollTimerRef.current = null;
            }

            return next;
          });
        }
      } catch (e) {
        setError(e?.response?.data?.error || e.message || '轮询失败');
      }
    }, 7000);
    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [genTaskId, scriptTitle]);

  return (
    <div className="flex flex-col md:flex-row gap-6">
      {/* 左侧工作流列表 */}
      <div className="w-full md:w-64 flex-shrink-0 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">生成剧集</h3>
          <Button size="small" onClick={handleCreateWorkflow} title="新建剧集">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          </Button>
        </div>
        <div className="space-y-2 max-h-[80vh] overflow-y-auto pr-2">
          {workflows.map(wf => (
            <div
              key={wf.id}
              onClick={() => switchWorkflow(wf)}
              className={`p-3 rounded-xl border cursor-pointer transition-colors group ${activeWorkflowId === wf.id
                  ? 'bg-primary/10 border-primary text-primary'
                  : 'bg-card border-border hover:border-primary/50'
                }`}
            >
              <div className="flex items-center justify-between">
                {editingWorkflowId === wf.id ? (
                  <input
                    type="text"
                    value={editingWorkflowTitle}
                    onChange={(e) => setEditingWorkflowTitle(e.target.value)}
                    onBlur={() => handleSaveWorkflowTitle(wf.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveWorkflowTitle(wf.id);
                      if (e.key === 'Escape') setEditingWorkflowId(null);
                    }}
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                    className="w-full text-sm font-medium bg-background border border-primary rounded px-1.5 py-0.5 outline-none mr-2"
                  />
                ) : (
                  <div className="flex items-center gap-2 flex-1 min-w-0 pr-2">
                    <div
                      className="font-medium text-sm truncate cursor-text"
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        setEditingWorkflowId(wf.id);
                        setEditingWorkflowTitle(wf.title || '新剧集工作流');
                      }}
                      title="双击修改名称"
                    >
                      {wf.title || '新剧集工作流'}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingWorkflowId(wf.id);
                        setEditingWorkflowTitle(wf.title || '新剧集工作流');
                      }}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary transition-opacity flex-shrink-0"
                      title="编辑名称"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                  </div>
                )}
                <button
                  onClick={(e) => handleDeleteWorkflow(wf.id, e)}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                  title="删除"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {new Date(wf.updatedAt * 1000).toLocaleString(undefined, { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          ))}
          {workflows.length === 0 && (
            <div className="text-sm text-muted-foreground text-center py-4">
              暂无剧集，请新建
            </div>
          )}
        </div>
      </div>

      {/* 右侧工作流主体内容 */}
      <div className="flex-1 space-y-8 min-w-0">
        {/* 阶段指示器 */}
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold gradient-text">AI 短视频生成</h2>
          <div className="flex items-center gap-4">
            <button onClick={() => setStage(1)} className={`flex flex-col items-center cursor-pointer ${stage >= 1 ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${stage >= 1 ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}>
                1
              </div>
              <span className="text-xs mt-1">输入剧本</span>
            </button>
            <div className={`w-12 h-1 ${stage >= 2 ? 'bg-primary' : 'bg-secondary'}`}></div>
            <button onClick={() => setStage(2)} className={`flex flex-col items-center cursor-pointer ${stage >= 2 ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${stage >= 2 ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}>
                2
              </div>
              <span className="text-xs mt-1">生成图像</span>
            </button>
            <div className={`w-12 h-1 ${stage >= 3 ? 'bg-primary' : 'bg-secondary'}`}></div>
            <button onClick={() => setStage(3)} className={`flex flex-col items-center cursor-pointer ${stage >= 3 ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${stage >= 3 ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}>
                3
              </div>
              <span className="text-xs mt-1">生成分镜</span>
            </button>
            <div className={`w-12 h-1 ${stage >= 4 ? 'bg-primary' : 'bg-secondary'}`}></div>
            <button onClick={() => setStage(4)} className={`flex flex-col items-center cursor-pointer ${stage >= 4 ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${stage >= 4 ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}>
                4
              </div>
              <span className="text-xs mt-1">产出视频</span>
            </button>
          </div>
        </div>

        {/* 阶段 1: 输入剧本 */}
        {stage === 1 && (
          <div className="space-y-8">
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center gap-4">
                  <div className="text-xl font-semibold">短剧 Agent</div>
                  <div className="text-sm text-muted-foreground">一键生成 15s 分集脚本</div>
                </div>
                
                {/* 模式切换 Tab */}
                <div className="flex border-b border-border">
                  <button
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${scriptGenMode === 'prompt' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                    onClick={() => setScriptGenMode('prompt')}
                  >
                    需求生成
                  </button>
                  <button
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${scriptGenMode === 'novel' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                    onClick={() => setScriptGenMode('novel')}
                  >
                    小说拆解
                  </button>
                </div>

                <div className="rounded-2xl border border-border bg-card p-4 mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-3">
                      {scriptGenMode === 'prompt' ? (
                        <textarea
                          value={aiPrompt}
                          onChange={(e) => setAiPrompt(e.target.value)}
                          placeholder="在此输入你的创作要求：人物设定、故事线索、风格基调、目标受众、结局倾向等"
                          className="w-full h-32 rounded-xl border border-border bg-background px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      ) : (
                        <div className="w-full h-32 rounded-xl border-2 border-dashed border-border bg-background/50 hover:bg-background transition-colors flex flex-col items-center justify-center text-sm relative group cursor-pointer overflow-hidden">
                          <input 
                            type="file" 
                            accept=".txt"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            onChange={(e) => {
                              const file = e.target.files[0];
                              if (!file) return;
                              setNovelFileName(file.name);
                              const reader = new FileReader();
                              reader.onload = (event) => {
                                setNovelText(event.target.result || '');
                              };
                              reader.readAsText(file);
                            }}
                          />
                          <div className="flex flex-col items-center justify-center gap-2 pointer-events-none p-4 text-center">
                            {novelText ? (
                              <>
                                <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                                <span className="text-foreground font-medium truncate max-w-full px-2">{novelFileName || '已加载文本'}</span>
                                <span className="text-xs text-muted-foreground">{novelText.length} 字符 • 点击重新上传</span>
                              </>
                            ) : (
                              <>
                                <svg className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
                                <span className="text-muted-foreground group-hover:text-foreground transition-colors">点击上传或拖拽 TXT 小说文件到此处</span>
                                <span className="text-xs text-muted-foreground/70">支持自动处理超长文本</span>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="md:col-span-1">
                      <div className="space-y-4">
                        {scriptGenMode === 'prompt' && (
                          <div className="space-y-2">
                            <label className="text-sm font-medium">提示词模版</label>
                            <select
                              value={selectedTemplateId}
                              onChange={(e) => setSelectedTemplateId(e.target.value)}
                              className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm"
                            >
                              {templates.filter(t => !t.sceneType || t.sceneType === 'script').length === 0 && <option value="">暂无模版</option>}
                              {templates.filter(t => !t.sceneType || t.sceneType === 'script').map(tpl => <option key={tpl.id} value={tpl.id}>{tpl.name}</option>)}
                            </select>
                          </div>
                        )}
                        <div className="space-y-2">
                          <label className="text-sm font-medium">集数</label>
                          <select
                            value={aiCount}
                            onChange={(e) => setAiCount(Number(e.target.value))}
                            className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm"
                          >
                            {[3, 5, 6, 8].map(n => <option key={n} value={n}>{n} 集</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="mt-4">
                        <Button
                        onClick={async () => {
                          setError('');
                          setLoading(true);
                          setAiEpisodes([]); // 清空旧的剧本摘要数据
                          const currentWfId = activeWorkflowIdRef.current;
                          try {
                            let finalPrompt = scriptGenMode === 'novel' ? novelText : aiPrompt;
                            if (scriptGenMode === 'novel') {
                              finalPrompt = novelText;
                            } else if (selectedTemplateId) {
                              const tpl = templates.find(t => t.id.toString() === selectedTemplateId);
                              if (tpl && tpl.userPrompt) {
                                finalPrompt = `【系统设定】\n${tpl.userPrompt}\n\n【用户要求】\n${aiPrompt}`;
                              }
                            }
                            
                            const { data } = await api.post('/video/ai-episodes', { 
                              prompt: finalPrompt, 
                              count: aiCount,
                              isNovelMode: scriptGenMode === 'novel'
                            });
                            if (currentWfId !== activeWorkflowIdRef.current) return;
                            const eps = Array.isArray(data?.episodes) ? data.episodes : [];
                              setAiEpisodes(eps);
                              setAiVia(data?.via || '');

                              // 同步生成的剧本内容到第二步
                              if (eps.length > 0) {
                                const combinedScript = eps.map((ep, idx) => `第${idx + 1}集：${ep.title}\n${ep.script}`).join('\n\n');
                                setScriptContent(combinedScript);
                                const inputForTitle = scriptGenMode === 'novel' ? novelText : aiPrompt;
                                if (!scriptTitle && inputForTitle) {
                                  setScriptTitle(inputForTitle.slice(0, 20));
                                }
                              }
                            } catch (e) {
                              setError(e?.response?.data?.error || e.message || '生成失败');
                            } finally {
                              setLoading(false);
                            }
                          }}
                          disabled={loading || (scriptGenMode === 'novel' ? !novelText.trim() : !aiPrompt.trim())}
                          className="w-full"
                        >
                          {loading ? '生成中…' : '开始创作'}
                        </Button>
                      </div>
                      <div className="text-xs text-muted-foreground mt-2">生成 100 字精梳设定；模型可能有缓存，已加入随机种子提升多样性</div>
                    </div>
                  </div>
                </div>
              </div>
              {aiEpisodes.length > 0 && (
                <div className="space-y-4">
                  <div className="text-lg font-semibold">剧本摘要</div>
                  {aiVia && (
                    <div className="text-xs text-muted-foreground">AI 来源：{aiVia === 'ark' ? '大模型' : 'fallback 草案（解析失败）'}</div>
                  )}
                  <div className="space-y-3">
                    {aiEpisodes.map((ep, idx) => (
                      <div key={`ep-${idx}`} className="rounded-2xl border border-border bg-card p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-medium">第 {idx + 1} 集：{ep.title}</div>
                          <div className="text-xs text-muted-foreground">时长 {ep.durationSec || 15}s</div>
                        </div>
                        <div className="text-sm text-muted-foreground mb-2">{ep.summary}</div>
                        <div className="rounded-xl border border-border bg-background p-3 text-sm leading-6 whitespace-pre-wrap">{ep.script}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 阶段 2: 生成人物主体图和场景图 */}
        {stage === 2 && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium">剧本内容</label>
                <textarea
                  value={scriptContent}
                  onChange={(e) => setScriptContent(e.target.value)}
                  placeholder="在此粘贴或编写剧本文本，系统将自动分析人物与场景并生成提示词"
                  className="w-full min-h-32 rounded-2xl border border-border bg-background px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium">生成模板</label>
                <div className="flex gap-2 items-center">
                  {templates.length > 0 ? (
                    <select
                      className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      value={imageTemplateId}
                      onChange={(e) => setImageTemplateId(e.target.value)}
                    >
                      {templates.filter(t => t.sceneType === 'image').map(tpl => (
                        <option key={tpl.id} value={tpl.id}>{tpl.name}</option>
                      ))}
                    </select>
                  ) : (
                    <div className="text-sm text-muted-foreground">暂无生图模板，将使用默认配置</div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="px-2 py-1 rounded-full bg-muted text-xs">备选角色 {characters.length}</span>
                  <span className="px-2 py-1 rounded-full bg-muted text-xs">生成场景 {scenes.length}</span>
                </div>
                <Button
                  onClick={handleGenerateImages}
                  disabled={loading}
                  size="large"
                  className="w-full md:w-auto"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="loading-spinner"></div>
                      <span>生成中...</span>
                    </div>
                  ) : '生成人物和场景图像'}
                </Button>
              </div>
              {error ? (
                <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg">
                  {error}
                </div>
              ) : (
                <div className="bg-card px-4 py-3 rounded-2xl border border-border text-sm text-muted-foreground">
                  系统将根据剧本内容生成人物主体图和场景图。
                </div>
              )}
            </div>

            {(characters.length > 0 || scenes.length > 0) && (
              <div className="space-y-6">
                {characters.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">人物角色</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                      {characters.map((c) => (
                        <Card
                          key={`char-${c.id}`}
                          className="cursor-pointer hover:shadow-md"
                          onClick={() => {
                            setEditorType('character');
                            setEditorItem(c);
                            setEditorOpen(true);
                          }}
                        >
                          <CardHeader className="p-3 relative">
                            <CardTitle className="text-base pr-16">{c.name}</CardTitle>
                            <CardDescription>{c.description}</CardDescription>
                            {approvalStatus[`character-${c.id}`] === 'success' && (
                              <div className="absolute top-3 right-3 bg-green-100 text-green-700 text-[10px] font-bold px-2 py-1 rounded-full border border-green-200 shadow-sm">
                                已审核通过
                              </div>
                            )}
                          </CardHeader>
                          <CardContent className="p-3">
                            <img src={c.imageUrl} alt={c.name} className="w-full rounded-md border border-border" />
                            <div className="flex gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
                              <Button variant="outline" size="small" className="flex-1 text-xs" onClick={() => handleDeleteImage('character', c.id)}>删除</Button>
                              <Button size="small" className="flex-1 text-xs" disabled={approvalStatus[`character-${c.id}`] === 'submitting'} onClick={() => handleApproveImage(c, 'character')}>
                                {approvalStatus[`character-${c.id}`] === 'submitting' ? '提交中...' : approvalStatus[`character-${c.id}`] === 'success' ? '提交成功' : approvalStatus[`character-${c.id}`] === 'error' ? '提交失败' : '提交审核'}
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
                {scenes.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">场景图像</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                      {scenes.map((s) => (
                        <Card
                          key={`scene-${s.id}`}
                          className="cursor-pointer hover:shadow-md"
                          onClick={() => {
                            setEditorType('scene');
                            setEditorItem(s);
                            setEditorOpen(true);
                          }}
                        >
                          <CardHeader className="p-3 relative">
                            <CardTitle className="text-base pr-16">{s.location}</CardTitle>
                            <CardDescription>{s.description}</CardDescription>
                            {approvalStatus[`scene-${s.id}`] === 'success' && (
                              <div className="absolute top-3 right-3 bg-green-100 text-green-700 text-[10px] font-bold px-2 py-1 rounded-full border border-green-200 shadow-sm">
                                已审核通过
                              </div>
                            )}
                          </CardHeader>
                          <CardContent className="p-3">
                            <img src={s.imageUrl} alt={s.location} className="w-full rounded-md border border-border" />
                            <div className="flex gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
                              <Button variant="outline" size="small" className="flex-1 text-xs" onClick={() => handleDeleteImage('scene', s.id)}>删除</Button>
                              <Button size="small" className="flex-1 text-xs" disabled={approvalStatus[`scene-${s.id}`] === 'submitting'} onClick={() => handleApproveImage(s, 'scene')}>
                                {approvalStatus[`scene-${s.id}`] === 'submitting' ? '提交中...' : approvalStatus[`scene-${s.id}`] === 'success' ? '提交成功' : approvalStatus[`scene-${s.id}`] === 'error' ? '提交失败' : '提交审核'}
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 阶段 3: 生成 15s 不同分镜的提示词 */}
        {stage === 3 && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium">剧本标题</label>
                <Input
                  type="text"
                  value={(scriptTitle && scriptTitle.trim())
                    ? scriptTitle
                    : (scriptContent && scriptContent.trim()
                      ? (scriptContent.trim().split(/\r?\n/)[0] || '未命名剧本')
                      : '未命名剧本')}
                  disabled
                  className="bg-secondary border-border focus:ring-primary"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium">修改次数</label>
                <div className="px-4 py-3 rounded-lg bg-secondary/50 border border-border">
                  {modifyCount}/{MAX_MODIFIES}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex gap-4">
                <Button
                  onClick={handleGenerateStoryboard}
                  disabled={loading}
                  size="large"
                  className="w-full md:w-auto"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="loading-spinner"></div>
                      <span>生成中...</span>
                    </div>
                  ) : '生成分镜提示词'}
                </Button>
                {storyboard.length > 0 && modifyCount < MAX_MODIFIES && (
                  <Button
                    onClick={handleModifyStoryboard}
                    disabled={loading}
                    variant="secondary"
                    size="large"
                    className="w-full md:w-auto"
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <div className="loading-spinner"></div>
                        <span>修改中...</span>
                      </div>
                    ) : '修改分镜提示词'}
                  </Button>
                )}
                {storyboard.length > 0 && (
                  <Button
                    onClick={() => setStage(4)}
                    disabled={loading}
                    variant="outline"
                    size="large"
                    className="w-full md:w-auto"
                  >
                    进入下一阶段
                  </Button>
                )}
              </div>
              {error ? (
                <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg">
                  {error}
                </div>
              ) : (
                <div className="bg-card px-4 py-3 rounded-2xl border border-border text-sm text-muted-foreground">
                  系统将生成 15s 短视频的分镜提示词，支持最多 {MAX_MODIFIES} 次修改。
                </div>
              )}
            </div>

            {storyboard.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">分镜卡片</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {storyboard.map((s, i) => {
                    const thumb = scenes?.[i % Math.max(1, scenes.length)]?.imageUrl || `https://picsum.photos/seed/shot-${i + 1}/640/360`;
                    const mm = String(Math.floor((s.durationSec || 4) / 60)).padStart(2, '0');
                    const ss = String(Math.floor((s.durationSec || 4) % 60)).padStart(2, '0');

                    // 高亮渲染包含 @asset:// 的文本
                    const renderHighlightedText = (text) => {
                      if (!text) return null;
                      // 使用更精确的正则，只匹配资产 ID 部分，避免把后面的汉字或标点带进去
                      const parts = text.split(/(@asset:\/\/[a-zA-Z0-9-_]+)/g);
                      return parts.map((part, index) => {
                        if (part.startsWith('@asset://')) {
                          // 可以截取掉前面的 @asset:// 前缀，或者直接渲染为一个特定样式的标签
                          const assetId = part.replace('@asset://', '');
                          // 寻找是否存在对应的审核通过的资产名，作为标签展示
                          let displayName = '资产';
                          let displayImg = '';

                          // 1. 先通过 uri 从 approvedAssets 中找到中文名字和图片
                          const assetEntry = Object.entries(approvedAssets).find(([name, data]) => {
                            const assetUri = typeof data === 'object' ? data.uri : data;
                            return assetUri === `asset://${assetId}` || assetUri === assetId;
                          });

                          if (assetEntry) {
                            displayName = assetEntry[0];
                            if (typeof assetEntry[1] === 'object' && assetEntry[1].httpUrl) {
                              displayImg = assetEntry[1].httpUrl;
                            }
                          }

                          // 2. 然后去 globalAssets（全局素材中心）里通过 uri 找到真实的源图片 URL
                          if (!displayImg && globalAssets && globalAssets.length > 0) {
                            const fullUri = `asset://${assetId}`;
                            const matchAsset = globalAssets.find(a => a.assetUri === fullUri || a.volcAssetId === assetId);
                            if (matchAsset && matchAsset.sourceUrl) {
                              displayImg = matchAsset.sourceUrl;
                              // 如果 displayName 还没拿到，也可以用素材的名字
                              if (displayName === '资产' && matchAsset.name) {
                                displayName = matchAsset.name;
                              }
                            }
                          }

                          return (
                            <span key={index} className="inline-flex items-center gap-1 bg-primary/10 text-primary px-1.5 py-0.5 rounded text-xs font-mono mx-0.5 border border-primary/20 align-middle" title={part}>
                              {displayImg ? (
                                <img src={displayImg} alt={displayName} className="w-3.5 h-3.5 rounded object-cover" />
                              ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                              )}
                              <span className="truncate max-w-[80px]">{displayName}</span>
                            </span>
                          );
                        }
                        return <span key={index}>{part}</span>;
                      });
                    };

                    return (
                      <div
                        key={`shot-${i}`}
                        className="flex gap-4 p-4 border border-border rounded-2xl bg-card cursor-pointer hover:shadow-md"
                        onClick={() => { setShotEditing({ ...s, thumb }); setShotEditorOpen(true); }}
                      >
                        <div className="relative w-32 h-20 flex-shrink-0 overflow-hidden rounded-xl border border-border">
                          <img src={thumb} alt="" className="absolute inset-0 w-full h-full object-cover" />
                          <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/70 text-white text-xs">{mm}:{ss}</div>
                        </div>
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="text-sm text-muted-foreground">第 {s.shotIndex} 段</div>
                          <div className="text-sm line-clamp-2">{renderHighlightedText(s.visual)}</div>
                          <div className="text-xs text-muted-foreground line-clamp-1">提示词：{renderHighlightedText(s.prompt)}</div>
                          <div className="flex gap-4 pt-1" onClick={(e) => e.stopPropagation()}>
                            <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                              <input
                                type="checkbox"
                                checked={s.connectStart}
                                onChange={() => toggleStoryboardConnection(i, 'connectStart')}
                                disabled={i === 0}
                                className="w-3 h-3 disabled:opacity-50"
                              />
                              <span className={i === 0 ? 'text-muted-foreground/50' : 'text-muted-foreground'}>首帧连接</span>
                            </label>
                            <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                              <input
                                type="checkbox"
                                checked={s.connectEnd}
                                onChange={() => toggleStoryboardConnection(i, 'connectEnd')}
                                disabled={i === storyboard.length - 1}
                                className="w-3 h-3 disabled:opacity-50"
                              />
                              <span className={i === storyboard.length - 1 ? 'text-muted-foreground/50' : 'text-muted-foreground'}>尾帧连接</span>
                            </label>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 阶段 4: 产出完整视频 */}
        {stage === 4 && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium">剧本标题</label>
                <Input
                  type="text"
                  value={(scriptTitle && scriptTitle.trim())
                    ? scriptTitle
                    : (scriptContent && scriptContent.trim()
                      ? (scriptContent.trim().split(/\r?\n/)[0] || '未命名剧本')
                      : '未命名剧本')}
                  disabled
                  className="bg-secondary border-border focus:ring-primary"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium">分镜数量</label>
                <div className="px-4 py-3 rounded-lg bg-secondary/50 border border-border">
                  {storyboard.length || 0} 个分镜
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex flex-wrap gap-4">
                <Button
                  onClick={handleGenerateVideo}
                  disabled={loading}
                  size="large"
                  className="w-full md:w-auto"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="loading-spinner"></div>
                      <span>生成中...</span>
                    </div>
                  ) : '生成完整视频'}
                </Button>
                {genStatus && (
                  <div className="px-4 py-3 rounded-2xl bg-card border border-border text-sm">
                    当前状态：{genStatus}
                  </div>
                )}
                {videoOutput && (
                  <>
                    <Button
                      onClick={handleEnhanceVideo}
                      disabled={loading}
                      variant="secondary"
                      size="large"
                      className="w-full md:w-auto"
                    >
                      {loading ? (
                        <div className="flex items-center gap-2">
                          <div className="loading-spinner"></div>
                          <span>提升中...</span>
                        </div>
                      ) : '提升视频清晰度'}
                    </Button>
                    <Button
                      onClick={handleAddVoiceover}
                      disabled={loading}
                      variant="outline"
                      size="large"
                      className="w-full md:w-auto"
                    >
                      {loading ? (
                        <div className="flex items-center gap-2">
                          <div className="loading-spinner"></div>
                          <span>配音中...</span>
                        </div>
                      ) : '为视频配音'}
                    </Button>
                  </>
                )}
              </div>
              {error ? (
                <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg">
                  {error}
                </div>
              ) : (
                <div className="bg-card px-4 py-3 rounded-2xl border border-border text-sm text-muted-foreground">
                  系统将根据分镜提示词生成完整的 15s 短视频，并支持提升清晰度和配音功能。
                </div>
              )}
            </div>

            {(episodes.length > 0 || videoOutput) && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">共 {Math.max(episodes.length, videoOutput ? 1 : 0)} 集</h3>
                  <div className="text-sm text-muted-foreground">分镜将控时到 100 秒内的短片，以竖版优先为准</div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(episodes.length ? episodes : [{
                    id: videoOutput.id,
                    idx: 1,
                    title: videoOutput.title,
                    duration: 90,
                    people: characters.length || 2,
                    shots: storyboard.length || 8,
                    scenes: scenes.length || 3,
                    thumb: videoOutput.thumbnailUrl || `https://picsum.photos/seed/solo-${Date.now()}/360/640`,
                    videoUrl: videoOutput.mediaUrl
                  }]).map((ep, epIndex) => {
                    const mm = String(Math.floor(ep.duration / 60)).padStart(2, '0');
                    const ss = String(ep.duration % 60).padStart(2, '0');
                    return (
                      <div key={ep.id} className="flex items-stretch gap-4 p-4 border border-border rounded-2xl bg-card">
                        <div className="relative w-28 h-44 flex-shrink-0 overflow-hidden rounded-xl border border-border bg-muted flex items-center justify-center">
                          {ep.videoUrl ? (
                            <video src={ep.videoUrl} className="absolute inset-0 w-full h-full object-cover" controls preload="metadata" />
                          ) : ep.thumb ? (
                            <img src={ep.thumb} alt={ep.title} className="absolute inset-0 w-full h-full object-cover" />
                          ) : ep.status === 'submitted' || ep.status === 'running' ? (
                            <div className="flex flex-col items-center gap-2">
                              <svg className="animate-spin h-6 w-6 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              <span className="text-xs text-muted-foreground">生成中...</span>
                            </div>
                          ) : ep.status === 'failed' ? (
                            <div className="flex flex-col items-center justify-center p-2 text-center h-full w-full bg-secondary/20">
                              <svg className="w-8 h-8 text-destructive mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span className="text-xs text-destructive font-medium mb-1">生成失败</span>
                              {ep.error && <span className="text-[10px] text-destructive/80 leading-tight line-clamp-3 px-1">{ep.error}</span>}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">暂无封面</span>
                          )}
                          {!ep.videoUrl && (
                            <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/70 text-white text-xs">{mm}:{ss}</div>
                          )}
                        </div>
                        <div className="flex-1 flex flex-col justify-between">
                          <div className="space-y-1">
                            <div className="text-sm text-muted-foreground">第 {ep.idx} 集</div>
                            <div className="font-medium line-clamp-2" title={ep.title}>{ep.title}</div>
                            <div className="text-xs text-muted-foreground flex gap-3">
                              <span>参与角色 {ep.people || 0}</span>
                              <span>镜头 {ep.shots || 0}</span>
                              <span>分景 {ep.scenes || 0}</span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button size="small" variant="outline" onClick={() => { setPreviewUrl(ep.videoUrl); setPreviewOpen(true); }} disabled={!ep.videoUrl}>预览</Button>
                            <Button size="small" variant="secondary" onClick={() => { setEpisodeEditing(ep); setEpisodeEditorOpen(true); }} disabled={!ep.videoUrl && ep.status !== 'failed'}>编辑</Button>
                            <Button size="small" disabled={!ep.videoUrl}>导出</Button>
                          </div>
                          {(ep.status === 'failed' || ep.status === 'polling' || ep.status === 'running') && (
                            <div className="mt-2 flex flex-col gap-2">
                              {ep.status === 'failed' && ep.error && (
                                <div className="text-xs text-destructive bg-destructive/10 p-2 rounded border border-destructive/20">
                                  失败原因：{ep.error}
                                </div>
                              )}
                              <div className="flex gap-2">
                                <Button 
                                  size="small" 
                                  variant="outline" 
                                  onClick={() => handleRetryVideo(epIndex)}
                                  className="flex-1 border-primary/50 text-primary hover:bg-primary/10"
                                >
                                  重新生成此片段
                                </Button>
                                {ep.status === 'failed' && (
                                  <Button 
                                    size="small" 
                                    variant="outline" 
                                    onClick={async () => {
                                      const promptText = `画面描述：${storyboard[epIndex]?.visual || ''}\n提示词：${storyboard[epIndex]?.prompt || ''}`;
                                      setDetectPromptText(promptText);
                                      setDetectModalOpen(true);
                                      setDetecting(true);
                                      setDetectResult(null);
                                      try {
                                        const { data } = await api.post('/video/detect-prompt', { prompt: promptText });
                                        setDetectResult(data.result);
                                      } catch (e) {
                                        setDetectResult({ error: '检测失败，请重试' });
                                      } finally {
                                        setDetecting(false);
                                      }
                                    }}
                                    className="flex-1 border-destructive/50 text-destructive hover:bg-destructive/10"
                                  >
                                    检测违禁词
                                  </Button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
        <EditImageModal
          open={editorOpen}
          onClose={() => setEditorOpen(false)}
          item={editorItem}
          type={editorType}
          onSave={async (next) => {
            if (editorType === 'character') {
              setCharacters((prev) => prev.map((c) => (c.id === next.id ? { ...c, ...next } : c)));
              try {
                await api.post('/storage/characters', { name: next.name, description: next.description, imageUrl: next.imageUrl, prompt: next.prompt || '' });
              } catch { }
            } else {
              setScenes((prev) => prev.map((s) => (s.id === next.id ? { ...s, ...next } : s)));
              try {
                await api.post('/storage/scenes', { location: next.location, emotion: next.emotion, imageUrl: next.imageUrl, prompt: next.prompt || '' });
              } catch { }
            }

            // 保存修改后，清空对应的审核状态，因为需要重新提交
            const itemId = `${editorType}-${next.id}`;
            setApprovalStatus(prev => {
              const nextStatus = { ...prev };
              delete nextStatus[itemId];
              return nextStatus;
            });

            setEditorOpen(false);
          }}
          onRegenerate={async (next) => {
            // 重新生成图片后，清空对应的审核状态
            const itemId = `${editorType}-${next.id}`;
            setApprovalStatus(prev => {
              const nextStatus = { ...prev };
              delete nextStatus[itemId];
              return nextStatus;
            });

            try {
              const payload = { prompt: next.prompt };
              const { data } = await api.post('/video/regenerate-image', payload);
              if (data && data.imageUrl) {
                const url = data.imageUrl;
                if (editorType === 'character') {
                  setCharacters((prev) => prev.map((c) => (c.id === next.id ? { ...c, imageUrl: url, prompt: next.prompt } : c)));
                } else {
                  setScenes((prev) => prev.map((s) => (s.id === next.id ? { ...s, imageUrl: url, prompt: next.prompt } : s)));
                }
                return { imageUrl: url };
              }
            } catch (e) {
              console.error('重新生成图片失败:', e);
            }
            return null;
          }}
        />
        <Modal
          open={previewOpen}
          onClose={() => setPreviewOpen(false)}
          title="预览"
          footer={(
            <div className="flex justify-end">
              <Button variant="secondary" onClick={() => setPreviewOpen(false)}>关闭</Button>
            </div>
          )}
        >
          <div className="rounded-xl overflow-hidden border border-border">
            <video src={previewUrl} controls className="w-full rounded-md" />
          </div>
        </Modal>
        <VideoEditorModal
          open={episodeEditorOpen}
          onClose={() => setEpisodeEditorOpen(false)}
          episode={episodeEditing}
          characters={characters}
          scenes={scenes}
          storyboard={storyboard}
          onSave={(next) => {
            setEpisodes((prev) => prev.map((e) => (e.id === next.id ? { ...e, title: next.title } : e)));
            setEpisodeEditorOpen(false);
          }}
        />
        <ShotEditorModal
          open={shotEditorOpen}
          onClose={() => setShotEditorOpen(false)}
          shot={shotEditing}
          scenes={scenes}
          characters={characters}
          approvedAssets={approvedAssets}
          globalAssets={globalAssets}
          onSave={async (next) => {
            setStoryboard((prev) => prev.map((s) => (s.shotIndex === next.shotIndex ? { ...s, ...next } : s)));
            try {
              if (next.id) {
                await api.put(`/storage/storyboards/${next.id}`, next);
              } else {
                const r = await api.post('/storage/storyboards', { storyboard: [next] });
                const created = r?.data?.data?.[0];
                if (created?.id) {
                  setStoryboard((prev) => prev.map((s) => (s.shotIndex === next.shotIndex ? { ...s, id: created.id } : s)));
                }
              }
            } catch { }
            setShotEditorOpen(false);
          }}
        />

        <Modal
          open={detectModalOpen}
          onClose={() => setDetectModalOpen(false)}
          title="检测违禁词"
          footer={(
            <div className="flex justify-end">
              <Button onClick={() => setDetectModalOpen(false)}>关闭</Button>
            </div>
          )}
        >
          <div className="space-y-4">
            <div className="text-sm font-medium">原始提示词：</div>
            <div className="p-4 bg-muted rounded-xl text-sm whitespace-pre-wrap leading-relaxed border border-border">
              {detecting ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="loading-spinner w-4 h-4"></div>
                  <span>正在调用大模型分析违禁词...</span>
                </div>
              ) : detectResult?.error ? (
                <span className="text-destructive">{detectResult.error}</span>
              ) : detectResult?.words?.length > 0 ? (
                // 高亮显示违禁词
                detectPromptText.split(new RegExp(`(${detectResult.words.join('|')})`, 'gi')).map((part, i) => 
                  detectResult.words.includes(part) ? (
                    <span key={i} className="bg-destructive/20 text-destructive px-1 rounded font-medium border border-destructive/30">
                      {part}
                    </span>
                  ) : (
                    <span key={i}>{part}</span>
                  )
                )
              ) : detectResult ? (
                <span className="text-green-600 font-medium">✅ 未检测到明显的违禁词，可能是其他原因导致生成失败。</span>
              ) : (
                <span>{detectPromptText}</span>
              )}
            </div>
            
            {!detecting && detectResult?.words?.length > 0 && (
              <div className="p-3 bg-destructive/10 rounded-xl border border-destructive/20">
                <div className="text-sm font-medium text-destructive mb-2">检测到以下疑似违禁词：</div>
                <div className="flex flex-wrap gap-2">
                  {detectResult.words.map((word, i) => (
                    <span key={i} className="px-2 py-1 bg-destructive/20 text-destructive text-xs rounded-md">
                      {word}
                    </span>
                  ))}
                </div>
                {detectResult.suggestion && (
                  <div className="mt-3 text-xs text-destructive/80">
                    <span className="font-medium">修改建议：</span>{detectResult.suggestion}
                  </div>
                )}
              </div>
            )}
          </div>
        </Modal>
      </div>
    </div>
  );
}
