import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, LayoutAnimation, Platform, UIManager } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import BottomSheet from './BottomSheet';
import { useTheme } from '../contexts/ThemeContext';
import {
  useHelp, HELP_IONICONS, HelpIconName, HelpSection, FAQ,
} from '../lib/helpContext';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function FAQItem({ item, colors, styles }: { item: FAQ; colors: any; styles: any }) {
  const [open, setOpen] = useState(false);
  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen(prev => !prev);
  };
  return (
    <View style={[styles.faqItem, { borderColor: colors.border, backgroundColor: open ? colors.background : 'transparent' }]}>
      <Pressable onPress={toggle} style={styles.faqHeader}>
        <Text style={[styles.faqQ, { color: colors.text }]}>{item.question}</Text>
        <Icon name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textSecondary} />
      </Pressable>
      {open && (
        <Text style={[styles.faqA, { color: colors.textSecondary }]}>{item.answer}</Text>
      )}
    </View>
  );
}

const ICON = (name?: HelpIconName) => (name ? HELP_IONICONS[name] : 'help-circle-outline');

const CALLOUT_STYLE: Record<string, { color: string; icon: string }> = {
  tip:     { color: '#10B981', icon: 'bulb-outline' },
  warning: { color: '#F59E0B', icon: 'warning-outline' },
  info:    { color: '#3B82F6', icon: 'information-circle-outline' },
  success: { color: '#10B981', icon: 'checkmark-circle-outline' },
};

export default function HelpBottomSheet() {
  const { colors } = useTheme();
  const { isOpen, close, askAI, activeHelp } = useHelp();
  const styles = createStyles(colors);

  if (!activeHelp) return null;

  return (
    <BottomSheet
      visible={isOpen}
      onClose={close}
      title={activeHelp.title}
      icon={activeHelp.icon ? HELP_IONICONS[activeHelp.icon] : 'help-circle-outline'}
      iconColor="#3B82F6"
      footer={
        <Pressable style={styles.askAIButton} onPress={askAI}>
          <Icon name="sparkles-outline" size={18} color="#fff" />
          <Text style={styles.askAIText}>Bu sayfa hakkında AI'a sor</Text>
        </Pressable>
      }
    >
      <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 500 }}>
        {!!activeHelp.description && (
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            {activeHelp.description}
          </Text>
        )}

        {!!activeHelp.menuPath && (
          <View style={[styles.menuPathRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Icon name="navigate-outline" size={14} color={colors.textTertiary} />
            <Text style={[styles.menuPath, { color: colors.textSecondary }]}>{activeHelp.menuPath}</Text>
          </View>
        )}

        {activeHelp.sections.map((s, i) => (
          <View key={s.id ?? i} style={styles.section}>
            {renderSection(s, colors, styles)}
          </View>
        ))}

        {!!activeHelp.faqs?.length && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Sık Sorulan Sorular</Text>
            {activeHelp.faqs.map((f, i) => (
              <FAQItem key={i} item={f} colors={colors} styles={styles} />
            ))}
          </View>
        )}

        <View style={{ height: 8 }} />
      </ScrollView>
    </BottomSheet>
  );
}

