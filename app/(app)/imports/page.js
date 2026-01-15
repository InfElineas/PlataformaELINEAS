"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useAuthSession } from "@/components/providers/AuthSessionProvider";
import { PERMISSIONS } from "@/lib/auth/permissions";

function SectionTitle({ title, description }) {
  return (
    <div className="flex flex-col gap-1">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      {description ? (
        <p className="text-sm text-muted-foreground">{description}</p>
      ) : null}
    </div>
  );
}

function StatsList({ stats }) {
  if (!stats) return null;
  return (
    <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <div>
        <dt className="text-xs uppercase text-muted-foreground">
          Filas procesadas
        </dt>
        <dd className="text-base font-semibold">{stats.total_rows}</dd>
      </div>
      <div>
        <dt className="text-xs uppercase text-muted-foreground">
          Nuevos productos
        </dt>
        <dd className="text-base font-semibold text-emerald-600">
          {stats.imported}
        </dd>
      </div>
      <div>
        <dt className="text-xs uppercase text-muted-foreground">
          Actualizados
        </dt>
        <dd className="text-base font-semibold text-blue-600">
          {stats.updated}
        </dd>
      </div>
      <div>
        <dt className="text-xs uppercase text-muted-foreground">Duplicados</dt>
        <dd className="text-base font-semibold text-amber-600">
          {stats.duplicates}
        </dd>
      </div>
      <div>
        <dt className="text-xs uppercase text-muted-foreground">Errores</dt>
        <dd className="text-base font-semibold text-destructive">
          {stats.failed}
        </dd>
      </div>
    </dl>
  );
}

