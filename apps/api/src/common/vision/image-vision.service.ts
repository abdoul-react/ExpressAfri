import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as https from 'https';

export interface VisionLabel {
  description: string;
  score: number; // 0-1 confidence
}

/**
 * Service d'analyse d'image par vision par ordinateur.
 *
 * Stratégie en cascade :
 * 1. Google Cloud Vision API (si GOOGLE_VISION_API_KEY configurée) :
 *    analyse les pixels → labels sémantiques précis (ex: "dress", "red", "woman").
 *    C'est la même technologie qu'AliExpress/Taobao.
 * 2. Fallback heuristique : extraction de tokens depuis le nom de fichier.
 *    Utile en développement ou si la clé n'est pas configurée.
 *
 * Pour obtenir une clé Google Vision :
 * https://console.cloud.google.com/apis/library/vision.googleapis.com
 * Gratuit jusqu'à 1000 requêtes/mois.
 */
@Injectable()
export class ImageVisionService {
  private readonly logger = new Logger(ImageVisionService.name);
  private readonly apiKey: string | null;

  constructor(private config: ConfigService) {
    this.apiKey = config.get<string>('GOOGLE_VISION_API_KEY') ?? null;
    if (!this.apiKey) {
      this.logger.warn(
        'GOOGLE_VISION_API_KEY non configurée — fallback heuristique actif. ' +
          'La recherche par image sera limitée aux noms de fichiers.',
      );
    }
  }

  /**
   * Analyse une image et retourne des labels sémantiques triés par confiance.
   * @param imagePath Chemin absolu vers le fichier image uploadé
   * @param filename Nom original du fichier (pour le fallback)
   */
  async extractLabels(
    imagePath: string,
    filename: string,
  ): Promise<VisionLabel[]> {
    if (this.apiKey) {
      try {
        const labels = await this.callGoogleVision(imagePath);
        if (labels.length > 0) {
          this.logger.debug(
            `Vision API: ${labels.length} labels pour ${filename}`,
          );
          return labels;
        }
      } catch (err) {
        this.logger.warn(
          `Vision API échouée pour ${filename}, fallback heuristique`,
          err,
        );
      }
    }

    // Fallback : heuristique sur le nom de fichier
    return this.extractFromFilename(filename);
  }

  /**
   * Appelle Google Cloud Vision API (LABEL_DETECTION + WEB_DETECTION + IMAGE_PROPERTIES).
   * LABEL_DETECTION  : objets, scènes, matières.
   * WEB_DETECTION    : entités web reconnues (marques, produits spécifiques).
   * IMAGE_PROPERTIES : couleurs dominantes des pixels.
   */
  private async callGoogleVision(imagePath: string): Promise<VisionLabel[]> {
    const imageBytes = fs.readFileSync(imagePath);
    const base64Image = imageBytes.toString('base64');

    const requestBody = JSON.stringify({
      requests: [
        {
          image: { content: base64Image },
          features: [
            { type: 'LABEL_DETECTION', maxResults: 20 },
            { type: 'WEB_DETECTION', maxResults: 10 },
            { type: 'IMAGE_PROPERTIES', maxResults: 5 },
          ],
        },
      ],
    });

    const responseData = await this.httpsPost(
      `https://vision.googleapis.com/v1/images:annotate?key=${this.apiKey}`,
      requestBody,
    );

    const response = JSON.parse(responseData);
    const result = response.responses?.[0];
    if (!result) return [];

    const labels: VisionLabel[] = [];
    const seen = new Set<string>();

    const addLabel = (desc: string, score: number) => {
      const normalized = desc.toLowerCase().trim();
      if (normalized.length < 2 || seen.has(normalized)) return;
      seen.add(normalized);
      labels.push({ description: normalized, score });
    };

    // Labels généraux (objets, scènes, matières)
    for (const label of result.labelAnnotations ?? []) {
      if (label.score >= 0.6) {
        addLabel(label.description, label.score);
      }
    }

    // Entités web (marques, produits reconnus)
    for (const entity of result.webDetection?.webEntities ?? []) {
      if (entity.score >= 0.5 && entity.description) {
        addLabel(entity.description, entity.score * 0.9);
      }
    }

    // Couleurs dominantes → convertir en noms de couleur FR
    const colorProps =
      result.imagePropertiesAnnotation?.dominantColors?.colors ?? [];
    for (const colorInfo of colorProps.slice(0, 3)) {
      const colorName = this.rgbToColorName(
        colorInfo.color?.red ?? 0,
        colorInfo.color?.green ?? 0,
        colorInfo.color?.blue ?? 0,
      );
      if (colorName && colorInfo.score >= 0.1) {
        addLabel(colorName, colorInfo.score * 0.7);
      }
    }

    return labels.sort((a, b) => b.score - a.score);
  }

