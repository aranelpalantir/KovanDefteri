import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/field';
import { Section } from '@/components/ui/section';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { confirm } from '@/lib/confirm';
import { daysUntil, formatLong, relativeDays, todayISO } from '@/lib/date';
import { useStore } from '@/lib/store';
import type { Task } from '@/lib/types';
import { Radius, Spacing } from '@/theme/colors';

export default function TasksScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { db, addTask, toggleTask, removeTask } = useStore();
  const [title, setTitle] = useState('');

  const { overdue, today, upcoming, done } = useMemo(() => {
    const sorted = [...db.tasks].sort((a, b) => a.due.localeCompare(b.due));
    return {
      overdue: sorted.filter((t) => !t.done && daysUntil(t.due) < 0),
      today: sorted.filter((t) => !t.done && daysUntil(t.due) === 0),
      upcoming: sorted.filter((t) => !t.done && daysUntil(t.due) > 0),
      done: sorted.filter((t) => t.done).reverse(),
    };
  }, [db.tasks]);

  const hiveCode = (task: Task) => db.hives.find((h) => h.id === task.hiveId)?.code;

  const add = () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    addTask({ title: trimmed, due: todayISO() });
    setTitle('');
  };

  const row = (task: Task, tone: 'danger' | 'warning' | 'muted' | 'done') => {
    const color = {
      danger: theme.danger,
      warning: theme.primary,
      muted: theme.textMuted,
      done: theme.textMuted,
    }[tone];

    return (
      <Pressable
        key={task.id}
        onPress={() => toggleTask(task.id)}
        onLongPress={() =>
          confirm({
            title: 'Görev silinsin mi?',
            message: task.title,
            confirmLabel: 'Sil',
            destructive: true,
            onConfirm: () => removeTask(task.id),
          })
        }
        style={({ pressed }) => [
          styles.task,
          { backgroundColor: theme.surface, borderColor: theme.border, opacity: pressed ? 0.7 : 1 },
        ]}>
        <Ionicons
          name={task.done ? 'checkmark-circle' : 'ellipse-outline'}
          size={24}
          color={task.done ? theme.success : color}
        />
        <View style={{ flex: 1, gap: 2 }}>
          <Text
            variant="heading"
            style={task.done ? { textDecorationLine: 'line-through', color: theme.textMuted } : undefined}>
            {task.title}
          </Text>
          <Text variant="caption" style={{ color }}>
            {formatLong(task.due)} · {relativeDays(task.due)}
            {hiveCode(task) ? ` · kovan ${hiveCode(task)}` : ''}
          </Text>
        </View>
        {task.hiveId && !task.done ? (
          <Pressable
            hitSlop={8}
            onPress={() => router.push(`/inspection/new?hiveId=${task.hiveId}`)}
            style={[styles.go, { backgroundColor: theme.primarySoft }]}>
            <Ionicons name="arrow-forward" size={16} color={theme.primary} />
          </Pressable>
        ) : null}
      </Pressable>
    );
  };

  const nothing = db.tasks.length === 0;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.bg }}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled">
      <Card>
        <Text variant="label" color="textMuted">
          HIZLI GÖREV
        </Text>
        <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm }}>
          <View style={{ flex: 1 }}>
            <Input
              value={title}
              onChangeText={setTitle}
              placeholder="Örn. Şurup hazırla"
              onSubmitEditing={add}
              returnKeyType="done"
            />
          </View>
          <Button title="Ekle" onPress={add} fullWidth={false} disabled={!title.trim()} />
        </View>
      </Card>

      {nothing ? (
        <EmptyState
          icon="checkbox-outline"
          title="Görev yok"
          message="Muayene kaydederken sonraki kontrol tarihi otomatik görev olur. Buradan da elle görev ekleyebilirsiniz."
        />
      ) : null}

      {overdue.length > 0 && (
        <Section title={`Gecikmiş (${overdue.length})`}>
          <View style={{ gap: Spacing.sm }}>{overdue.map((t) => row(t, 'danger'))}</View>
        </Section>
      )}

      {today.length > 0 && (
        <Section title="Bugün">
          <View style={{ gap: Spacing.sm }}>{today.map((t) => row(t, 'warning'))}</View>
        </Section>
      )}

      {upcoming.length > 0 && (
        <Section title="Yaklaşan">
          <View style={{ gap: Spacing.sm }}>{upcoming.map((t) => row(t, 'muted'))}</View>
        </Section>
      )}

      {done.length > 0 && (
        <Section title={`Tamamlanan (${done.length})`}>
          <View style={{ gap: Spacing.sm }}>{done.slice(0, 20).map((t) => row(t, 'done'))}</View>
        </Section>
      )}

      {!nothing && (
        <Text variant="caption" color="textMuted" center>
          Tamamlamak için dokunun, silmek için basılı tutun.
        </Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, gap: Spacing.xl, paddingBottom: Spacing.xxl },
  task: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.md,
  },
  go: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
