import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

/**
 * Sayfa bazlı yardım altyapısı (Web HelpDrawer'ın mobil karşılığı).
 *
 * Kullanım:
 *  - Ekran bileşeni içinde: `useRegisterHelp(pageHelp)` → Header'da yardım simgesi belirir.
 *  - Header simgesine basılınca HelpBottomSheet açılır.
 *  - Sheet'in alt aksiyonu "AI'a Sor" → pendingAIContext set edilir + AI Chat tab'ına geçilir.
 *  - AIChatScreen mount/render sırasında consumePendingAIContext() ile bağlamı alır.
 */

// ============================================================
// ICON MAP (Ionicons'a indirgenmiş alt küme)
// ============================================================
export type HelpIconName =
  | 'package' | 'packageCheck' | 'packageX'
  | 'search' | 'plus' | 'trash' | 'edit' | 'eye' | 'eyeOff'
  | 'building' | 'user' | 'calendar' | 'clock'
  | 'fileText' | 'fileBar' | 'barChart' | 'trendingUp'
  | 'alert' | 'info' | 'check' | 'lightbulb' | 'xCircle'
  | 'printer' | 'download' | 'upload' | 'filter' | 'star'
  | 'keyboard' | 'zap' | 'shield' | 'help'
  | 'arrowRight' | 'chevronRight' | 'list' | 'book'
  | 'coins' | 'play' | 'receipt' | 'cart' | 'stop'
  | 'ruler' | 'handshake' | 'workflow' | 'layers' | 'card' | 'vault'
  | 'arrowUp' | 'arrowDown' | 'refresh' | 'swap' | 'repeat'
  | 'cube' | 'wallet' | 'storefront' | 'document';

export const HELP_IONICONS: Record<HelpIconName, string> = {
  package: 'cube-outline', packageCheck: 'cube', packageX: 'close-circle-outline',
  search: 'search-outline', plus: 'add', trash: 'trash-outline', edit: 'create-outline',
  eye: 'eye-outline', eyeOff: 'eye-off-outline',
  building: 'business-outline', user: 'person-outline',
  calendar: 'calendar-outline', clock: 'time-outline',
  fileText: 'document-text-outline', fileBar: 'bar-chart-outline',
  barChart: 'stats-chart-outline', trendingUp: 'trending-up-outline',
  alert: 'warning-outline', info: 'information-circle-outline',
  check: 'checkmark-circle-outline', lightbulb: 'bulb-outline',
  xCircle: 'close-circle-outline',
  printer: 'print-outline', download: 'download-outline', upload: 'cloud-upload-outline',
  filter: 'funnel-outline', star: 'star-outline',
  keyboard: 'apps-outline', zap: 'flash-outline', shield: 'shield-checkmark-outline',
  help: 'help-circle-outline',
  arrowRight: 'arrow-forward', chevronRight: 'chevron-forward',
  list: 'list-outline', book: 'book-outline',
  coins: 'cash-outline', play: 'play-circle-outline', receipt: 'receipt-outline',
  cart: 'cart-outline', stop: 'stop-circle-outline',
  ruler: 'resize-outline', handshake: 'people-outline', workflow: 'git-network-outline',
  layers: 'layers-outline', card: 'card-outline', vault: 'lock-closed-outline',
  arrowUp: 'arrow-up-circle-outline', arrowDown: 'arrow-down-circle-outline',
  refresh: 'refresh-outline', swap: 'swap-horizontal-outline', repeat: 'repeat-outline',
  cube: 'cube-outline', wallet: 'wallet-outline', storefront: 'storefront-outline',
  document: 'document-outline',
};

// ============================================================
// TIPLER
// ============================================================
export interface Shortcut { keys: string[]; description: string; }
export interface FAQ { question: string; answer: string; }
export interface Feature { icon: HelpIconName; title: string; description: string; }
export interface Step { title: string; description: string; icon?: HelpIconName; tip?: string; }

interface BaseSection { id?: string; title?: string; description?: string; }

export interface IntroSection extends BaseSection {
  type: 'intro';
  content: string;
  highlights?: { icon: HelpIconName; label: string }[];
}
export interface FeatureGridSection extends BaseSection {
  type: 'feature-grid';
  features: Feature[];
}
export interface StepsSection extends BaseSection {
  type: 'steps';
  steps: Step[];
}
export interface CalloutSection extends BaseSection {
  type: 'callout';
  variant: 'tip' | 'warning' | 'info' | 'success';
  icon?: HelpIconName;
  title: string;
  content: string;
}
export interface BulletListSection extends BaseSection {
  type: 'bullet-list';
  items: { text: string; icon?: HelpIconName }[];
}
export interface FAQSection extends BaseSection {
  type: 'faq';
  items: FAQ[];
}

