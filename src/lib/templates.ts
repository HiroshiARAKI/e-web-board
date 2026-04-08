import type { TemplateId, BoardTemplate } from "@/types";
import SimpleBoard, {
  simpleBoardDefaultConfig,
} from "@/components/board/templates/SimpleBoard";

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
    defaultConfig: {},
    component: SimpleBoard, // placeholder — will be replaced in Issue #4
  },
  retro: {
    id: "retro",
    name: "レトロ掲示板",
    description:
      "駅の案内板風ドットマトリクスデザインのクラシックな掲示板",
    defaultConfig: {},
    component: SimpleBoard, // placeholder — will be replaced in Issue #5
  },
  message: {
    id: "message",
    name: "メッセージ掲示板",
    description:
      "外部APIからのメッセージをリアルタイム表示する掲示板",
    defaultConfig: {},
    component: SimpleBoard, // placeholder — will be replaced in Issue #6
  },
};

export function getTemplate(templateId: string): BoardTemplate | undefined {
  return templates[templateId as TemplateId];
}
