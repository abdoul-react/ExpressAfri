import { useState } from 'react'
import { Award, Coins, Gift, Pencil, Plus, Star, Trash2, Users } from 'lucide-react'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ConfirmDialog,
  DataTable,
  EmptyState,
  FormField,
  Input,
  Modal,
  PageHeader,
  Select,
  SearchInput,
  StatCard,
  StatusBadge,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  type Column,
} from '@/components/ui'
import { toast } from '@/lib/toast'
import type { StatusMap } from '@/lib/status'
import { useLoyaltySummary, useLoyaltyRules, useCreateRule, useUpdateRule, useDeleteRule, useLoyaltyRewards, useCreateReward, useUpdateReward, useDeleteReward, useLoyaltyCustomers, useCustomerPoints, useAdjustPoints, useCustomerTransactions } from '../hooks/useAdminLoyalty'
import type { LoyaltyQueryParams } from '@/infrastructure/data-source/AdminLoyaltyDataSource'

const LOYALTY_TIER: StatusMap = {
  bronze: { label: 'Bronze', variant: 'warning' },
  silver: { label: 'Silver', variant: 'neutral' },
  gold: { label: 'Gold', variant: 'primary' },
  platinum: { label: 'Platinum', variant: 'purple' },
}

const TRANSACTION_TYPE: StatusMap = {
  earned: { label: 'Gagné', variant: 'success' },
  spent: { label: 'Dépensé', variant: 'danger' },
  adjusted: { label: 'Ajusté', variant: 'info' },
}

const RULE_TYPE_OPTIONS = [
  { value: 'earn_per_spend', label: 'Points par dépense' },
  { value: 'signup_bonus', label: 'Bonus inscription' },
  { value: 'referral_bonus', label: 'Parrainage' },
  { value: 'birthday_bonus', label: 'Anniversaire' },
  { value: 'review_bonus', label: 'Avis produit' },
  { value: 'custom', label: 'Personnalisé' },
]

const REWARD_TYPE_OPTIONS = [
  { value: 'discount', label: 'Réduction' },
  { value: 'free_shipping', label: 'Livraison gratuite' },
  { value: 'free_product', label: 'Produit gratuit' },
  { value: 'voucher', label: "Bon d'achat" },
]

const TIER_OPTIONS = [
  { value: 'bronze', label: 'Bronze' },
  { value: 'silver', label: 'Silver' },
  { value: 'gold', label: 'Gold' },
  { value: 'platinum', label: 'Platinum' },
]

