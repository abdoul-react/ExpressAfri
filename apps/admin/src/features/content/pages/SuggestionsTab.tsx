import { MessageSquare, Trash2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, EmptyState, LoadingBlock } from '@/components/ui'
import { useAdminContentBlocks } from '../hooks/useAdminContentBlocks'

type Suggestion = {
  content: string
  customerId: string | null
  submittedAt: string
}

function parseSuggestion(value: string): Suggestion | null {
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

export function SuggestionsTab() {
  const { data: blocks, isLoading, isError } = useAdminContentBlocks('suggestions')

  if (isLoading) return <LoadingBlock label="Chargement des suggestions…" />
  if (isError) return <p className="text-sm text-red-600 dark:text-red-400">Erreur de chargement</p>

  const suggestions = (blocks ?? [])
    .map((b) => ({ id: b.id, key: b.key, ...parseSuggestion(b.value) }))
    .filter((s): s is { id: string; key: string } & Suggestion => s.content != null)
    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())

  return (
    <div className="space-y-4">
      <Card padding="sm">
        <div className="flex items-center gap-3">
          <MessageSquare className="h-5 w-5 text-primary-600 dark:text-primary-400" />
          <div>
            <CardTitle className="text-sm">Suggestions clients</CardTitle>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {suggestions.length} suggestion{suggestions.length !== 1 ? 's' : ''} reçue{suggestions.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </Card>

      {suggestions.length === 0 ? (
        <Card padding="none">
          <EmptyState icon={MessageSquare} title="Aucune suggestion pour le moment" />
        </Card>
      ) : (
        <Card padding="none">
          <CardContent className="divide-y divide-gray-100 dark:divide-gray-800">
            {suggestions.map((s) => (
              <div key={s.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-800 dark:text-gray-200">{s.content}</p>
                    <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                      {s.customerId ? `Client ${s.customerId.slice(0, 8)}…` : 'Anonyme'} ·{' '}
                      {new Date(s.submittedAt).toLocaleString('fr-FR', {
                        day: '2-digit', month: '2-digit', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <Trash2 className="h-4 w-4 flex-shrink-0 text-gray-300 dark:text-gray-600" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
