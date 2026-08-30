// Service for indexing, loading and streaming trained VSL motions from /vsl/manifest.json & /vsl/library/

export interface VSLDatasetFrame {
  t: number;
  leftHand: { x: number; y: number; z?: number; rotation?: number; shape?: string; detected?: boolean };
  rightHand: { x: number; y: number; z?: number; rotation?: number; shape?: string; detected?: boolean };
  leftElbow: { x: number; y: number; z?: number };
  rightElbow: { x: number; y: number; z?: number };
  leftShoulder: { x: number; y: number; z?: number };
  rightShoulder: { x: number; y: number; z?: number };
  head: { x: number; y: number; z?: number };
}

export interface VSLMotionData {
  schema: string;
  label: string;
  slug: string;
  source?: string;
  duration: number;
  framesCount: number;
  frames: VSLDatasetFrame[];
}

export interface VSLManifestLabel {
  label: string;
  motion: string;
  representativeSource?: string;
  quality?: number;
  sampleCount?: number;
  samples?: string[];
}

class VSLMotionDatasetService {
  private manifestLabels: Map<string, VSLManifestLabel> = new Map();
  private cache: Map<string, VSLMotionData> = new Map();
  private isLoaded = false;

  constructor() {
    this.initManifest();
  }

  private async initManifest() {
    try {
      const res = await fetch('/vsl/manifest.json');
      if (res.ok) {
        const data = await res.json();
        if (data && data.labels) {
          for (const [key, val] of Object.entries(data.labels)) {
            this.manifestLabels.set(key.toLowerCase(), val as VSLManifestLabel);
          }
          this.isLoaded = true;
        }
      }
    } catch {
      // Graceful fallback
    }
  }

  /**
   * Search matching motion entries for a given Vietnamese phrase
   */
  public findMatchingMotions(text: string): { slug: string; label: string; motionPath: string }[] {
    const clean = text.toLowerCase().trim();
    const matches: { slug: string; label: string; motionPath: string }[] = [];

    for (const [key, item] of this.manifestLabels.entries()) {
      const itemLabel = item.label.toLowerCase();
      if (clean.includes(itemLabel) || clean.includes(key.replace(/_/g, ' '))) {
        matches.push({
          slug: key,
          label: item.label,
          motionPath: item.motion,
        });
      }
    }

    return matches;
  }

  /**
   * Load motion JSON data from /vsl/{motionPath}
   */
  public async loadMotion(motionPath: string): Promise<VSLMotionData | null> {
    if (this.cache.has(motionPath)) {
      return this.cache.get(motionPath)!;
    }

    try {
      const cleanPath = motionPath.startsWith('/') ? motionPath : `/vsl/${motionPath}`;
      const res = await fetch(cleanPath);
      if (res.ok) {
        const data: VSLMotionData = await res.json();
        this.cache.set(motionPath, data);
        return data;
      }
    } catch (err) {
      console.warn('[VSLMotionDataset] Could not load motion:', motionPath, err);
    }
    return null;
  }
}

export const vslMotionDatasetService = new VSLMotionDatasetService();
