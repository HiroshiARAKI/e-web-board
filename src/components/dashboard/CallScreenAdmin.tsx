// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
"use client";

import { useState, useEffect, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";
import { RefreshCw, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

function generatePasscode(): string {
  return Array.from({ length: 6 }, () => Math.floor(Math.random() * 10)).join(
    "",
  );
}

interface CallScreenAdminProps {
  boardId: string;
  config: Record<string, unknown>;
  onUpdateConfig: (config: Record<string, unknown>) => void;
}

export default function CallScreenAdmin({
  boardId,
  config,
  onUpdateConfig,
}: CallScreenAdminProps) {
  const [networkOrigin, setNetworkOrigin] = useState("");
  const [copied, setCopied] = useState(false);

  const passcode = (config.passcode as string) ?? "";

  // Fetch local network IP for the URL
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/network");
        if (!res.ok) return;
        const data = await res.json();
        if (data.ip) {
          const port = window.location.port;
          const protocol = window.location.protocol;
          setNetworkOrigin(`${protocol}//${data.ip}${port ? `:${port}` : ""}`);
        } else {
          setNetworkOrigin(window.location.origin);
        }
      } catch {
        setNetworkOrigin(window.location.origin);
      }
    })();
  }, []);

  // Auto-generate passcode if empty
  useEffect(() => {
    if (!passcode) {
      onUpdateConfig({ ...config, passcode: generatePasscode() });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRegenerate = useCallback(() => {
    onUpdateConfig({ ...config, passcode: generatePasscode() });
  }, [config, onUpdateConfig]);

  const callUrl = `${networkOrigin}/call/${boardId}`;
  const callUrlWithPasscode = `${callUrl}?passcode=${passcode}`;

  async function handleCopyUrl() {
    try {
      await navigator.clipboard.writeText(callUrlWithPasscode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API not available
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>呼び出し画面</CardTitle>
        <CardDescription>
          オペレーター用の呼び出し画面URLとパスコード
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Passcode */}
        <div className="space-y-2">
          <label className="text-sm font-medium">パスコード（6桁）</label>
          <div className="flex items-center gap-3">
            <span className="rounded-lg border bg-muted px-4 py-2 font-mono text-2xl tracking-[0.3em]">
              {passcode || "------"}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRegenerate}
            >
              <RefreshCw className="mr-1.5 size-3.5" />
              再生成
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            保存ボタンを押すとパスコードが確定します
          </p>
        </div>

        {/* URL */}
        <div className="space-y-2">
          <label className="text-sm font-medium">呼び出し画面URL</label>
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate rounded-lg border bg-muted px-3 py-2 text-xs">
              {callUrl}
            </code>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopyUrl}
            >
              {copied ? (
                <Check className="mr-1.5 size-3.5 text-green-600" />
              ) : (
                <Copy className="mr-1.5 size-3.5" />
              )}
              {copied ? "コピー済" : "URL+パスコード"}
            </Button>
          </div>
        </div>

        {/* QR Code */}
        {networkOrigin && passcode && (
          <div className="space-y-2">
            <label className="text-sm font-medium">
              QRコード（パスコード込み）
            </label>
            <div className="inline-block rounded-xl border bg-white p-4">
              <QRCodeSVG
                value={callUrlWithPasscode}
                size={200}
                level="M"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              QRコードにはパスコードが含まれるため、スキャンだけでアクセスできます
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
