import { Component, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button, Card, EmptyState } from '@/components/ui'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

/**
 * Garde-fou de rendu : sans lui, toute erreur d'une page efface l'application
 * entière (écran vide). Ici, l'erreur reste confinée à la zone de contenu —
 * la sidebar et la navigation restent utilisables.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error) {
    console.error('[ErrorBoundary]', error)
  }

  render() {
    if (this.state.error) {
      return (
        <Card padding="none">
          <EmptyState
            icon={AlertTriangle}
            title="Une erreur est survenue sur cette page"
            description={this.state.error.message}
            action={
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => this.setState({ error: null })}>
                  Réessayer
                </Button>
                <Button onClick={() => window.location.reload()}>Recharger la page</Button>
              </div>
            }
          />
        </Card>
      )
    }
    return this.props.children
  }
}
