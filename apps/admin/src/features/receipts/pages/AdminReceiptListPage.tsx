import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, Plus, Printer, ReceiptText, Send, Settings, XCircle, Download } from 'lucide-react'
import { useAdminReceipts, useCreateReceipt, useSendReceipt, useSendBulkReceipts, useAdminReceiptSettings } from '../hooks/useAdminReceipts'
import { generateReceiptHTML } from '../lib/receipt-html'
import { PermissionGuard } from '@/components/guards/PermissionGuard'
import {
  PageHeader, SearchInput, DataTable, StatusBadge, Button, Card, EmptyState, Modal, Checkbox, FormField, Input,
  Tabs, TabsList, TabsTrigger, type Column,
} from '@/components/ui'
import { RECEIPT_STATUS, RECEIPT_TYPE, statusMeta } from '@/lib/status'
import { toast } from '@/lib/toast'
import type { Receipt, ReceiptQueryParams } from '@/infrastructure/data-source/AdminReceiptDataSource'
import { formatPrice, formatDate } from '@/lib/format'

const STATUS_TABS = [
  { value: 'all', label: 'Tous' },
  { value: 'sent', label: 'Envoyés' },
  { value: 'unsent', label: 'Non envoyés' },
  { value: 'failed', label: 'Échecs' },
]

// ─── Modale de prévisualisation ──────────────────────────────────────────────

// ─── Modale de prévisualisation ──────────────────────────────────────────────
function ReceiptPreviewModal({ receipt, settings, onClose }: { receipt: Receipt; settings?: any; onClose: () => void }) {
  const html = generateReceiptHTML({
    orderNumber: receipt.orderNumber,
    customerName: receipt.customerName,
    customerEmail: receipt.customerEmail,
    customerPhone: receipt.customerPhone,
    amount: receipt.amount,
    currency: receipt.currency,
    sentAt: receipt.sentAt,
    createdAt: receipt.createdAt,
    accentColor: settings?.accentColor,
    brandName: settings?.brandName,
    logoUrl: settings?.logoUrl,
    footerText: settings?.footerText,
    showBarcode: settings?.showBarcode,
  })

  function handlePrint() {
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(html)
    win.document.close()
    win.focus()
    win.print()
  }

  return (
    <Modal
      open
      onOpenChange={(open) => { if (!open) onClose() }}
      title={`Aperçu du reçu — ${receipt.orderNumber}`}
      description={receipt.customerName}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Fermer</Button>
          <Button variant="outline" leftIcon={Printer} onClick={handlePrint}>Imprimer</Button>
        </>
      }
    >
      <div className="-mx-6 -my-5 overflow-hidden bg-gray-100 dark:bg-gray-800">
        <iframe
          srcDoc={html}
          title="Aperçu reçu"
          className="h-full w-full border-0"
          style={{ minHeight: '500px' }}
          sandbox="allow-same-origin"
        />
      </div>
    </Modal>
  )
}

