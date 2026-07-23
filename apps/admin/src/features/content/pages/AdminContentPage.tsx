import { useState, useRef, useEffect } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  Palette,
  Image,
  FileText,
  Shapes,
  CreditCard,
  LayoutGrid,
  Newspaper,
  Megaphone,
  Share2,
  Globe,
  BookOpen,
} from 'lucide-react'
import { PageHeader, Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui'
import { useAdminContentSummary } from '../hooks/useAdminContentSummary'
import { BrandingTab } from './BrandingTab'
import { BannersTab } from './BannersTab'
import { ContentBlocksTab } from './ContentBlocksTab'
import { StaticPagesTab } from './StaticPagesTab'
import { LogosTab } from './LogosTab'
import { FeedSectionsTab } from './FeedSectionsTab'
import { FeedPostsTab } from './FeedPostsTab'
import { ShortcutsTab } from './ShortcutsTab'
import { SocialLinksTab } from './SocialLinksTab'
import { SEOTab } from './SEOTab'
import { PaymentMethodsTab } from './PaymentMethodsTab'

const TABS: { id: string; label: string; icon: LucideIcon }[] = [
  { id: 'branding', label: 'Branding', icon: Palette },
  { id: 'banners', label: 'Bannières', icon: Image },
  { id: 'content', label: 'Textes', icon: FileText },
  { id: 'logos', label: 'Logos', icon: Shapes },
  { id: 'payment-methods', label: 'Paiements', icon: CreditCard },
  { id: 'shortcuts', label: 'Raccourcis', icon: LayoutGrid },
  { id: 'feed', label: 'Sections Feed', icon: Newspaper },
  { id: 'feed-posts', label: 'Publications', icon: Megaphone },
  { id: 'social', label: 'Réseaux sociaux', icon: Share2 },
  { id: 'seo', label: 'SEO', icon: Globe },
  { id: 'pages', label: 'Pages', icon: BookOpen },
]

export function AdminContentPage() {
  const [activeTab, setActiveTab] = useState('branding')
  const { data: summary } = useAdminContentSummary()
  const tabsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = tabsRef.current
    if (!el) return
    const active = el.querySelector(`[data-tab="${activeTab}"]`)
    active?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [activeTab])

  return (
    <div>
      <PageHeader
        title="Gestion de contenu"
        description={
          summary
            ? `${summary.totalBanners} bannières · ${summary.totalContentBlocks} textes · ${summary.totalStaticPages} pages · ${summary.totalPaymentMethods} paiements · ${summary.totalFeedSections} sections feed · ${summary.totalSettings} paramètres · ${summary.totalLogos} logos`
            : undefined
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div ref={tabsRef}>
          <TabsList variant="underline">
            {TABS.map((tab) => (
              <TabsTrigger key={tab.id} value={tab.id} icon={tab.icon} data-tab={tab.id}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="branding">
          <BrandingTab />
        </TabsContent>
        <TabsContent value="banners">
          <BannersTab />
        </TabsContent>
        <TabsContent value="content">
          <ContentBlocksTab />
        </TabsContent>
        <TabsContent value="payment-methods">
          <PaymentMethodsTab />
        </TabsContent>
        <TabsContent value="logos">
          <LogosTab />
        </TabsContent>
        <TabsContent value="shortcuts">
          <ShortcutsTab />
        </TabsContent>
        <TabsContent value="feed">
          <FeedSectionsTab />
        </TabsContent>
        <TabsContent value="feed-posts">
          <FeedPostsTab />
        </TabsContent>
        <TabsContent value="social">
          <SocialLinksTab />
        </TabsContent>
        <TabsContent value="seo">
          <SEOTab />
        </TabsContent>
        <TabsContent value="pages">
          <StaticPagesTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
