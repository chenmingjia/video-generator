import React, { useState, useEffect } from 'react';
import { api } from '../api/client.js';

function VideoLibraryTab() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/video/list');
      if (res.data && res.data.ok) {
        let list = res.data.data || [];
        // 如果列表中有缺失封面或视频链接的数据，尝试通过 messages 接口修复
        list = await Promise.all(list.map(async (v) => {
          // 如果视频还没有 URL，可能还在 polling 状态，我们去查一下最新状态
          if (!v.video_url && v.task_id) {
            try {
              console.log(`查询视频 ${v.id} (task: ${v.task_id}) 状态`);
              const r = await api.get(`/video/messages/${encodeURIComponent(v.task_id)}`);
              const latest = r.data?.latest;
              if (latest) {
                // 如果状态还在 polling 或 running，我们可以把这个状态记录下来展示给用户
                return {
                  ...v,
                  status: latest.status || 'polling',
                  video_url: latest.mediaUrl || v.video_url,
                  cover_image_url: latest.thumbnailUrl || v.cover_image_url,
                  error: latest.error || v.error
                };
              }
            } catch (e) {
              console.warn(`查询视频 ${v.id} 信息失败`, e);
            }
          }
          return { ...v, status: v.video_url ? 'completed' : 'polling' };
        }));
        setVideos(list);
      } else {
        throw new Error(res.data?.error || '获取视频列表失败');
      }
    } catch (err) {
      console.error(err);
      setError(err.message || '获取视频列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (url) => {
    window.open(url, '_blank');
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">AI 视频库</h2>
        <button
          onClick={fetchVideos}
          className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
        >
          刷新
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded mb-6">
          {error}
        </div>
      )}

      {videos.length === 0 && !error ? (
        <div className="bg-blue-50 text-blue-600 p-4 rounded mb-6">
          暂无生成的视频，快去生成一个吧！
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {videos.map((video) => (
            <div key={video.id} className="bg-card border border-border rounded-lg overflow-hidden flex flex-col hover:shadow-lg transition-shadow">
              <div className="relative pt-[56.25%] bg-black group">
                {video.video_url ? (
                  <video
                    src={video.video_url}
                    className="absolute top-0 left-0 w-full h-full object-cover"
                    controls
                    preload="metadata"
                  />
                ) : video.cover_image_url ? (
                  <img
                    src={video.cover_image_url}
                    alt={video.prompt}
                    className="absolute top-0 left-0 w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute top-0 left-0 w-full h-full flex flex-col items-center justify-center text-white bg-secondary/20 px-2 text-center">
                    {video.status === 'polling' || video.status === 'running' ? (
                      <>
                        <div className="loading-spinner mb-2 border-primary border-t-transparent w-6 h-6 border-2 rounded-full animate-spin"></div>
                        <span className="text-sm text-primary">生成中...</span>
                      </>
                    ) : video.status === 'failed' ? (
                      <>
                        <svg className="w-8 h-8 text-destructive mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-sm text-destructive font-medium mb-1">生成失败</span>
                        {video.error && <span className="text-xs text-destructive/80 line-clamp-3">{video.error}</span>}
                      </>
                    ) : video.status === 'completed' && !video.video_url ? (
                      <span className="text-sm text-yellow-500">完成但未生成链接</span>
                    ) : (
                      <span className="text-sm text-muted-foreground">无封面</span>
                    )}
                  </div>
                )}
                {!video.video_url && video.status !== 'polling' && video.status !== 'running' && video.status !== 'completed' && video.status !== 'failed' && (
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                    <button
                      className="text-white hover:text-primary transition-colors"
                      title="视频未就绪"
                    >
                      <svg className="w-16 h-16 opacity-50" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
              <div className="p-4 flex flex-col flex-grow">
                <p className="text-sm text-muted-foreground mb-4 flex-grow line-clamp-3">
                  {video.prompt}
                </p>
                <div className="flex justify-between items-center mt-auto pt-2 border-t border-border">
                  <span className="text-xs text-muted-foreground">
                    {new Date(video.created_at * 1000).toLocaleString()}
                  </span>
                  <button
                    onClick={() => handleDownload(video.video_url)}
                    className="text-primary hover:text-primary/80"
                    title="下载/打开视频"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default VideoLibraryTab;