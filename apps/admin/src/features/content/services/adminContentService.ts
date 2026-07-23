import { adminContentDataSource } from '@/infrastructure/data-source'
import type {
  CreateBannerInput, UpdateBannerInput,
  CreateFeedSectionInput, UpdateFeedSectionInput,
  CreatePaymentMethodInput, UpdatePaymentMethodInput,
} from '@/infrastructure/data-source/AdminContentDataSource'
import { toServiceError } from '@/lib/service-error'

class AdminContentService {
  async getSummary() {
    try {
      return await adminContentDataSource.getSummary()
    } catch (err) {
      throw toServiceError(err, 'Résumé du contenu')
    }
  }

  // Banners
  async listBanners() {
    try {
      return await adminContentDataSource.listBanners()
    } catch (err) {
      throw toServiceError(err, 'Liste des bannières')
    }
  }
  async getBannerById(id: string) {
    try {
      return await adminContentDataSource.getBannerById(id)
    } catch (err) {
      throw toServiceError(err, 'Récupération de la bannière')
    }
  }
  async createBanner(data: CreateBannerInput) {
    try {
      return await adminContentDataSource.createBanner(data)
    } catch (err) {
      throw toServiceError(err, 'Création de la bannière')
    }
  }
  async updateBanner(id: string, data: UpdateBannerInput) {
    try {
      return await adminContentDataSource.updateBanner(id, data)
    } catch (err) {
      throw toServiceError(err, 'Mise à jour de la bannière')
    }
  }
  async deleteBanner(id: string) {
    try {
      return await adminContentDataSource.deleteBanner(id)
    } catch (err) {
      throw toServiceError(err, 'Suppression de la bannière')
    }
  }
  async uploadBannerImage(file: File) {
    try {
      return await adminContentDataSource.uploadBannerImage(file)
    } catch (err) {
      throw toServiceError(err, 'Upload de l\'image de la bannière')
    }
  }

  // Content Blocks
  async listContentBlocks(group?: string) {
    try {
      return await adminContentDataSource.listContentBlocks(group)
    } catch (err) {
      throw toServiceError(err, 'Liste des blocs de contenu')
    }
  }
  async getContentBlock(id: string) {
    try {
      return await adminContentDataSource.getContentBlock(id)
    } catch (err) {
      throw toServiceError(err, 'Récupération du bloc de contenu')
    }
  }
  async updateContentBlock(id: string, value: string) {
    try {
      return await adminContentDataSource.updateContentBlock(id, value)
    } catch (err) {
      throw toServiceError(err, 'Mise à jour du bloc de contenu')
    }
  }
  async getContentGroups() {
    try {
      return await adminContentDataSource.getContentGroups()
    } catch (err) {
      throw toServiceError(err, 'Liste des groupes de contenu')
    }
  }

  // Static Pages
  async listStaticPages() {
    try {
      return await adminContentDataSource.listStaticPages()
    } catch (err) {
      throw toServiceError(err, 'Liste des pages statiques')
    }
  }
  async getStaticPage(id: string) {
    try {
      return await adminContentDataSource.getStaticPage(id)
    } catch (err) {
      throw toServiceError(err, 'Récupération de la page statique')
    }
  }
  async updateStaticPage(id: string, data: { title?: string; content: string }) {
    try {
      return await adminContentDataSource.updateStaticPage(id, data)
    } catch (err) {
      throw toServiceError(err, 'Mise à jour de la page statique')
    }
  }
  async createStaticPage(data: { title: string; content: string }) {
    try {
      return await adminContentDataSource.createStaticPage(data)
    } catch (err) {
      throw toServiceError(err, 'Création de la page statique')
    }
  }
  async deleteStaticPage(id: string) {
    try {
      return await adminContentDataSource.deleteStaticPage(id)
    } catch (err) {
      throw toServiceError(err, 'Suppression de la page statique')
    }
  }

  // App Settings
  async getAppSettings() {
    try {
      return await adminContentDataSource.getAppSettings()
    } catch (err) {
      throw toServiceError(err, 'Récupération des paramètres')
    }
  }
  async updateAppSetting(key: string, value: string) {
    try {
      return await adminContentDataSource.updateAppSetting(key, value)
    } catch (err) {
      throw toServiceError(err, 'Mise à jour du paramètre')
    }
  }

  // Logos
  async listLogos() {
    try {
      return await adminContentDataSource.listLogos()
    } catch (err) {
      throw toServiceError(err, 'Liste des logos')
    }
  }
  async updateLogo(id: string, url: string) {
    try {
      return await adminContentDataSource.updateLogo(id, url)
    } catch (err) {
      throw toServiceError(err, 'Mise à jour du logo')
    }
  }
  async uploadLogo(id: string, file: File) {
    try {
      return await adminContentDataSource.uploadLogo(id, file)
    } catch (err) {
      throw toServiceError(err, 'Upload du logo')
    }
  }

  // Feed Sections
  async listFeedSections() {
    try {
      return await adminContentDataSource.listFeedSections()
    } catch (err) {
      throw toServiceError(err, 'Liste des sections feed')
    }
  }
  async createFeedSection(data: CreateFeedSectionInput) {
    try {
      return await adminContentDataSource.createFeedSection(data)
    } catch (err) {
      throw toServiceError(err, 'Création de la section feed')
    }
  }
  async updateFeedSection(id: string, data: UpdateFeedSectionInput) {
    try {
      return await adminContentDataSource.updateFeedSection(id, data)
    } catch (err) {
      throw toServiceError(err, 'Mise à jour de la section feed')
    }
  }
  async deleteFeedSection(id: string) {
    try {
      return await adminContentDataSource.deleteFeedSection(id)
    } catch (err) {
      throw toServiceError(err, 'Suppression de la section feed')
    }
  }
  async reorderFeedSections(ids: string[]) {
    try {
      return await adminContentDataSource.reorderFeedSections(ids)
    } catch (err) {
      throw toServiceError(err, 'Réorganisation des sections feed')
    }
  }

