// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Trash2, UserPlus } from "lucide-react";
import { useLocale } from "@/components/i18n/LocaleProvider";

interface UserRow {
  id: string;
  userId: string;
  email: string;
  attribute: "owner" | "shared";
  role: string;
  createdAt: string;
}

export function UserManagement() {
  const { t } = useLocale();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create user dialog
  const [showCreate, setShowCreate] = useState(false);
  const [createUserId, setCreateUserId] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createRole, setCreateRole] = useState<"admin" | "general">("general");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  const [invitePreviewUrl, setInvitePreviewUrl] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/users");
      if (res.ok) setUsers(await res.json());
      else setError(t("users.fetchError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  async function handleRoleChange(id: string, role: string) {
    const res = await fetch(`/api/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? t("users.roleChangeError"));
      return;
    }
    setUsers((prev) => prev.map((u) => u.id === id ? { ...u, role } : u));
  }

  async function handleDelete(id: string, userId: string) {
    if (!confirm(t("users.confirmDelete", { userId }))) return;
    const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? t("users.deleteError"));
      return;
    }
    setUsers((prev) => prev.filter((u) => u.id !== id));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: createUserId.trim(),
          email: createEmail.trim(),
          role: createRole,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCreateError(data.error ?? t("users.createError"));
        setInviteSuccess(null);
        return;
      }
      setCreateUserId("");
      setCreateEmail("");
      setCreateRole("general");
      setInviteSuccess(t("users.inviteSuccess"));
      setInvitePreviewUrl(data.previewUrl ?? null);
      await fetchUsers();
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t("users.list")}</h2>
        <Button size="sm" onClick={() => { setShowCreate(true); setCreateError(null); setInviteSuccess(null); setInvitePreviewUrl(null); }}>
          <UserPlus className="mr-1.5 size-4" />
          {t("users.add")}
        </Button>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-xs text-muted-foreground">
                <th className="px-4 py-2 text-left">{t("common.userId")}</th>
                <th className="px-4 py-2 text-left">{t("common.email")}</th>
                <th className="px-4 py-2 text-left">{t("common.attribute")}</th>
                <th className="px-4 py-2 text-left">{t("common.role")}</th>
                <th className="px-4 py-2 text-right">{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium">{user.userId}</td>
                  <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                  <td className="px-4 py-3">
                    <Badge variant={user.attribute === "owner" ? "default" : "secondary"}>
                      {user.attribute === "owner" ? t("users.owner") : t("users.shared")}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Select
                      value={user.role}
                      disabled={user.attribute === "owner"}
                      onValueChange={(v) => handleRoleChange(user.id, v ?? "")}
                    >
                      <SelectTrigger className="h-7 w-28 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">{t("common.roleAdmin")}</SelectItem>
                        <SelectItem value="general">{t("common.roleGeneral")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {user.attribute === "owner" ? (
                      <span className="text-xs text-muted-foreground">{t("users.undeletable")}</span>
                    ) : (
                      <button
                        onClick={() => handleDelete(user.id, user.userId)}
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-red-500 transition-colors hover:bg-red-50 hover:text-red-700"
                        title={t("common.delete")}
                      >
                        <Trash2 className="size-3.5" />
                        {t("common.delete")}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create user dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("users.addDialogTitle")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              {t("users.addDialogDescription")}
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="cu-userId">{t("common.userId")}</Label>
              <Input
                id="cu-userId"
                value={createUserId}
                onChange={(e) => setCreateUserId(e.target.value)}
                placeholder="john_doe"
                pattern="[a-zA-Z0-9_\-]{3,32}"
                title={t("users.userIdHint")}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cu-email">{t("common.email")}</Label>
              <Input
                id="cu-email"
                type="email"
                value={createEmail}
                onChange={(e) => setCreateEmail(e.target.value)}
                placeholder="user@example.com"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cu-role">{t("common.role")}</Label>
              <Select value={createRole} onValueChange={(v) => setCreateRole(v as "admin" | "general")}>
                <SelectTrigger id="cu-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">{t("users.roleAdmin")}</SelectItem>
                  <SelectItem value="general">{t("users.roleGeneral")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {createError && (
              <p className="text-sm text-red-600">{createError}</p>
            )}
            {inviteSuccess && (
              <div className="rounded-md border bg-muted/30 p-3 text-sm">
                <p className="font-medium">{inviteSuccess}</p>
                {invitePreviewUrl && (
                  <a
                    href={invitePreviewUrl}
                    className="mt-1 block break-all text-blue-600 hover:underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {invitePreviewUrl}
                  </a>
                )}
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={creating}>
                {creating ? t("users.createSubmitting") : t("users.inviteSubmit")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