  /**
   * Convertit une couleur RGB en nom de couleur français.
   * Utilisé pour enrichir les labels avec la couleur dominante de l'image.
   */
  private rgbToColorName(r: number, g: number, b: number): string | null {
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const lightness = (max + min) / 2 / 255;
    const saturation =
      max === min
        ? 0
        : (max - min) / 255 / (1 - Math.abs(2 * lightness - 1));

    if (lightness < 0.15) return 'noir';
    if (lightness > 0.85) return 'blanc';
    if (saturation < 0.15) return 'gris';

    const hue =
      max === r
        ? ((g - b) / (max - min)) % 6
        : max === g
          ? (b - r) / (max - min) + 2
          : (r - g) / (max - min) + 4;
    const h = ((hue * 60) % 360 + 360) % 360;

    if (h < 15 || h >= 345) return 'rouge';
    if (h < 45) return 'orange';
    if (h < 75) return 'jaune';
    if (h < 150) return 'vert';
    if (h < 195) return 'turquoise';
    if (h < 255) return 'bleu';
    if (h < 285) return 'violet';
    if (h < 345) return 'rose';
    return null;
  }

  /**
   * Fallback : extraction de tokens sémantiques depuis le nom de fichier.
   * Utilisé quand Google Vision n'est pas configuré ou échoue.
   */
  extractFromFilename(filename: string): VisionLabel[] {
    const SYNONYMS: Record<string, string[]> = {
      dress: ['robe', 'dress'],
      robe: ['robe'],
      skirt: ['jupe'],
      jupe: ['jupe'],
      shirt: ['chemise'],
      chemise: ['chemise'],
      blouse: ['chemisier'],
      tshirt: ['t-shirt'],
      tee: ['t-shirt'],
      pants: ['pantalon'],
      trouser: ['pantalon'],
      pantalon: ['pantalon'],
      jean: ['jean'],
      jeans: ['jean'],
      jacket: ['veste', 'blouson'],
      veste: ['veste'],
      blouson: ['blouson'],
      coat: ['manteau'],
      manteau: ['manteau'],
      suit: ['costume'],
      costume: ['costume'],
      shoe: ['chaussure'],
      shoes: ['chaussure'],
      chaussure: ['chaussure'],
      sneaker: ['sneaker', 'basket'],
      basket: ['basket'],
      boot: ['botte'],
      botte: ['botte'],
      bag: ['sac'],
      sac: ['sac'],
      handbag: ['sac'],
      purse: ['sac'],
      watch: ['montre'],
      montre: ['montre'],
      hat: ['chapeau', 'casquette'],
      cap: ['casquette'],
      scarf: ['écharpe', 'foulard'],
      red: ['rouge'],
      rouge: ['rouge'],
      blue: ['bleu'],
      bleu: ['bleu'],
      green: ['vert'],
      vert: ['vert'],
      black: ['noir'],
      noir: ['noir'],
      white: ['blanc'],
      blanc: ['blanc'],
      yellow: ['jaune'],
      jaune: ['jaune'],
      pink: ['rose'],
      rose: ['rose'],
      orange: ['orange'],
      purple: ['violet'],
      violet: ['violet'],
      brown: ['marron'],
      marron: ['marron'],
      grey: ['gris'],
      gray: ['gris'],
      gris: ['gris'],
      gold: ['or', 'doré'],
      silver: ['argent'],
      women: ['femme'],
      woman: ['femme'],
      femme: ['femme'],
      ladies: ['femme'],
      men: ['homme'],
      man: ['homme'],
      homme: ['homme'],
      kids: ['enfant'],
      child: ['enfant'],
      enfant: ['enfant'],
      phone: ['téléphone', 'smartphone'],
      smartphone: ['smartphone'],
      laptop: ['ordinateur', 'laptop'],
      computer: ['ordinateur'],
      tablet: ['tablette'],
      headphone: ['casque', 'écouteur'],
      earphone: ['écouteur'],
      lipstick: ['rouge à lèvres'],
      perfume: ['parfum'],
      parfum: ['parfum'],
      cream: ['crème'],
      creme: ['crème'],
      chair: ['chaise'],
      table: ['table'],
      lamp: ['lampe'],
      sofa: ['canapé'],
      sport: ['sport'],
      football: ['football'],
      gym: ['gym', 'fitness'],
    };

    const cleaned = filename
      .replace(/\.[^.]+$/, '')
      .replace(/[_\-\.]+/g, ' ')
      .replace(/\b\d{6,}\b/g, '')
      .replace(/\b[a-f0-9]{8,}\b/gi, '')
      .toLowerCase()
      .trim();

    const words = cleaned.split(/\s+/).filter((w) => w.length >= 3);
    const labels: VisionLabel[] = [];
    const seen = new Set<string>();

    for (const word of words) {
      const mapped = SYNONYMS[word];
      if (mapped) {
        for (const t of mapped) {
          if (!seen.has(t)) {
            seen.add(t);
            labels.push({ description: t, score: 0.7 });
          }
        }
      } else if (word.length >= 4 && !seen.has(word)) {
        seen.add(word);
        labels.push({ description: word, score: 0.5 });
      }
    }

    return labels;
  }

  /** Requête HTTPS POST simple sans dépendance externe. */
  private httpsPost(url: string, body: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const options = {
        hostname: urlObj.hostname,
        path: urlObj.pathname + urlObj.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      };
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 400) {
            reject(new Error(`Vision API HTTP ${res.statusCode}: ${data}`));
          } else {
            resolve(data);
          }
        });
      });
      req.on('error', reject);
      req.setTimeout(10000, () => {
        req.destroy();
        reject(new Error('Vision API timeout'));
      });
      req.write(body);
      req.end();
    });
  }
}
