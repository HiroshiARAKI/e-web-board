// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
import type { TemplateId, BoardTemplate } from "@/types";
import SimpleBoard, {
  simpleBoardDefaultConfig,
} from "@/components/board/templates/SimpleBoard";
import PhotoClockBoard, {
  photoClockDefaultConfig,
} from "@/components/board/templates/PhotoClockBoard";
import RetroBoard, {
  retroBoardDefaultConfig,
} from "@/components/board/templates/RetroBoard";
import MessageBoard, {
  messageBoardDefaultConfig,
} from "@/components/board/templates/MessageBoard";

/** Registry of all available board templates */
export const templates: Record<TemplateId, BoardTemplate> = {
  simple: {
    id: "simple",
    name: "シンプル掲示板",
    description:
      "画像/動画のスライドショーとテキストティッカーのシンプルな電子掲示板",
    defaultConfig: simpleBoardDefaultConfig,
    component: SimpleBoard,
  },
  "photo-clock": {
    id: "photo-clock",
    name: "フォトクロック",
    description: "写真スライドショーに日時オーバーレイを重ねた表示",
    defaultConfig: photoClockDefaultConfig,
    component: PhotoClockBoard,
  },
  retro: {
    id: "retro",
    name: "レトロ掲示板",
    description:
      "駅の案内板風ドットマトリクスデザインのクラシックな掲示板",
    defaultConfig: retroBoardDefaultConfig,
    component: RetroBoard,
  },
  message: {
    id: "message",
    name: "メッセージ掲示板",
    description:
      "外部APIからのメッセージをリアルタイム表示する掲示板",
    defaultConfig: messageBoardDefaultConfig,
    component: MessageBoard,
  },
};

export function getTemplate(templateId: string): BoardTemplate | undefined {
  return templates[templateId as TemplateId];
}
