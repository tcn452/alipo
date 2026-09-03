import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Clock3, Fuel, MapPin, ShieldCheck } from 'lucide-react-native';
import { Station } from '@/types/alipo';
import { QUEUE_LABELS, STATUS_CONFIG } from '@/lib/constants';
import { formatTimeAgo } from '@/lib/utils';
import { palette, radii } from '@/lib/theme';

interface StationCardProps {
  station: Station;
  onPress: () => void;
  onReportPress?: () => void;
  compact?: boolean;
}

export function StationCard({ station, onPress, compact = false }: StationCardProps) {
  const status = STATUS_CONFIG[station.latest_status || 'unknown'] || STATUS_CONFIG.unknown;
  const queue = station.latest_queue ? QUEUE_LABELS[station.latest_queue] : null;

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`Open ${station.name}`}
      activeOpacity={0.82}
      onPress={onPress}
      style={{
        backgroundColor: palette.surface,
        borderColor: palette.line,
        borderWidth: 1,
        borderRadius: radii.card,
        padding: compact ? 14 : 16,
        gap: 12,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View
          style={{
            width: 46,
            height: 46,
            borderRadius: 14,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: palette.forest,
          }}
        >
          <Fuel size={21} color={palette.white} strokeWidth={2.2} />
        </View>

        <View style={{ flex: 1, gap: 3 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Text selectable style={{ color: palette.ink, fontSize: 15, fontWeight: '800' }}>
              {station.name.replace('Energy ', '')}
            </Text>
            {station.verified ? <ShieldCheck size={14} color={palette.leaf} /> : null}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <MapPin size={12} color={palette.muted} />
            <Text selectable style={{ color: palette.muted, fontSize: 12 }}>
              1.2 km · {station.city}
            </Text>
          </View>
        </View>

        <View style={{ alignItems: 'flex-end', gap: 5 }}>
          <View
            style={{
              backgroundColor: `${status.color}16`,
              borderRadius: radii.pill,
              paddingHorizontal: 9,
              paddingVertical: 5,
            }}
          >
            <Text selectable style={{ color: status.color, fontSize: 10, fontWeight: '800' }}>
              {status.label}
            </Text>
          </View>
          <Text selectable style={{ color: palette.muted, fontSize: 10 }}>
            {queue?.label || 'Queue unknown'}
          </Text>
        </View>
      </View>

      {!compact ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTopColor: palette.line,
            borderTopWidth: 1,
            paddingTop: 11,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Clock3 size={12} color={palette.muted} />
            <Text selectable style={{ color: palette.muted, fontSize: 11 }}>
              Updated {formatTimeAgo(station.last_reported_at || station.updated)}
            </Text>
          </View>
          <Text selectable style={{ color: palette.forest, fontSize: 11, fontWeight: '800' }}>
            View details
          </Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}
