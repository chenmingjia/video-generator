import React from 'react';

export default function ResultBox({ title, value }) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">{title}</h2>
      <div className="bg-card border border-border rounded-2xl p-4 overflow-auto max-h-96 shadow-sm">
        <pre className="text-sm text-muted-foreground whitespace-pre-wrap break-words">
          {JSON.stringify(value, null, 2)}
        </pre>
      </div>
    </div>
  );
}