export function AdminLoyaltyPage() {
  const [tab, setTab] = useState<'rules' | 'rewards' | 'customers'>('rules')
  const [search, setSearch] = useState(''); const [tierFilter, setTierFilter] = useState(''); const [page, setPage] = useState(1)
  const [editRule, setEditRule] = useState<any>(null); const [editReward, setEditReward] = useState<any>(null)
  const [showRuleForm, setShowRuleForm] = useState(false); const [showRewardForm, setShowRewardForm] = useState(false)
  const [rf, setRf] = useState({ name: '', type: 'earn_per_spend', points: 0, condition: '', isActive: true })
  const [rwf, setRwf] = useState({ name: '', description: '', pointsCost: 0, type: 'discount', value: 0, isActive: true, stock: 0 })
  const [selectedCust, setSelectedCust] = useState<string | null>(null)
  const [adjustModal, setAdjustModal] = useState<{ id: string; name: string } | null>(null)
  const [adjustPoints, setAdjustPoints] = useState(0); const [adjustReason, setAdjustReason] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<{ kind: 'rule' | 'reward'; id: string; name: string } | null>(null)

  const { data: summary } = useLoyaltySummary()
  const { data: rules } = useLoyaltyRules()
  const { data: rewards } = useLoyaltyRewards()
  const createRule = useCreateRule(); const updateRule = useUpdateRule(); const deleteRule = useDeleteRule()
  const createReward = useCreateReward(); const updateReward = useUpdateReward(); const deleteReward = useDeleteReward()

  const cParams: LoyaltyQueryParams = { page, limit: 10, search: search || undefined, tier: tierFilter || undefined }
  const { data: custData, isLoading: custLoading } = useLoyaltyCustomers(cParams)
  const { data: custPoints } = useCustomerPoints(selectedCust ?? '')
  const { data: transactions } = useCustomerTransactions(selectedCust ?? '')
  const adjust = useAdjustPoints()

  function resetRuleForm() { setRf({ name: '', type: 'earn_per_spend', points: 0, condition: '', isActive: true }); setEditRule(null); setShowRuleForm(false) }
  function resetRewardForm() { setRwf({ name: '', description: '', pointsCost: 0, type: 'discount', value: 0, isActive: true, stock: 0 }); setEditReward(null); setShowRewardForm(false) }

  async function handleSaveRule() {
    try {
      if (editRule) await updateRule.mutateAsync({ id: editRule.id, data: rf })
      else await createRule.mutateAsync(rf)
      toast.success('Enregistré')
      resetRuleForm()
    } catch {
      toast.error("Erreur lors de l'enregistrement de la règle")
    }
  }

  async function handleSaveReward() {
    try {
      if (editReward) await updateReward.mutateAsync({ id: editReward.id, data: rwf })
      else await createReward.mutateAsync(rwf)
      toast.success('Enregistré')
      resetRewardForm()
    } catch {
      toast.error("Erreur lors de l'enregistrement de la récompense")
    }
  }

  async function handleConfirmDelete() {
    if (!confirmDelete) return
    try {
      if (confirmDelete.kind === 'rule') await deleteRule.mutateAsync(confirmDelete.id)
      else await deleteReward.mutateAsync(confirmDelete.id)
      toast.success('Supprimé')
    } catch {
      toast.error('Erreur lors de la suppression')
    }
  }

  async function handleAdjust() {
    if (!adjustModal) return
    try {
      await adjust.mutateAsync({ customerId: adjustModal.id, balance: adjustPoints, reason: adjustReason })
      toast.success('Points ajustés')
      setAdjustModal(null); setAdjustPoints(0); setAdjustReason('')
    } catch {
      toast.error("Erreur lors de l'ajustement des points")
    }
  }

  const customerColumns: Column<any>[] = [
    {
      key: 'customer',
      header: 'Client',
      cell: (c) => (
        <div>
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{c.customerName}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">{c.customerEmail}</p>
        </div>
      ),
    },
    {
      key: 'points',
      header: 'Points',
      cell: (c) => <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{c.points.toLocaleString('fr-FR')}</span>,
    },
    {
      key: 'lifetimePoints',
      header: 'Cumul vie',
      hideBelow: 'md',
      cell: (c) => <span className="text-sm text-gray-500 dark:text-gray-400">{c.lifetimePoints.toLocaleString('fr-FR')}</span>,
    },
    {
      key: 'tier',
      header: 'Niveau',
      cell: (c) => <StatusBadge map={LOYALTY_TIER} value={c.tier} />,
    },
    {
      key: 'lastActivity',
      header: 'Dernière activité',
      hideBelow: 'lg',
      cell: (c) => <span className="text-sm text-gray-500 dark:text-gray-400">{new Date(c.lastActivity).toLocaleDateString('fr-FR')}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      cell: (c) => (
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => setSelectedCust(selectedCust === c.customerId ? null : c.customerId)}>
            {selectedCust === c.customerId ? 'Masquer' : 'Détail'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setAdjustModal({ id: c.customerId, name: c.customerName })}>
            Ajuster pts
          </Button>
        </div>
      ),
    },
  ]

  const transactionColumns: Column<any>[] = [
    { key: 'createdAt', header: 'Date', cell: (t) => <span className="text-gray-500 dark:text-gray-400">{new Date(t.createdAt).toLocaleDateString('fr-FR')}</span> },
    { key: 'type', header: 'Type', cell: (t) => <StatusBadge map={TRANSACTION_TYPE} value={t.type} size="sm" /> },
    {
      key: 'points',
      header: 'Points',
      cell: (t) => (
        <span className={t.points > 0 ? 'font-medium text-green-600 dark:text-green-400' : 'font-medium text-red-600 dark:text-red-400'}>
          {t.points > 0 ? `+${t.points}` : t.points}
        </span>
      ),
    },
    { key: 'description', header: 'Description', cell: (t) => <span className="text-gray-700 dark:text-gray-300">{t.description}</span> },
  ]

  return (
    <div>
      <PageHeader
        title="Programme de fidélité"
        description="Règles de gain, récompenses et points des clients"
      />

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Clients" value={summary?.totalCustomers ?? '—'} icon={Users} tone="primary" loading={!summary} />
        <StatCard label="Points émis" value={summary ? summary.totalPointsIssued.toLocaleString('fr-FR') : '—'} icon={Coins} tone="info" loading={!summary} />
        <StatCard label="Points utilisés" value={summary ? summary.totalPointsRedeemed.toLocaleString('fr-FR') : '—'} icon={Star} tone="warning" loading={!summary} />
        <StatCard label="Récompenses" value={summary?.activeRewards ?? '—'} icon={Gift} tone="purple" loading={!summary} />
        <StatCard label="Règles actives" value={summary?.activeRules ?? '—'} icon={Award} tone="success" loading={!summary} />
      </div>

      <Tabs value={tab} onValueChange={(v) => { setTab(v as typeof tab); setPage(1) }}>
        <TabsList variant="pills">
          <TabsTrigger value="rules">Règles</TabsTrigger>
          <TabsTrigger value="rewards">Récompenses</TabsTrigger>
          <TabsTrigger value="customers">Clients</TabsTrigger>
        </TabsList>

        <TabsContent value="rules">
          <div className="mb-4 flex justify-end">
            <Button leftIcon={Plus} onClick={() => { resetRuleForm(); setShowRuleForm(true) }}>
              Nouvelle règle
            </Button>
          </div>
          {rules && rules.length === 0 && (
            <Card>
              <EmptyState icon={Award} title="Aucune règle" description="Créez une première règle de gain de points." />
            </Card>
          )}
          {rules && rules.length > 0 && (
            <div className="space-y-2">
              {rules.map((r: any) => (
                <Card key={r.id} padding="sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{r.name}</h3>
                      <p className="text-xs text-gray-400 dark:text-gray-500">{r.condition ?? 'Aucune condition'}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-primary-600 dark:text-primary-400">{r.points} pts</span>
                      <Badge variant={r.isActive ? 'success' : 'neutral'} dot>{r.isActive ? 'Actif' : 'Inactif'}</Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={Pencil}
                        onClick={() => { setRf({ name: r.name, type: r.type, points: r.points, condition: r.condition ?? '', isActive: r.isActive }); setEditRule(r); setShowRuleForm(true) }}
                      >
                        Modifier
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Supprimer ${r.name}`}
                        className="text-red-500 hover:text-red-600 dark:text-red-400"
                        onClick={() => setConfirmDelete({ kind: 'rule', id: r.id, name: r.name })}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="rewards">
          <div className="mb-4 flex justify-end">
            <Button leftIcon={Plus} onClick={() => { resetRewardForm(); setShowRewardForm(true) }}>
              Nouvelle récompense
            </Button>
          </div>
          {rewards && rewards.length === 0 && (
            <Card>
              <EmptyState icon={Gift} title="Aucune récompense" description="Créez une première récompense échangeable contre des points." />
            </Card>
          )}
          {rewards && rewards.length > 0 && (
            <div className="space-y-2">
              {rewards.map((r: any) => (
                <Card key={r.id} padding="sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{r.name}</h3>
                      <p className="text-xs text-gray-400 dark:text-gray-500">{r.description}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-primary-600 dark:text-primary-400">{r.pointsCost} pts</span>
                      <Badge variant={r.isActive ? 'success' : 'neutral'} dot>{r.isActive ? 'Actif' : 'Inactif'}</Badge>
                      {r.stock !== undefined && <span className="text-xs text-gray-400 dark:text-gray-500">Stock : {r.stock}</span>}
                      <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={Pencil}
                        onClick={() => { setRwf({ name: r.name, description: r.description, pointsCost: r.pointsCost, type: r.type, value: r.value, isActive: r.isActive, stock: r.stock ?? 0 }); setEditReward(r); setShowRewardForm(true) }}
                      >
                        Modifier
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Supprimer ${r.name}`}
                        className="text-red-500 hover:text-red-600 dark:text-red-400"
                        onClick={() => setConfirmDelete({ kind: 'reward', id: r.id, name: r.name })}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="customers">
          <div className="mb-4 flex flex-wrap gap-3">
            <SearchInput
              value={search}
              onChange={(v) => { setSearch(v); setPage(1) }}
              placeholder="Rechercher un client..."
              className="min-w-[200px] flex-1"
            />
            <Select
              value={tierFilter}
              onChange={(v) => { setTierFilter(v); setPage(1) }}
              placeholder="Tous niveaux"
              options={TIER_OPTIONS}
            />
          </div>
          <DataTable
            data={custData?.data ?? []}
            columns={customerColumns}
            rowKey={(c) => c.customerId}
            loading={custLoading}
            empty={{ icon: Users, title: 'Aucun client', description: 'Aucun client ne correspond à ces critères.' }}
            pagination={custData ? { page: custData.page, pageSize: 10, total: custData.total, onPageChange: setPage } : undefined}
          />

          {selectedCust && custPoints && (
            <Card padding="none" className="mt-6">
              <CardHeader className="mb-0 border-b border-gray-100 px-6 py-4 dark:border-gray-800">
                <div className="min-w-0">
                  <CardTitle>
                    {custPoints.customerName} — {custPoints.points.toLocaleString('fr-FR')} pts
                  </CardTitle>
                  <div className="mt-2 flex flex-wrap items-center gap-4 text-sm">
                    <span className="text-gray-500 dark:text-gray-400">
                      Cumul vie : <strong className="font-semibold text-gray-900 dark:text-gray-100">{custPoints.lifetimePoints.toLocaleString('fr-FR')}</strong>
                    </span>
                    <span className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                      Niveau : <StatusBadge map={LOYALTY_TIER} value={custPoints.tier} size="sm" />
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {transactions && (
                  <DataTable
                    bare
                    data={transactions}
                    columns={transactionColumns}
                    rowKey={(t) => t.id}
                    empty={{ title: 'Aucune transaction', description: 'Ce client n’a encore aucun mouvement de points.' }}
                  />
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <Modal
        open={showRuleForm}
        onOpenChange={(o) => { if (!o) resetRuleForm() }}
        title={editRule ? 'Modifier la règle' : 'Nouvelle règle'}
        description="Définissez comment les clients gagnent des points."
        footer={
          <>
            <Button variant="outline" onClick={resetRuleForm}>Annuler</Button>
            <Button
              onClick={handleSaveRule}
              disabled={!rf.name.trim()}
              loading={createRule.isPending || updateRule.isPending}
            >
              {editRule ? 'Enregistrer' : 'Créer'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Nom" htmlFor="rule-name" required>
              <Input id="rule-name" className="w-full" value={rf.name} onChange={(e) => setRf({ ...rf, name: e.target.value })} />
            </FormField>
            <FormField label="Type" htmlFor="rule-type">
              <Select id="rule-type" className="w-full" value={rf.type} onChange={(v) => setRf({ ...rf, type: v })} options={RULE_TYPE_OPTIONS} />
            </FormField>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Points" htmlFor="rule-points">
              <Input id="rule-points" className="w-full" type="text" value={rf.points} onChange={(e) => setRf({ ...rf, points: Number(e.target.value.replace(/[^\d-]/g, '')) || 0 })} />
            </FormField>
            <FormField label="Condition" htmlFor="rule-condition" hint="Optionnel">
              <Input id="rule-condition" className="w-full" value={rf.condition} onChange={(e) => setRf({ ...rf, condition: e.target.value })} />
            </FormField>
          </div>
          <Switch checked={rf.isActive} onCheckedChange={(c) => setRf({ ...rf, isActive: c })} label="Règle active" />
        </div>
      </Modal>

      <Modal
        open={showRewardForm}
        onOpenChange={(o) => { if (!o) resetRewardForm() }}
        title={editReward ? 'Modifier la récompense' : 'Nouvelle récompense'}
        description="Définissez une récompense échangeable contre des points."
        footer={
          <>
            <Button variant="outline" onClick={resetRewardForm}>Annuler</Button>
            <Button
              onClick={handleSaveReward}
              disabled={!rwf.name.trim()}
              loading={createReward.isPending || updateReward.isPending}
            >
              {editReward ? 'Enregistrer' : 'Créer'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Nom" htmlFor="reward-name" required>
              <Input id="reward-name" className="w-full" value={rwf.name} onChange={(e) => setRwf({ ...rwf, name: e.target.value })} />
            </FormField>
            <FormField label="Type" htmlFor="reward-type">
              <Select id="reward-type" className="w-full" value={rwf.type} onChange={(v) => setRwf({ ...rwf, type: v })} options={REWARD_TYPE_OPTIONS} />
            </FormField>
          </div>
          <FormField label="Description" htmlFor="reward-description">
            <Input id="reward-description" className="w-full" value={rwf.description} onChange={(e) => setRwf({ ...rwf, description: e.target.value })} />
          </FormField>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FormField label="Coût (pts)" htmlFor="reward-cost">
              <Input id="reward-cost" className="w-full" type="text" value={rwf.pointsCost} onChange={(e) => setRwf({ ...rwf, pointsCost: Number(e.target.value.replace(/[^\d]/g, '')) || 0 })} />
            </FormField>
            <FormField label="Valeur" htmlFor="reward-value">
              <Input id="reward-value" className="w-full" type="text" value={rwf.value} onChange={(e) => setRwf({ ...rwf, value: Number(e.target.value.replace(/[^\d]/g, '')) || 0 })} />
            </FormField>
            <FormField label="Stock" htmlFor="reward-stock">
              <Input id="reward-stock" className="w-full" type="text" value={rwf.stock} onChange={(e) => setRwf({ ...rwf, stock: Number(e.target.value.replace(/[^\d]/g, '')) || 0 })} />
            </FormField>
          </div>
          <Switch checked={rwf.isActive} onCheckedChange={(c) => setRwf({ ...rwf, isActive: c })} label="Récompense active" />
        </div>
      </Modal>

      <Modal
        open={adjustModal !== null}
        onOpenChange={(o) => { if (!o) { setAdjustModal(null); setAdjustPoints(0); setAdjustReason('') } }}
        title="Ajuster les points"
        description={adjustModal?.name}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => { setAdjustModal(null); setAdjustPoints(0); setAdjustReason('') }}>Annuler</Button>
            <Button
              onClick={handleAdjust}
              loading={adjust.isPending}
              disabled={!adjustReason.trim() || adjustPoints === 0}
            >
              Ajuster
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <FormField label="Points (+/-)" htmlFor="adjust-points">
            <Input
              id="adjust-points"
              className="w-full"
              type="text"
              value={adjustPoints}
              onChange={(e) => setAdjustPoints(Number(e.target.value.replace(/[^\d-]/g, '')) || 0)}
              placeholder="100 ou -50"
            />
          </FormField>
          <FormField label="Motif" htmlFor="adjust-reason" required>
            <Input
              id="adjust-reason"
              className="w-full"
              value={adjustReason}
              onChange={(e) => setAdjustReason(e.target.value)}
              placeholder="Geste commercial, correction..."
            />
          </FormField>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmDelete !== null}
        onOpenChange={(o) => { if (!o) setConfirmDelete(null) }}
        title={confirmDelete?.kind === 'rule' ? 'Supprimer la règle' : 'Supprimer la récompense'}
        description={confirmDelete ? `Supprimer « ${confirmDelete.name} » ? Cette action est irréversible.` : undefined}
        confirmLabel="Supprimer"
        variant="danger"
        onConfirm={handleConfirmDelete}
      />
    </div>
  )
}