export type HelpSection =
  | IntroSection | FeatureGridSection | StepsSection
  | CalloutSection | BulletListSection | FAQSection;

export interface PageHelp {
  id: string;
  title: string;
  description?: string;
  menuPath?: string;
  icon?: HelpIconName;
  shortcuts?: Shortcut[];
  sections: HelpSection[];
  faqs?: FAQ[];
}

// ============================================================
// SERIALIZER → AI sistem prompt'u için kompakt markdown
// ============================================================
export function serializePageHelp(help: PageHelp): string {
  const out: string[] = [];
  out.push(`# ${help.title}`);
  if (help.menuPath) out.push(`Menü yolu: ${help.menuPath}`);
  if (help.description) out.push('', help.description);

  for (const section of help.sections) {
    out.push('', ...serializeSection(section));
  }

  if (help.faqs?.length) {
    out.push('', '## Sık Sorulan Sorular');
    for (const f of help.faqs) {
      out.push(`**S: ${f.question}**`, f.answer, '');
    }
  }
  return out.join('\n').trim();
}

function serializeSection(section: HelpSection): string[] {
  const out: string[] = [];
  if (section.title) out.push(`## ${section.title}`);
  if (section.description) out.push(section.description);

  switch (section.type) {
    case 'intro':
      out.push(section.content);
      if (section.highlights?.length) {
        out.push('Öne çıkanlar: ' + section.highlights.map((h) => h.label).join(', '));
      }
      break;
    case 'feature-grid':
      for (const f of section.features) {
        out.push(`- **${f.title}**: ${f.description}`);
      }
      break;
    case 'steps':
      section.steps.forEach((s, i) => {
        const tip = s.tip ? ` _(İpucu: ${s.tip})_` : '';
        out.push(`${i + 1}. **${s.title}**: ${s.description}${tip}`);
      });
      break;
    case 'callout':
      out.push(`> [${section.variant.toUpperCase()}] **${section.title}**: ${section.content}`);
      break;
    case 'bullet-list':
      for (const it of section.items) out.push(`- ${it.text}`);
      break;
    case 'faq':
      for (const f of section.items) out.push(`**S: ${f.question}**`, f.answer);
      break;
  }
  return out;
}

// ============================================================
// CONTEXT
// ============================================================
interface HelpContextValue {
  activeHelp: PageHelp | null;
  registerHelp: (help: PageHelp | null) => void;
  isOpen: boolean;
  open: () => void;
  close: () => void;
  askAI: () => void;
  pendingAIContext: string | null;
  consumePendingAIContext: () => string | null;
  pendingNavigationTab: string | null;
  clearPendingNavigation: () => void;
}

const HelpContext = createContext<HelpContextValue | null>(null);

export function HelpProvider({ children }: { children: React.ReactNode }) {
  const [activeHelp, setActiveHelp] = useState<PageHelp | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [pendingAIContext, setPendingAIContext] = useState<string | null>(null);
  const [pendingNavigationTab, setPendingNavigationTab] = useState<string | null>(null);

  const registerHelp = useCallback((help: PageHelp | null) => {
    setActiveHelp(help);
  }, []);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  const askAI = useCallback(() => {
    if (!activeHelp) return;
    setPendingAIContext(serializePageHelp(activeHelp));
    setPendingNavigationTab('aiChat');
    setIsOpen(false);
  }, [activeHelp]);

  const consumePendingAIContext = useCallback(() => {
    const ctx = pendingAIContext;
    setPendingAIContext(null);
    return ctx;
  }, [pendingAIContext]);

  const clearPendingNavigation = useCallback(() => setPendingNavigationTab(null), []);

  const value = useMemo<HelpContextValue>(() => ({
    activeHelp, registerHelp,
    isOpen, open, close,
    askAI,
    pendingAIContext, consumePendingAIContext,
    pendingNavigationTab, clearPendingNavigation,
  }), [activeHelp, registerHelp, isOpen, open, close, askAI,
       pendingAIContext, consumePendingAIContext, pendingNavigationTab, clearPendingNavigation]);

  return <HelpContext.Provider value={value}>{children}</HelpContext.Provider>;
}

export function useHelp(): HelpContextValue {
  const ctx = useContext(HelpContext);
  if (!ctx) throw new Error('useHelp must be used within HelpProvider');
  return ctx;
}

/** Ekran bileşeninde çağrılır: bu sayfa için yardımı kaydeder, unmount'ta temizler. */
export function useRegisterHelp(help: PageHelp | null) {
  const { registerHelp } = useHelp();
  useEffect(() => {
    registerHelp(help);
    return () => registerHelp(null);
  }, [help, registerHelp]);
}
