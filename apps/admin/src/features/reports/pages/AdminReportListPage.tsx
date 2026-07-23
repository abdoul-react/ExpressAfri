import { useState } from 'react'
import { Download, Flag, FileText } from 'lucide-react'
import { PermissionGuard } from '@/components/guards/PermissionGuard'
import { useAdminReports, useAdminReport, useUpdateReportStatus } from '../hooks/useAdminReports'
import type { Report, ReportStatus } from '@/infrastructure/data-source/AdminReportDataSource'
import { exportToCSV } from '@/lib/exportCSV'
import {
  PageHeader, Button, Select, SearchInput, DataTable, StatusBadge, Modal,
  ConfirmDialog, FormField, Textarea, type Column,
} from '@/components/ui'
import { REPORT_STATUS, REPORT_TYPE, statusMeta } from '@/lib/status'
import { toast } from '@/lib/toast'

const STATUS_OPTIONS = Object.entries(REPORT_STATUS).map(([value, meta]) => ({ value, label: meta.label }))
const TYPE_OPTIONS = Object.entries(REPORT_TYPE).map(([value, meta]) => ({ value, label: meta.label }))

export function AdminReportListPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const { data, isLoading } = useAdminReports({
    page, search: search || undefined,
    status: statusFilter || undefined, type: typeFilter || undefined,
  })

  const columns: Column<Report>[] = [
    {
      key: 'type', header: 'Type',
      cell: (r) => <StatusBadge map={REPORT_TYPE} value={r.type} size="sm" />,
    },
    {
      key: 'reason', header: 'Motif',
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">{r.reason}</p>
          <p className="mt-0.5 max-w-[280px] truncate text-xs text-gray-500 dark:text-gray-400">{r.description}</p>
        </div>
      ),
    },
    {
      key: 'reporterName', header: 'Signalé par', hideBelow: 'md',
      cell: (r) => (
        <div>
          <p className="text-sm text-gray-700 dark:text-gray-300">{r.reporterName}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">{r.reporterEmail}</p>
        </div>
      ),
    },
    {
      key: 'targetName', header: 'Cible', hideBelow: 'lg',
      cell: (r) => (
        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{r.targetName}</p>
          {r.assignedToName && <p className="text-xs text-gray-400 dark:text-gray-500">Assigné : {r.assignedToName}</p>}
        </div>
      ),
    },
    {
      key: 'status', header: 'Statut',
      cell: (r) => <StatusBadge map={REPORT_STATUS} value={r.status} size="sm" dot />,
    },
    {
      key: 'createdAt', header: 'Date', align: 'right', hideBelow: 'sm',
      cell: (r) => <span className="text-gray-500 dark:text-gray-400">{new Date(r.createdAt).toLocaleDateString('fr-FR')}</span>,
    },
  ]

  return (
    <div>
      <PageHeader
        title="Signalements"
        description={data ? `${data.total} signalement(s)` : 'Modération et gestion des signalements'}
        actions={
          <>
            <PermissionGuard permission="reports.export">
              <Button
                variant="outline"
                leftIcon={Download}
                onClick={() => {
                  if (!data?.data?.length) return
                  const rows = data.data.map((r: Report) => ({
                    ID: r.id,
                    Type: statusMeta(REPORT_TYPE, r.type).label,
                    Motif: r.reason,
                    Description: r.description,
                    Signalé_par: r.reporterName,
                    Email_signalant: r.reporterEmail,
                    Cible: r.targetName,
                    Statut: statusMeta(REPORT_STATUS, r.status).label,
                    Assigné_à: r.assignedToName ?? '',
                    Résolution: r.resolution ?? '',
                    Date: r.createdAt,
                  }))
                  exportToCSV(rows, `signalements_${new Date().toISOString().slice(0, 10)}`)
                }}
              >
                Exporter CSV
              </Button>
            </PermissionGuard>
            <PermissionGuard permission="reports.export">
              <Button
                leftIcon={FileText}
                onClick={() => {
                  if (!data?.data?.length) return
                  const date = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
                  const rows = data.data.map((r: Report) => `
                    <tr style="border-bottom:1px solid gainsboro;">
                      <td style="padding:8px 12px;font-size:13px;color:black;">#${r.id}</td>
                      <td style="padding:8px 12px;font-size:13px;">${statusMeta(REPORT_TYPE, r.type).label}</td>
                      <td style="padding:8px 12px;font-size:13px;color:dimgray;">${r.reason}</td>
                      <td style="padding:8px 12px;font-size:13px;">${r.reporterName}</td>
                      <td style="padding:8px 12px;font-size:13px;">${r.targetName}</td>
                      <td style="padding:8px 12px;font-size:13px;font-weight:600;">${statusMeta(REPORT_STATUS, r.status).label}</td>
                      <td style="padding:8px 12px;font-size:12px;color:gray;">${new Date(r.createdAt).toLocaleDateString('fr-FR')}</td>
                    </tr>`).join('')
                  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
                    <title>Rapport Signalements — ${date}</title>
                    <style>
                      body{font-family:'Segoe UI',Arial,sans-serif;margin:0;padding:32px;color:black;}
                      h1{font-size:22px;font-weight:700;margin-bottom:4px;}
                      p{font-size:13px;color:gray;margin-bottom:24px;}
                      table{width:100%;border-collapse:collapse;}
                      th{background:whitesmoke;padding:10px 12px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:gray;border-bottom:2px solid gainsboro;}
                      tr:hover{background:whitesmoke;}
                      @media print{body{padding:16px;}}
                    </style>
                  </head><body>
                    <h1>Rapport des Signalements</h1>
                    <p>Généré le ${date} · ${data.total} signalement(s) au total · Filtres actifs : ${[statusFilter && statusMeta(REPORT_STATUS, statusFilter).label, typeFilter && statusMeta(REPORT_TYPE, typeFilter).label].filter(Boolean).join(', ') || 'Aucun'}</p>
                    <table>
                      <thead><tr>
                        <th>ID</th><th>Type</th><th>Motif</th><th>Signalé par</th><th>Cible</th><th>Statut</th><th>Date</th>
                      </tr></thead>
                      <tbody>${rows}</tbody>
                    </table>
                  </body></html>`
                  const win = window.open('', '_blank')
                  if (!win) return
                  win.document.write(html)
                  win.document.close()
                  win.focus()
                  setTimeout(() => win.print(), 400)
                }}
              >
                Générer rapport
              </Button>
            </PermissionGuard>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <SearchInput
          value={search}
          onChange={(v) => { setSearch(v); setPage(1) }}
          placeholder="Rechercher…"
          size="sm"
          className="min-w-[200px] flex-1"
        />
        <Select
          value={statusFilter}
          onChange={(v) => { setStatusFilter(v); setPage(1) }}
          options={STATUS_OPTIONS}
          placeholder="Tous les statuts"
          size="sm"
        />
        <Select
          value={typeFilter}
          onChange={(v) => { setTypeFilter(v); setPage(1) }}
          options={TYPE_OPTIONS}
          placeholder="Tous les types"
          size="sm"
        />
      </div>

      <DataTable<Report>
        data={data?.data ?? []}
        columns={columns}
        rowKey={(r) => r.id}
        loading={isLoading}
        onRowClick={(r) => setSelectedId(r.id)}
        empty={{ icon: Flag, title: 'Aucun signalement', description: 'Aucun signalement ne correspond à ces critères.' }}
        pagination={data ? { page, pageSize: 15, total: data.total, onPageChange: setPage } : undefined}
      />

      {selectedId && <ReportDetailModal reportId={selectedId} onClose={() => setSelectedId(null)} />}
    </div>
  )
}

function ReportDetailModal({ reportId, onClose }: { reportId: string; onClose: () => void }) {
  const { data: report, refetch } = useAdminReport(reportId)
  const updateStatus = useUpdateReportStatus()
  const [resolution, setResolution] = useState('')
  const [showResolve, setShowResolve] = useState(false)
  const [confirmDismiss, setConfirmDismiss] = useState(false)

  if (!report) return null

  async function handleStatusChange(status: ReportStatus) {
    try {
      await updateStatus.mutateAsync({
        id: reportId, status,
        resolution: status === 'resolved' || status === 'dismissed' ? resolution : undefined,
      })
      setShowResolve(false)
      setResolution('')
      refetch()
      toast.success('Statut du signalement mis à jour')
    } catch {
      toast.error('Erreur lors de la mise à jour du statut')
    }
  }

  return (
    <>
      <Modal
        open
        onOpenChange={(o) => { if (!o) onClose() }}
        title={`Signalement #${report.id}`}
        size="md"
      >
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <StatusBadge map={REPORT_TYPE} value={report.type} />
            <StatusBadge map={REPORT_STATUS} value={report.status} dot />
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="block text-xs font-medium text-gray-500 dark:text-gray-400">Signalé par</span>
              <span className="text-gray-700 dark:text-gray-300">
                {report.reporterName}<br />
                <span className="text-xs text-gray-400 dark:text-gray-500">{report.reporterEmail}</span>
              </span>
            </div>
            <div>
              <span className="block text-xs font-medium text-gray-500 dark:text-gray-400">Cible</span>
              <span className="text-gray-700 dark:text-gray-300">
                {report.targetName}<br />
                <span className="text-xs text-gray-400 dark:text-gray-500">{report.targetId}</span>
              </span>
            </div>
            <div className="col-span-2">
              <span className="block text-xs font-medium text-gray-500 dark:text-gray-400">Motif</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">{report.reason}</span>
            </div>
            <div className="col-span-2">
              <span className="block text-xs font-medium text-gray-500 dark:text-gray-400">Description</span>
              <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">{report.description}</p>
            </div>
            {report.assignedToName && (
              <div className="col-span-2">
                <span className="block text-xs font-medium text-gray-500 dark:text-gray-400">Assigné à</span>
                <span className="text-gray-700 dark:text-gray-300">{report.assignedToName}</span>
              </div>
            )}
            {report.resolution && (
              <div className="col-span-2">
                <span className="block text-xs font-medium text-green-600 dark:text-green-400">Résolution</span>
                <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">{report.resolution}</p>
              </div>
            )}
          </div>

          <div className="border-t border-gray-200 pt-4 dark:border-gray-800">
            <p className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">Actions</p>
            <div className="flex flex-wrap gap-2">
              {report.status !== 'resolved' && report.status !== 'dismissed' && (
                <>
                  <PermissionGuard permission="reports.update">
                    <Button size="sm" onClick={() => handleStatusChange('investigating')} loading={updateStatus.isPending}>
                      Prendre en charge
                    </Button>
                  </PermissionGuard>
                  <PermissionGuard permission="reports.update">
                    <Button size="sm" variant="outline" onClick={() => setShowResolve(true)}>
                      Résoudre
                    </Button>
                  </PermissionGuard>
                  <PermissionGuard permission="reports.update">
                    <Button size="sm" variant="outline" onClick={() => setConfirmDismiss(true)} disabled={updateStatus.isPending}>
                      Rejeter
                    </Button>
                  </PermissionGuard>
                </>
              )}
              {(report.status === 'resolved' || report.status === 'dismissed') && (
                <PermissionGuard permission="reports.update">
                  <Button size="sm" variant="outline" onClick={() => handleStatusChange('pending')}>
                    Rouvrir
                  </Button>
                </PermissionGuard>
              )}
            </div>

            {showResolve && (
              <div className="mt-4 space-y-3">
                <FormField label="Résolution" htmlFor="report-resolution" required>
                  <Textarea
                    id="report-resolution"
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                    rows={3}
                    placeholder="Décrivez la résolution…"
                    className="w-full resize-none"
                  />
                </FormField>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleStatusChange('resolved')} disabled={!resolution.trim()} loading={updateStatus.isPending}>
                    Confirmer la résolution
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowResolve(false)}>
                    Annuler
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmDismiss}
        onOpenChange={setConfirmDismiss}
        title="Rejeter ce signalement ?"
        description="Le signalement sera marqué comme rejeté et ne nécessitera plus d'action."
        confirmLabel="Rejeter"
        variant="danger"
        onConfirm={() => handleStatusChange('dismissed')}
      />
    </>
  )
}
