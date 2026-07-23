import { useState } from 'react'
import { Button, FormField, Input, Modal, Select, Textarea } from '@/components/ui'
import { useFormErrors } from '@/lib/useFormErrors'

const COUNTRY_OPTIONS = ['Niger', 'Mali', 'Sénégal', "Côte d'Ivoire", 'Guinée', 'Burkina Faso', 'Bénin', 'Togo'].map((c) => ({ value: c, label: c }))

const PAYMENT_METHOD_OPTIONS = [
  { value: 'orange_money', label: 'Orange Money' },
  { value: 'wave', label: 'Wave' },
  { value: 'mobile_money', label: 'Mobile Money' },
  { value: 'bank_transfer', label: 'Virement bancaire' },
]

interface FormState {
  name: string
  email: string
  phone: string
  country: string
  defaultCommissionRate: number
  paymentMethod: string
  paymentDetails: string
  notes: string
}

const INITIAL_FORM: FormState = {
  name: '', email: '', phone: '', country: 'Niger',
  defaultCommissionRate: 5, paymentMethod: 'orange_money',
  paymentDetails: '', notes: '',
}

interface AffiliateCreateModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (data: FormState) => Promise<void>
}

export function AffiliateCreateModal({ open, onOpenChange, onSave }: AffiliateCreateModalProps) {
  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [saving, setSaving] = useState(false)
  const { getError, handleValidationError, clearErrors, clearError } = useFormErrors()

  async function handleSave() {
    clearErrors()
    setSaving(true)
    try {
      await onSave(form)
      setForm(INITIAL_FORM)
      onOpenChange(false)
    } catch (err) {
      if (!handleValidationError(err)) throw err
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={(o) => { if (!o) onOpenChange(false) }}
      title="Nouvel affilié"
      description="Ajoutez un partenaire au programme d'affiliation."
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={handleSave} loading={saving} disabled={saving}>Créer</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Nom complet" htmlFor="aff-name" required error={getError('name')}>
            <Input id="aff-name" className="w-full" value={form.name} onChange={(e) => { setForm({ ...form, name: e.target.value }); clearError('name') }} />
          </FormField>
          <FormField label="Email" htmlFor="aff-email" required error={getError('email')}>
            <Input id="aff-email" className="w-full" type="email" value={form.email} onChange={(e) => { setForm({ ...form, email: e.target.value }); clearError('email') }} />
          </FormField>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <FormField label="Téléphone" htmlFor="aff-phone">
            <Input id="aff-phone" className="w-full" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </FormField>
          <FormField label="Pays" htmlFor="aff-country">
            <Select id="aff-country" className="w-full" value={form.country} onChange={(v) => setForm({ ...form, country: v })} options={COUNTRY_OPTIONS} />
          </FormField>
          <FormField label="Commission %" htmlFor="aff-rate" error={getError('commissionRate')}>
            <Input id="aff-rate" className="w-full" type="text" value={form.defaultCommissionRate} onChange={(e) => { setForm({ ...form, defaultCommissionRate: Number(e.target.value.replace(/[^\d]/g, '')) || 0 }); clearError('commissionRate') }} />
          </FormField>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Paiement" htmlFor="aff-payment">
            <Select id="aff-payment" className="w-full" value={form.paymentMethod} onChange={(v) => setForm({ ...form, paymentMethod: v })} options={PAYMENT_METHOD_OPTIONS} />
          </FormField>
          <FormField label="Infos de paiement" htmlFor="aff-payment-details">
            <Input id="aff-payment-details" className="w-full" value={form.paymentDetails} onChange={(e) => setForm({ ...form, paymentDetails: e.target.value })} placeholder="Numéro ou compte bancaire" />
          </FormField>
        </div>
        <FormField label="Notes" htmlFor="aff-notes">
          <Textarea id="aff-notes" className="w-full" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </FormField>
      </div>
    </Modal>
  )
}
