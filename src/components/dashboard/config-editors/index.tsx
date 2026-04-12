// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
"use client";

import { SimpleBoardConfigEditor } from "./SimpleBoardConfigEditor";
import { PhotoClockConfigEditor } from "./PhotoClockConfigEditor";
import { RetroBoardConfigEditor } from "./RetroBoardConfigEditor";
import { MessageBoardConfigEditor } from "./MessageBoardConfigEditor";

interface ConfigEditorProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

const editors: Record<string, React.ComponentType<ConfigEditorProps>> = {
  simple: SimpleBoardConfigEditor,
  "photo-clock": PhotoClockConfigEditor,
  retro: RetroBoardConfigEditor,
  message: MessageBoardConfigEditor,
};

export function TemplateConfigEditor({
  templateId,
  config,
  onChange,
}: {
  templateId: string;
} & ConfigEditorProps) {
  const Editor = editors[templateId];
  if (!Editor) {
    return (
      <p className="text-sm text-muted-foreground">
        このテンプレートにはビジュアルエディタがありません
      </p>
    );
  }
  return <Editor config={config} onChange={onChange} />;
}