  // Feed Posts (publications Inspiration)
  async listFeedPosts() {
    try {
      return await adminContentDataSource.listFeedPosts()
    } catch (err) {
      throw toServiceError(err, 'Liste des publications')
    }
  }
  async createFeedPost(data: import('@/infrastructure/data-source/AdminContentDataSource').CreateFeedPostInput) {
    try {
      return await adminContentDataSource.createFeedPost(data)
    } catch (err) {
      throw toServiceError(err, 'Création de la publication')
    }
  }
  async updateFeedPost(id: string, data: import('@/infrastructure/data-source/AdminContentDataSource').UpdateFeedPostInput) {
    try {
      return await adminContentDataSource.updateFeedPost(id, data)
    } catch (err) {
      throw toServiceError(err, 'Mise à jour de la publication')
    }
  }
  async deleteFeedPost(id: string) {
    try {
      return await adminContentDataSource.deleteFeedPost(id)
    } catch (err) {
      throw toServiceError(err, 'Suppression de la publication')
    }
  }
  async uploadFeedMedia(file: File) {
    try {
      return await adminContentDataSource.uploadFeedMedia(file)
    } catch (err) {
      throw toServiceError(err, 'Upload du média')
    }
  }

  // Shortcuts
  async listShortcuts() {
    try {
      return await adminContentDataSource.listShortcuts()
    } catch (err) {
      throw toServiceError(err, 'Liste des raccourcis')
    }
  }
  async createShortcut(data: { label: string; icon: string; target?: import('@/infrastructure/data-source/AdminContentDataSource').ShortcutTarget }) {
    try {
      return await adminContentDataSource.createShortcut(data)
    } catch (err) {
      throw toServiceError(err, 'Création du raccourci')
    }
  }
  async updateShortcut(id: string, data: { label?: string; icon?: string; isActive?: boolean; target?: import('@/infrastructure/data-source/AdminContentDataSource').ShortcutTarget }) {
    try {
      return await adminContentDataSource.updateShortcut(id, data)
    } catch (err) {
      throw toServiceError(err, 'Mise à jour du raccourci')
    }
  }
  async deleteShortcut(id: string) {
    try {
      return await adminContentDataSource.deleteShortcut(id)
    } catch (err) {
      throw toServiceError(err, 'Suppression du raccourci')
    }
  }
  async reorderShortcuts(ids: string[]) {
    try {
      return await adminContentDataSource.reorderShortcuts(ids)
    } catch (err) {
      throw toServiceError(err, 'Réorganisation des raccourcis')
    }
  }

  // Feature Flags
  async listFeatureFlags() {
    try {
      return await adminContentDataSource.listFeatureFlags()
    } catch (err) {
      throw toServiceError(err, 'Liste des fonctionnalités')
    }
  }
  async toggleFeatureFlag(key: string, enabled: boolean) {
    try {
      return await adminContentDataSource.toggleFeatureFlag(key, enabled)
    } catch (err) {
      throw toServiceError(err, 'Activation/désactivation de la fonctionnalité')
    }
  }

  // Social Links
  async listSocialLinks() {
    try {
      return await adminContentDataSource.listSocialLinks()
    } catch (err) {
      throw toServiceError(err, 'Liste des liens sociaux')
    }
  }
  async updateSocialLink(platform: string, data: { url?: string; label?: string; isActive?: boolean }) {
    try {
      return await adminContentDataSource.updateSocialLink(platform, data)
    } catch (err) {
      throw toServiceError(err, 'Mise à jour du lien social')
    }
  }

  // SEO
  async listSEOMetadata() {
    try {
      return await adminContentDataSource.listSEOMetadata()
    } catch (err) {
      throw toServiceError(err, 'Liste des métadonnées SEO')
    }
  }
  async updateSEOMetadata(page: string, data: { title?: string; description?: string; keywords?: string; ogImage?: string }) {
    try {
      return await adminContentDataSource.updateSEOMetadata(page, data)
    } catch (err) {
      throw toServiceError(err, 'Mise à jour des métadonnées SEO')
    }
  }

  // Payment Methods
  async listPaymentMethods() {
    try {
      return await adminContentDataSource.listPaymentMethods()
    } catch (err) {
      throw toServiceError(err, 'Liste des méthodes de paiement')
    }
  }
  async getPaymentMethod(id: string) {
    try {
      return await adminContentDataSource.getPaymentMethod(id)
    } catch (err) {
      throw toServiceError(err, 'Récupération de la méthode de paiement')
    }
  }
  async createPaymentMethod(data: CreatePaymentMethodInput) {
    try {
      return await adminContentDataSource.createPaymentMethod(data)
    } catch (err) {
      throw toServiceError(err, 'Création de la méthode de paiement')
    }
  }
  async updatePaymentMethod(id: string, data: UpdatePaymentMethodInput) {
    try {
      return await adminContentDataSource.updatePaymentMethod(id, data)
    } catch (err) {
      throw toServiceError(err, 'Mise à jour de la méthode de paiement')
    }
  }
  async deletePaymentMethod(id: string) {
    try {
      return await adminContentDataSource.deletePaymentMethod(id)
    } catch (err) {
      throw toServiceError(err, 'Suppression de la méthode de paiement')
    }
  }
  async uploadPaymentMethodLogo(id: string, file: File) {
    try {
      return await adminContentDataSource.uploadPaymentMethodLogo(id, file)
    } catch (err) {
      throw toServiceError(err, 'Upload du logo de paiement')
    }
  }
}

export const adminContentService = new AdminContentService()