function PreviewTable({ rows }) {
  if (!rows?.length) return null;
  const headers = Object.keys(rows[0]);
  return (
    <div className="overflow-auto rounded-md border">
      <table className="min-w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            {headers.map((key) => (
              <th
                key={key}
                className="px-3 py-2 text-left font-semibold text-muted-foreground"
              >
                {key}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={idx} className="border-t">
              {headers.map((key) => (
                <td key={key} className="px-3 py-2 text-xs">
                  {String(row[key] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ImportsPage() {
  const { permissions, user, refresh } = useAuthSession();
  const searchParams = useSearchParams();
  const canImport = permissions?.includes(PERMISSIONS.IMPORTS_MANAGE);

  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [excelState, setExcelState] = useState({
    file: null,
    sheetName: "",
    replaceExisting: true,
    structure: "header",
    authMode: "service",
  });
  const [excelResult, setExcelResult] = useState(null);
  const [excelLoading, setExcelLoading] = useState(false);

  const [sheetInput, setSheetInput] = useState("");
  const [sheetList, setSheetList] = useState([]);
  const [selectedSheet, setSelectedSheet] = useState("");
  const [googleMode, setGoogleMode] = useState("single");
  const [googleReplace, setGoogleReplace] = useState(true);
  const [googleStructure, setGoogleStructure] = useState("header");
  const [googleUseOAuth, setGoogleUseOAuth] = useState(false);
  const [googleResult, setGoogleResult] = useState(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [listingSheets, setListingSheets] = useState(false);
  const excelFileRef = useRef(null);

  useEffect(() => {
    if (!canImport) return;
    let ignore = false;
    async function loadHistory() {
      try {
        setHistoryLoading(true);
        const res = await fetch("/api/imports/history");
        if (!res.ok) throw new Error("No se pudo cargar el historial");
        const data = await res.json();
        if (!ignore) {
          setHistory(data.data || []);
        }
      } catch (error) {
        if (!ignore) setMessage(error.message);
      } finally {
        if (!ignore) setHistoryLoading(false);
      }
    }
    loadHistory();
    return () => {
      ignore = true;
    };
  }, [canImport]);

  useEffect(() => {
    const status = searchParams?.get("google_oauth");
    if (!status) return;
    if (status === "success") {
      setMessage("Google Drive vinculado correctamente.");
      refresh?.();
    } else if (status === "error") {
      setMessage("No se pudo completar la vinculación con Google.");
    }
  }, [searchParams, refresh]);

  useEffect(() => {
    setSheetList([]);
    setSelectedSheet("");
  }, [sheetInput]);

  if (!canImport) {
    return (
      <div className="p-8">
        <SectionTitle
          title="Importaciones"
          description="Necesitas permisos de operaciones para acceder a esta sección."
        />
      </div>
    );
  }

  async function connectGoogle() {
    try {
      const res = await fetch("/api/integrations/google/oauth/start");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo iniciar OAuth");
      window.location.href = data.url;
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function disconnectGoogle() {
    try {
      const res = await fetch("/api/integrations/google/oauth", {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "No se pudo desconectar Google");
      }
      setMessage("Cuenta de Google desconectada.");
      refresh?.();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function handleExcelImport(event) {
    event.preventDefault();
    if (!excelState.file) {
      setMessage("Selecciona un archivo .xlsx");
      return;
    }
    setExcelLoading(true);
    setMessage("");
    try {
      const formData = new FormData();
      formData.append("file", excelState.file);
      if (excelState.sheetName)
        formData.append("sheetName", excelState.sheetName);
      formData.append(
        "replaceExisting",
        excelState.replaceExisting ? "true" : "false",
      );
      formData.append("structure", excelState.structure);
      formData.append("authMode", excelState.authMode);
      const res = await fetch("/api/imports/products/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "La importación falló");
      setExcelResult(data.stats);
      setMessage("Archivo importado correctamente.");
      setHistory((prev) => [
        {
          id: data.jobId,
          source: "excel_upload",
          file_name: excelState.file.name,
          created_at: new Date().toISOString(),
          ...data.stats,
        },
        ...prev,
      ]);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setExcelLoading(false);
      setExcelState((prev) => ({ ...prev, file: null }));
      if (excelFileRef.current) {
        excelFileRef.current.value = "";
      }
    }
  }

  async function listSheets() {
    const cleanedInput = sheetInput.trim();
    if (!cleanedInput) {
      setMessage("Pega la URL o ID del documento de Google");
      return;
    }
    setListingSheets(true);
    setMessage("");
    try {
      const query = new URLSearchParams({
        fileId: cleanedInput,
        useOAuth: googleUseOAuth ? "1" : "0",
      }).toString();
      const res = await fetch(`/api/imports/products/worksheets?${query}`);
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error || "No se pudieron listar las hojas");
      setSheetList(data.sheets || []);
      if (data.sheets?.length) setSelectedSheet(data.sheets[0].title);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setListingSheets(false);
    }
  }

  async function handleGoogleImport(event) {
    event.preventDefault();
    const cleanedInput = sheetInput.trim();
    if (!cleanedInput) {
      setMessage("Pega la URL o ID del documento de Google");
      return;
    }
    if (googleMode === "single" && !selectedSheet) {
      setMessage("Selecciona una hoja a importar");
      return;
    }
    setGoogleLoading(true);
    setMessage("");
    try {
      const payload = {
        fileId: cleanedInput,
        sheetName: googleMode === "single" ? selectedSheet : undefined,
        mode: googleMode,
        replaceExisting: googleReplace,
        structure: googleStructure,
        useOAuth: googleUseOAuth,
      };
      const res = await fetch("/api/imports/products/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "La importación falló");
      setGoogleResult(data.stats);
      setMessage("Se importaron los datos del documento.");
      setHistory((prev) => [
        {
          id: data.jobId,
          source: googleMode === "all" ? "google_sheet_all" : "google_sheet",
          file_name: sheetInput,
          created_at: new Date().toISOString(),
          ...data.stats,
        },
        ...prev,
      ]);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-8 p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <SectionTitle
          title="Importaciones"
          description="Carga productos desde plantillas de Excel o sincroniza hojas de Google Drive"
        />
        <div className="sm:flex max-sm:grid items-center gap-3">
          <Badge variant={user?.google_connected ? "default" : "secondary"}>
            Google {user?.google_connected ? "conectado" : "no vinculado"}
          </Badge>
          {user?.google_connected ? (
            <Button variant="outline" onClick={disconnectGoogle}>
              Desconectar Google
            </Button>
          ) : (
            <Button onClick={connectGoogle}>Conectar Google</Button>
          )}
        </div>
      </div>

      {message ? (
        <div className="rounded-md border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          {message}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Importar archivo .xlsx</CardTitle>
            <CardDescription>
              Sube plantillas descargadas de Drive o generadas manualmente.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleExcelImport}>
              <div className="space-y-2">
                <Label htmlFor="excel-file">Archivo</Label>
                <Input
                  id="excel-file"
                  type="file"
                  accept=".xlsx"
                  ref={excelFileRef}
                  onChange={(event) =>
                    setExcelState((prev) => ({
                      ...prev,
                      file: event.target.files?.[0] || null,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="excel-sheet">Hoja específica (opcional)</Label>
                <Input
                  id="excel-sheet"
                  placeholder="Ej. Inventario"
                  value={excelState.sheetName}
                  onChange={(event) =>
                    setExcelState((prev) => ({
                      ...prev,
                      sheetName: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="flex items-center justify-between rounded-md border px-3 py-2">
                <div>
                  <p className="text-sm font-medium">
                    Reemplazar productos existentes
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Realiza upsert en lugar de omitir duplicados.
                  </p>
                </div>
                <Switch
                  checked={excelState.replaceExisting}
                  onCheckedChange={(checked) =>
                    setExcelState((prev) => ({
                      ...prev,
                      replaceExisting: checked,
                    }))
                  }
                />
              </div>
              <div className="flex items-center justify-between rounded-md border px-3 py-2">
                <div>
                  <p className="text-sm font-medium">
                    La hoja tiene encabezados
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Desactiva si usas el formato fijo de Google sin encabezados.
                  </p>
                </div>
                <Switch
                  checked={excelState.structure === "header"}
                  onCheckedChange={(checked) =>
                    setExcelState((prev) => ({
                      ...prev,
                      structure: checked ? "header" : "fixed",
                    }))
                  }
                />
              </div>
              <div className="flex items-center justify-between rounded-md border px-3 py-2">
                <div>
                  <p className="text-sm font-medium">
                    Usar mi sesión de Google (OAuth)
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Recomendado si el archivo está en tu Drive privado.
                  </p>
                </div>
                <Switch
                  checked={excelState.authMode === "oauth"}
                  disabled={!user?.google_connected}
                  onCheckedChange={(checked) =>
                    setExcelState((prev) => ({
                      ...prev,
                      authMode: checked ? "oauth" : "service",
                    }))
                  }
                />
              </div>
              <Button type="submit" disabled={excelLoading}>
                {excelLoading ? "Importando..." : "Importar archivo"}
              </Button>
            </form>
            {excelResult ? (
              <div className="mt-6 space-y-4">
                <StatsList stats={excelResult} />
                <PreviewTable rows={excelResult.preview} />
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Importar desde Google Sheets</CardTitle>
            <CardDescription>
              Conecta directamente un spreadsheet compartido contigo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleGoogleImport}>
              <div className="space-y-2">
                <Label htmlFor="sheet-url">URL o ID del documento</Label>
                <Textarea
                  id="sheet-url"
                  rows={2}
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  value={sheetInput}
                  onChange={(event) => setSheetInput(event.target.value)}
                />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={listSheets}
                  disabled={listingSheets}
                >
                  {listingSheets ? "Consultando..." : "Listar hojas"}
                </Button>
                {sheetList.length ? (
                  <span className="text-xs text-muted-foreground">
                    {sheetList.length} hojas encontradas
                  </span>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-4 text-sm">
                <label className="flex items-center gap-2 font-medium">
                  <input
                    type="radio"
                    name="mode"
                    value="single"
                    checked={googleMode === "single"}
                    onChange={() => setGoogleMode("single")}
                  />
                  Importar una hoja
                </label>
                <label className="flex items-center gap-2 font-medium">
                  <input
                    type="radio"
                    name="mode"
                    value="all"
                    checked={googleMode === "all"}
                    onChange={() => setGoogleMode("all")}
                  />
                  Importar todo el libro
                </label>
              </div>
              {googleMode === "single" ? (
                <div className="space-y-2">
                  <Label>Selecciona hoja</Label>
                  <select
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={selectedSheet}
                    onChange={(event) => setSelectedSheet(event.target.value)}
                  >
                    <option value="">Selecciona una hoja</option>
                    {sheetList.map((sheet) => (
                      <option key={sheet.id} value={sheet.title}>
                        {sheet.title}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
              <div className="flex items-center justify-between rounded-md border px-3 py-2">
                <div>
                  <p className="text-sm font-medium">
                    Reemplazar productos existentes
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Upsert en lugar de omitir duplicados.
                  </p>
                </div>
                <Switch
                  checked={googleReplace}
                  onCheckedChange={setGoogleReplace}
                />
              </div>
              <div className="flex items-center justify-between rounded-md border px-3 py-2">
                <div>
                  <p className="text-sm font-medium">
                    La hoja tiene encabezados
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Desactiva para plantillas sin encabezado.
                  </p>
                </div>
                <Switch
                  checked={googleStructure === "header"}
                  onCheckedChange={(checked) =>
                    setGoogleStructure(checked ? "header" : "fixed")
                  }
                />
              </div>
              <div className="flex items-center justify-between rounded-md border px-3 py-2">
                <div>
                  <p className="text-sm font-medium">Usar OAuth personal</p>
                  <p className="text-xs text-muted-foreground">
                    Necesario si el archivo no es accesible por el service
                    account.
                  </p>
                </div>
                <Switch
                  checked={googleUseOAuth}
                  disabled={!user?.google_connected}
                  onCheckedChange={setGoogleUseOAuth}
                />
              </div>
              <Button type="submit" disabled={googleLoading}>
                {googleLoading ? "Importando..." : "Importar desde Google"}
              </Button>
            </form>
            {googleResult ? (
              <div className="mt-6 space-y-4">
                <StatsList stats={googleResult} />
                <PreviewTable rows={googleResult.preview} />
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historial reciente</CardTitle>
          <CardDescription>
            Últimas ejecuciones almacenadas junto al AuditLog.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <p className="text-sm text-muted-foreground">
              Cargando historial...
            </p>
          ) : history.length ? (
            <div className="overflow-auto rounded-md border">
              <table className="min-w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-muted-foreground">
                      Fecha
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-muted-foreground">
                      Fuente
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-muted-foreground">
                      Archivo/Hoja
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-muted-foreground">
                      Filas
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-muted-foreground">
                      Resultados
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((job) => (
                    <tr key={job.id || job._id} className="border-t">
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        {new Date(job.created_at).toLocaleString()}
                      </td>
                      <td className="px-3 py-2 capitalize">
                        {job.source?.replace(/_/g, " ")}
                      </td>
                      <td className="px-3 py-2">
                        <p className="text-sm font-medium">
                          {job.file_name || "Spreadsheet"}
                        </p>
                        {job.sheet_name ? (
                          <p className="text-xs text-muted-foreground">
                            Hoja: {job.sheet_name}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-3 py-2">{job.total_rows}</td>
                      <td className="px-3 py-2 text-xs">
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline">+{job.imported}</Badge>
                          <Badge variant="outline">upd {job.updated}</Badge>
                          <Badge variant="outline">dup {job.duplicates}</Badge>
                          <Badge
                            variant={job.failed ? "destructive" : "secondary"}
                          >
                            err {job.failed}
                          </Badge>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Aún no hay importaciones registradas.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
