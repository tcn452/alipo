import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Station } from '@/types/alipo';
import { STATUS_CONFIG, QUEUE_LABELS } from '@/lib/constants';
import { formatTimeAgo } from '@/lib/utils';
import { MapPin, Clock, ShieldCheck, PlusCircle } from 'lucide-react-native';

interface StationCardProps {
  station: Station;
  onPress: () => void;
  onReportPress: () => void;
}

export function StationCard({ station, onPress, onReportPress }: StationCardProps) {
  const statusKey = station.latest_status || 'unknown';
  const status = STATUS_CONFIG[statusKey] || STATUS_CONFIG.unknown;
  const queue = station.latest_queue ? QUEUE_LABELS[station.latest_queue] : null;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      className="bg-white rounded-2xl p-4 mb-3 border border-gray-100 shadow-sm"
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-2">
          <View className="flex-row items-center space-x-1.5 mb-1">
            <View className="bg-gray-100 px-2 py-0.5 rounded-md">
              <Text className="text-[11px] font-bold text-gray-700">{station.brand}</Text>
            </View>
            {station.verified && (
              <View className="flex-row items-center space-x-1">
                <ShieldCheck size={12} color="#059669" />
                <Text className="text-[11px] font-semibold text-emerald-600">Verified</Text>
              </View>
            )}
          </View>

          <Text className="text-base font-bold text-gray-900 leading-snug">{station.name}</Text>

          <View className="flex-row items-center mt-1">
            <MapPin size={12} color="#9ca3af" />
            <Text className="text-xs text-gray-500 ml-1">
              {station.district}, {station.city}
            </Text>
          </View>
        </View>

        {/* Status Badge */}
        <View
          style={{ backgroundColor: status.color + '15' }}
          className="px-2.5 py-1 rounded-full flex-row items-center space-x-1"
        >
          <View style={{ backgroundColor: status.color }} className="w-2 h-2 rounded-full" />
          <Text style={{ color: status.color }} className="text-xs font-bold">
            {status.label}
          </Text>
        </View>
      </View>

      {/* Details Row */}
      <View className="flex-row items-center justify-between mt-3 pt-3 border-t border-gray-100">
        <View className="flex-row items-center">
          <Clock size={12} color="#6b7280" />
          <Text className="text-xs text-gray-600 ml-1">
            Queue: <Text className="font-bold text-gray-900">{queue ? queue.duration : 'Unknown'}</Text>
          </Text>
        </View>

        <Text className="text-[11px] text-gray-400">
          Updated {formatTimeAgo(station.last_reported_at || station.updated)}
        </Text>
      </View>

      {/* Prices & Action */}
      <View className="flex-row items-center justify-between mt-2.5 pt-2">
        <View className="flex-row space-x-2">
          {station.latest_price_petrol ? (
            <Text className="text-[11px] font-mono text-gray-600 bg-gray-50 px-2 py-0.5 rounded">
              P: <Text className="font-bold text-gray-900">MWK {station.latest_price_petrol}</Text>
            </Text>
          ) : null}
          {station.latest_price_diesel ? (
            <Text className="text-[11px] font-mono text-gray-600 bg-gray-50 px-2 py-0.5 rounded">
              D: <Text className="font-bold text-gray-900">MWK {station.latest_price_diesel}</Text>
            </Text>
          ) : null}
        </View>

        <TouchableOpacity
          onPress={onReportPress}
          className="bg-emerald-50 px-2.5 py-1 rounded-lg flex-row items-center space-x-1"
        >
          <PlusCircle size={12} color="#047857" />
          <Text className="text-xs font-bold text-emerald-800">Update</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}