export function AdminReceiptListPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [previewReceipt, setPreviewReceipt] = useState<Receipt | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [createOrderId, setCreateOrderId] = useState('')

  const params: ReceiptQueryParams = {
    page, limit: 10,
    search: search || undefined,
    status: statusFilter || undefined,
  }

  const { data, isLoading, isError, error } = useAdminReceipts(params)
  const { data: receiptSettings } = useAdminReceiptSettings()
  const sendReceipt = useSendReceipt()
  const sendBulkReceipts = useSendBulkReceipts()
  const createReceipt = useCreateReceipt()

  function handleSearch(value: string) {
    setSearch(value)
    setPage(1)
    setSelectedIds(new Set())
  }

  function handleStatusFilter(value: string) {
    setStatusFilter(value === 'all' ? '' : value)
    setPage(1)
    setSelectedIds(new Set())
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (!data) return
    if (selectedIds.size === data.data.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(data.data.map((r) => r.id)))
    }
  }

  function handleCreateReceipt() {
    if (!createOrderId.trim()) return
    createReceipt.mutate(createOrderId.trim(), {
      onSuccess: () => {
        toast.success('Reçu créé avec succès')
        setCreateOpen(false)
        setCreateOrderId('')
      },
      onError: (err) => toast.error(err instanceof Error ? err.message : 'Erreur lors de la création du reçu'),
    })
  }

  function handleSend(id: string) {
    sendReceipt.mutate(id, {
      onSuccess: () => toast.success('Reçu envoyé'),
      onError: (err) => toast.error(err instanceof Error ? err.message : "Erreur lors de l'envoi du reçu"),
    })
  }

  function handleSendBulk() {
    if (selectedIds.size === 0) return
    const count = selectedIds.size
    sendBulkReceipts.mutate(Array.from(selectedIds), {
      onSuccess: () => toast.success(`${count} reçu${count > 1 ? 's' : ''} envoyé${count > 1 ? 's' : ''}`),
      onError: (err) => toast.error(err instanceof Error ? err.message : "Erreur lors de l'envoi en lot"),
    })
    setSelectedIds(new Set())
  }

  function isSending(id: string) {
    return sendReceipt.isPending && sendReceipt.variables === id
  }

  const columns: Column<Receipt>[] = [
    {
      key: 'select',
      header: (
        <Checkbox
          checked={!!data && data.data.length > 0 && selectedIds.size === data.data.length}
          onCheckedChange={toggleSelectAll}
        />
      ),
      className: 'w-10',
      cell: (receipt) => (
        <Checkbox checked={selectedIds.has(receipt.id)} onCheckedChange={() => toggleSelect(receipt.id)} />
      ),
    },
    {
      key: 'orderNumber',
      header: 'Réf commande',
      cell: (receipt) => (
        <span className="font-mono text-sm font-medium text-gray-900 dark:text-gray-100">{receipt.orderNumber}</span>
      ),
    },
    {
      key: 'customer',
      header: 'Client',
      hideBelow: 'md',
      cell: (receipt) => (
        <div>
          <p className="text-sm text-gray-900 dark:text-gray-100">{receipt.customerName}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">{receipt.customerEmail}</p>
        </div>
      ),
    },
    {
      key: 'amount', header: 'Montant', align: 'right',
      cell: (receipt) => <span className="font-medium text-gray-900 dark:text-gray-100">{formatPrice(receipt.amount)}</span>,
    },
    {
      key: 'status', header: 'Statut', align: 'center',
      cell: (receipt) => <StatusBadge map={RECEIPT_STATUS} value={receipt.status} />,
    },
    {
      key: 'type', header: 'Type', align: 'center', hideBelow: 'lg',
      cell: (receipt) => <StatusBadge map={RECEIPT_TYPE} value={receipt.type} />,
    },
    {
      key: 'sentAt', header: 'Envoyé le', align: 'center', hideBelow: 'lg',
      cell: (receipt) => formatDate(receipt.sentAt),
    },
    {
      key: 'actions', header: 'Actions', align: 'center',
      cell: (receipt) => {
        const apiOrigin = (import.meta.env.VITE_API_URL ?? '/api').replace(/\/api\/?$/, '')
        const pdfUrl = receipt.downloadUrl
          ? (/^https?:\/\//.test(receipt.downloadUrl) ? receipt.downloadUrl : `${apiOrigin}${receipt.downloadUrl}`)
          : null
        return (
          <div className="flex items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
            <Button variant="outline" size="sm" leftIcon={Eye} title="Prévisualiser le reçu"
              onClick={() => setPreviewReceipt(receipt)}>
              Aperçu
            </Button>
            {pdfUrl && (
              <Button variant="outline" size="sm" leftIcon={Download} title="Télécharger le PDF"
                onClick={() => window.open(pdfUrl, '_blank', 'noopener')}>
                PDF
              </Button>
            )}
            <PermissionGuard permission="payments.update">
              {receipt.status !== 'sent' ? (
                <Button size="sm" leftIcon={Send} loading={isSending(receipt.id)}
                  onClick={() => handleSend(receipt.id)}>
                  Envoyer
                </Button>
              ) : (
                <span className="text-xs text-gray-400 dark:text-gray-500">—</span>
              )}
            </PermissionGuard>
          </div>
        )
      },
    },
  ]

  return (
    <div>
      {previewReceipt && (
        <ReceiptPreviewModal receipt={previewReceipt} settings={receiptSettings} onClose={() => setPreviewReceipt(null)} />
      )}

      <Modal
        open={createOpen}
        onOpenChange={(open) => {
          if (!open) {
            setCreateOpen(false)
            setCreateOrderId('')
          }
        }}
        title="Créer un reçu"
        description="Saisissez la référence d'une commande existante pour générer son reçu."
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => { setCreateOpen(false); setCreateOrderId('') }}>
              Annuler
            </Button>
            <Button loading={createReceipt.isPending} onClick={handleCreateReceipt}>
              Créer le reçu
            </Button>
          </>
        }
      >
        <FormField label="Référence commande" htmlFor="create-order-id" hint="Exemple : EXP-20260723-AB12">
          <Input
            id="create-order-id"
            value={createOrderId}
            onChange={(e) => setCreateOrderId(e.target.value)}
            placeholder="EXP-20260723-XXXX"
          />
        </FormField>
      </Modal>

      <PageHeader
        title="Reçus"
        description={data ? `${data.total} reçu${data.total > 1 ? 's' : ''}` : 'Reçus de paiement envoyés aux clients'}
        actions={
          <PermissionGuard permission="payments.update">
            <Button variant="outline" leftIcon={Plus} onClick={() => setCreateOpen(true)}>
              Créer un reçu
            </Button>
            <Button asChild variant="outline">
              <Link to="/receipts/settings">
                <Settings className="h-4 w-4" />
                Paramètres
              </Link>
            </Button>
          </PermissionGuard>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchInput
          value={search}
          onChange={handleSearch}
          placeholder="Rechercher par commande, client ou email…"
          size="sm"
          className="min-w-[220px] flex-1"
        />
      </div>

      <Tabs value={statusFilter || 'all'} onValueChange={handleStatusFilter} className="mb-4">
        <TabsList variant="pills">
          {STATUS_TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>{tab.label}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {selectedIds.size > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-primary-200 bg-primary-50 px-4 py-3 dark:border-primary-500/30 dark:bg-primary-500/10">
          <span className="text-sm font-medium text-primary-700 dark:text-primary-300">
            {selectedIds.size} reçu{selectedIds.size > 1 ? 's' : ''} sélectionné{selectedIds.size > 1 ? 's' : ''}
          </span>
          <PermissionGuard permission="payments.update">
            <Button size="sm" leftIcon={Send} loading={sendBulkReceipts.isPending} onClick={handleSendBulk}>
              Envoyer en lot
            </Button>
          </PermissionGuard>
          <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
            Annuler
          </Button>
        </div>
      )}

      {isError ? (
        <Card padding="none">
          <EmptyState icon={XCircle} title="Erreur de chargement" description={(error as Error)?.message} />
        </Card>
      ) : (
        <DataTable
          data={data?.data ?? []}
          columns={columns}
          rowKey={(receipt) => receipt.id}
          loading={isLoading}
          empty={{
            icon: ReceiptText,
            title: 'Aucun reçu trouvé',
            description: search || statusFilter
              ? 'Essayez de modifier vos filtres de recherche.'
              : 'Les reçus générés après paiement apparaîtront ici.',
          }}
          pagination={data ? { page: data.page, pageSize: 10, total: data.total, onPageChange: setPage } : undefined}
        />
      )}
    </div>
  )
}