function renderSection(s: HelpSection, colors: any, styles: any) {
  const elements: React.ReactNode[] = [];
  if (s.title) {
    elements.push(<Text key="t" style={[styles.sectionTitle, { color: colors.text }]}>{s.title}</Text>);
  }
  if (s.description) {
    elements.push(<Text key="d" style={[styles.sectionDesc, { color: colors.textSecondary }]}>{s.description}</Text>);
  }

  switch (s.type) {
    case 'intro':
      elements.push(<Text key="c" style={[styles.text, { color: colors.text }]}>{s.content}</Text>);
      if (s.highlights?.length) {
        elements.push(
          <View key="h" style={styles.highlightRow}>
            {s.highlights.map((h, i) => (
              <View key={i} style={[styles.highlightChip, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Icon name={ICON(h.icon)} size={14} color="#3B82F6" />
                <Text style={[styles.highlightText, { color: colors.text }]}>{h.label}</Text>
              </View>
            ))}
          </View>
        );
      }
      break;

    case 'feature-grid':
      elements.push(
        <View key="fg" style={styles.featureList}>
          {s.features.map((f, i) => (
            <View key={i} style={[styles.featureItem, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <View style={[styles.featureIcon, { backgroundColor: '#3B82F620' }]}>
                <Icon name={ICON(f.icon)} size={16} color="#3B82F6" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.featureTitle, { color: colors.text }]}>{f.title}</Text>
                <Text style={[styles.featureDesc, { color: colors.textSecondary }]}>{f.description}</Text>
              </View>
            </View>
          ))}
        </View>
      );
      break;

    case 'steps':
      elements.push(
        <View key="st" style={styles.stepList}>
          {s.steps.map((step, i) => (
            <View key={i} style={styles.stepItem}>
              <View style={[styles.stepNumber, { backgroundColor: '#3B82F6' }]}>
                <Text style={styles.stepNumberText}>{i + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.stepTitle, { color: colors.text }]}>{step.title}</Text>
                <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>{step.description}</Text>
                {!!step.tip && (
                  <View style={styles.stepTipRow}>
                    <Icon name="bulb-outline" size={12} color="#F59E0B" />
                    <Text style={[styles.stepTip, { color: '#F59E0B' }]}>{step.tip}</Text>
                  </View>
                )}
              </View>
            </View>
          ))}
        </View>
      );
      break;

    case 'callout': {
      const style = CALLOUT_STYLE[s.variant] || CALLOUT_STYLE.info;
      elements.push(
        <View key="ca" style={[styles.callout, { backgroundColor: `${style.color}15`, borderColor: style.color }]}>
          <Icon name={s.icon ? ICON(s.icon) : style.icon} size={18} color={style.color} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.calloutTitle, { color: style.color }]}>{s.title}</Text>
            <Text style={[styles.calloutText, { color: colors.text }]}>{s.content}</Text>
          </View>
        </View>
      );
      break;
    }

    case 'bullet-list':
      elements.push(
        <View key="bl" style={styles.bulletList}>
          {s.items.map((it, i) => (
            <View key={i} style={styles.bulletItem}>
              <Icon name={ICON(it.icon) || 'ellipse'} size={6} color={colors.textSecondary} style={{ marginTop: 8 }} />
              <Text style={[styles.bulletText, { color: colors.text }]}>{it.text}</Text>
            </View>
          ))}
        </View>
      );
      break;

    case 'faq':
      elements.push(
        <View key="fq">
          {s.items.map((f, i) => (
            <FAQItem key={i} item={f} colors={colors} styles={styles} />
          ))}
        </View>
      );
      break;
  }

  return elements;
}

const createStyles = (colors: any) => StyleSheet.create({
  description: { fontSize: 13, lineHeight: 19, marginBottom: 12 },
  menuPathRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1,
    alignSelf: 'flex-start', marginBottom: 16,
  },
  menuPath: { fontSize: 11 },
  section: { marginBottom: 18 },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 8 },
  sectionDesc: { fontSize: 12, marginBottom: 8, lineHeight: 17 },
  text: { fontSize: 13, lineHeight: 19 },
  highlightRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  highlightChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1,
  },
  highlightText: { fontSize: 11, fontWeight: '500' },
  featureList: { gap: 8 },
  featureItem: {
    flexDirection: 'row', gap: 10, padding: 10, borderRadius: 10, borderWidth: 1,
  },
  featureIcon: {
    width: 32, height: 32, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  featureTitle: { fontSize: 13, fontWeight: '600', marginBottom: 2 },
  featureDesc: { fontSize: 12, lineHeight: 16 },
  stepList: { gap: 12 },
  stepItem: { flexDirection: 'row', gap: 10 },
  stepNumber: {
    width: 24, height: 24, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  stepNumberText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  stepTitle: { fontSize: 13, fontWeight: '600', marginBottom: 2 },
  stepDesc: { fontSize: 12, lineHeight: 17 },
  stepTipRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  stepTip: { fontSize: 11, fontStyle: 'italic' },
  callout: {
    flexDirection: 'row', gap: 10, padding: 12, borderRadius: 10, borderWidth: 1,
  },
  calloutTitle: { fontSize: 12, fontWeight: '700', marginBottom: 2 },
  calloutText: { fontSize: 12, lineHeight: 17 },
  bulletList: { gap: 6 },
  bulletItem: { flexDirection: 'row', gap: 8 },
  bulletText: { fontSize: 13, lineHeight: 19, flex: 1 },
  faqItem: {
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  faqQ: { fontSize: 13, fontWeight: '600', flex: 1 },
  faqA: { fontSize: 12, lineHeight: 17, marginTop: 8 },
  askAIButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#3B82F6', borderRadius: 12, paddingVertical: 12, flex: 1,
  },
  askAIText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
