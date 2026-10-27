"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ActionButton } from "@/components/admin/action-button";
import { FileIcon, TrashIcon, UploadIcon } from "@/components/icons";

type FileItem = {
  id: string;
  originalName: string;
  sizeBytes: number;
  mimeType: string;
  sha256: string;
  createdAt: string;
};

export function ProductFiles({ productId, files }: { productId: string; files: FileItem[] }) {
  const [uploading, setUploading] = useState(false);
  const router = useRouter();

  async function upload(file: File) {
    setUploading(true);
    try {
      const data = new FormData();
      data.append("file", file);
      const response = await fetch(`/api/admin/products/${productId}/files`, { method: "POST", body: data });
      const payload = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!response.ok || !payload.ok) throw new Error(payload.error ?? "Falha no upload.");
      toast.success("Arquivo enviado ao storage privado.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao enviar arquivo.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-white/[0.08] bg-ink-850/50 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-base font-semibold text-white">Arquivos digitais</h2>
          <p className="mt-1 text-[11px] leading-5 text-zinc-500">
            Armazenamento privado. O cliente recebe acesso por rota autenticada, nunca por URL pública.
          </p>
        </div>
        <label className={`btn-primary btn-sm cursor-pointer ${uploading ? "pointer-events-none opacity-50" : ""}`}>
          <UploadIcon /> {uploading ? "Enviando..." : "Enviar arquivo"}
          <input
            type="file"
            accept=".pdf,.xlsx,.xls,.csv,.docx,.doc,.txt,.zip"
            className="hidden"
            disabled={uploading}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void upload(file);
              event.target.value = "";
            }}
          />
        </label>
      </div>

      <div className="mt-4 space-y-2">
        {files.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-center">
            <FileIcon className="mx-auto mb-2 text-xl text-zinc-700" />
            <p className="text-xs text-zinc-500">Nenhum arquivo enviado. Sem arquivo, o cliente não recebe download.</p>
          </div>
        ) : (
          files.map((file) => (
            <div key={file.id} className="flex flex-col gap-3 rounded-xl border border-white/[0.08] bg-white/[0.02] p-3 sm:flex-row sm:items-center">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-wine-300">
                <FileIcon />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-zinc-200">{file.originalName}</p>
                <p className="mt-0.5 text-[10px] text-zinc-600">
                  {(file.sizeBytes / 1024 / 1024).toFixed(2)} MB · {file.mimeType} · sha256 {file.sha256.slice(0, 12)}…
                </p>
              </div>
              <ActionButton
                url={`/api/admin/files/${file.id}`}
                method="DELETE"
                confirmMessage={`Remover o arquivo "${file.originalName}"?`}
                className="btn-danger btn-sm"
                pendingLabel="Removendo..."
              >
                <TrashIcon /> Remover
              </ActionButton>
            </div>
          ))
        )}
      </div>
      <p className="mt-3 text-[10px] leading-5 text-zinc-600">
        Formatos aceitos: PDF, XLSX, XLS, CSV, DOCX, DOC, TXT e ZIP, até 30 MB. O conteúdo é validado pela assinatura do arquivo.
      </p>
    </section>
  );
}
