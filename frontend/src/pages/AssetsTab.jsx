import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/Card';

export default function AssetsTab({ assets = [], loading = false, onRefresh }) {
  return (
    <div className="space-y-6 min-h-[500px]">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="text-xl font-bold">AI 素材中心</div>
        <button 
          onClick={onRefresh}
          disabled={loading}
          className="text-sm px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? '刷新中...' : '刷新状态'}
        </button>
      </div>

      {loading && assets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <div className="loading-spinner mb-4 border-primary"></div>
          <span className="text-sm">加载私域素材中...</span>
        </div>
      ) : assets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground border-2 border-dashed border-border rounded-2xl bg-muted/30">
          <svg className="w-12 h-12 mb-4 text-muted-foreground/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-sm">暂无素材，请在生成视频流程中提交审核素材</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {assets.map((asset) => (
            <Card key={asset.id} className="overflow-hidden hover:shadow-md transition-shadow">
              <div className="relative aspect-video bg-muted border-b border-border flex items-center justify-center">
                {asset.sourceUrl ? (
                  <img src={asset.sourceUrl} alt={asset.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs text-muted-foreground">暂无预览图</span>
                )}
                {/* 状态徽章 */}
                <div className="absolute top-2 right-2">
                  {asset.status === 'active' && (
                    <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-1 rounded-full shadow-sm">
                      可使用
                    </span>
                  )}
                  {asset.status === 'processing' && (
                    <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-1 rounded-full shadow-sm flex items-center gap-1">
                      <div className="w-2 h-2 border-2 border-blue-700 border-t-transparent rounded-full animate-spin"></div>
                      入库中
                    </span>
                  )}
                  {asset.status === 'failed' && (
                    <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-1 rounded-full shadow-sm">
                      入库失败
                    </span>
                  )}
                </div>
              </div>
              <CardHeader className="p-3 pb-0">
                <CardTitle className="text-sm truncate" title={asset.name || asset.filename}>
                  {asset.name || asset.filename || '未命名素材'}
                </CardTitle>
                <CardDescription className="text-xs truncate font-mono mt-1" title={asset.assetUri}>
                  {asset.assetUri || 'URI 生成中...'}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3 pt-2">
                <div className="text-[10px] text-muted-foreground flex justify-between items-center">
                  <span>ID: {asset.id.slice(0, 8)}...</span>
                  <span>{new Date(asset.createdAt || Date.now()).toLocaleDateString()}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
