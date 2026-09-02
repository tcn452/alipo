import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, Alert } from 'react-native';
import { DispatchRecommendation } from '@/types/alipo';
import { QUEUE_LABELS } from '@/lib/constants';
import { Compass, MapPin, Fuel, Clock, Navigation, ShieldCheck, CheckCircle2 } from 'lucide-react-native';

const DEMO_RECOMMENDATIONS: DispatchRecommendation[] = [
  {
    id: 'stat_llw_001',
    name: 'Puma Energy Area 47',
    brand: 'Puma',
    city: 'Lilongwe',
    district: 'Area 47 Sector 2',
    latitude: -13.9572,
    longitude: 33.7915,
    distance_km: 2.8,
    status: 'available',
    queue: 'short',
    verified: true,
    price_petrol: 2530,
    price_diesel: 2734,
    score: 15
  },
  {
    id: 'stat_llw_002',
    name: 'TotalEnergies City Centre',
    brand: 'Total',
    city: 'Lilongwe',
    district: 'City Centre Sector 1',
    latitude: -13.9712,
    longitude: 33.7845,
    distance_km: 4.1,
    status: 'available',
    queue: 'medium',
    verified: true,
    price_petrol: 2530,
    price_diesel: 2734,
    score: 28
  },
  {
    id: 'stat_llw_005',
    name: 'Mount Meru Area 10',
    brand: 'Mount Meru',
    city: 'Lilongwe',
    district: 'Area 10',
    latitude: -13.9450,
    longitude: 33.8050,
    distance_km: 5.4,
    status: 'available',
    queue: 'none',
    verified: false,
    price_petrol: 2530,
    price_diesel: 2734,
    score: 35
  }
];

export default function DispatchScreen() {
  const [city, setCity] = useState('Lilongwe');
  const [fuelType, setFuelType] = useState<'petrol' | 'diesel'>('diesel');
  const [location, setLocation] = useState('Area 47 Industrial');
  const [recommendations, setRecommendations] = useState<DispatchRecommendation[]>(DEMO_RECOMMENDATIONS);
  const [dispatchedId, setDispatchedId] = useState<string | null>(null);

  const handleDispatch = (stationName: string, id: string) => {
    setDispatchedId(id);
    Alert.alert('Dispatch Sent', `Instructions & coordinates sent to vehicle driver for ${stationName}.`);
  };

  return (
    <ScrollView className="flex-1 bg-gray-50 p-4" showsVerticalScrollIndicator={false}>
      {/* Parameter Box */}
      <View className="bg-white p-4 rounded-2xl border border-gray-200 mb-4 space-y-3 shadow-sm">
        <Text className="text-xs font-bold text-gray-900 uppercase">Input Vehicle Location</Text>

        <TextInput
          value={location}
          onChangeText={setLocation}
          placeholder="e.g. Area 47, Kanengo, Limbe..."
          className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-900"
        />

        <View className="flex-row space-x-2">
          {(['diesel', 'petrol'] as const).map((t) => (
            <TouchableOpacity
              key={t}
              onPress={() => setFuelType(t)}
              className={`flex-1 py-2 rounded-xl border items-center capitalize ${
                fuelType === t ? 'bg-emerald-600 border-emerald-600' : 'bg-gray-50 border-gray-200'
              }`}
            >
              <Text
                className={`text-xs font-bold ${
                  fuelType === t ? 'text-white' : 'text-gray-700'
                }`}
              >
                {t}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Recommendations */}
      <Text className="text-xs font-bold text-gray-900 uppercase mb-2">
        Top 3 Ranked Stations (Queue & Proximity)
      </Text>

      {recommendations.map((rec, index) => {
        const isOptimal = index === 0;
        const queueInfo = QUEUE_LABELS[rec.queue] || QUEUE_LABELS.short;

        return (
          <View
            key={rec.id}
            className={`bg-white rounded-2xl p-4 mb-3 border shadow-sm ${
              isOptimal ? 'border-emerald-500 bg-emerald-50/10' : 'border-gray-200'
            }`}
          >
            {isOptimal && (
              <View className="self-start bg-emerald-600 px-2 py-0.5 rounded-full mb-2">
                <Text className="text-[10px] font-bold text-white uppercase">★ #1 Optimal Pick</Text>
              </View>
            )}

            <View className="flex-row items-center justify-between">
              <Text className="text-base font-bold text-gray-900">{rec.name}</Text>
              {rec.verified && (
                <View className="flex-row items-center space-x-1">
                  <ShieldCheck size={12} color="#059669" />
                  <Text className="text-[11px] font-semibold text-emerald-600">Verified</Text>
                </View>
              )}
            </View>

            <View className="flex-row items-center mt-1">
              <MapPin size={12} color="#9ca3af" />
              <Text className="text-xs text-gray-500 ml-1">{rec.district}</Text>
            </View>

            <View className="flex-row items-center justify-between mt-3 pt-2 border-t border-gray-100">
              <View className="flex-row items-center">
                <Navigation size={12} color="#6b7280" />
                <Text className="text-xs text-gray-700 ml-1 font-bold">{rec.distance_km} km away</Text>
              </View>
              <View className="flex-row items-center">
                <Clock size={12} color="#6b7280" />
                <Text className="text-xs text-gray-700 ml-1">
                  Queue: <Text className="font-bold">{queueInfo.duration}</Text>
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => handleDispatch(rec.name, rec.id)}
              className={`mt-3 py-2.5 rounded-xl items-center flex-row justify-center space-x-1 ${
                dispatchedId === rec.id ? 'bg-emerald-100' : 'bg-emerald-600'
              }`}
            >
              {dispatchedId === rec.id ? (
                <>
                  <CheckCircle2 size={14} color="#065f46" />
                  <Text className="text-emerald-900 font-bold text-xs">Dispatched to Driver</Text>
                </>
              ) : (
                <Text className="text-white font-bold text-xs">Dispatch to Vehicle</Text>
              )}
            </TouchableOpacity>
          </View>
        );
      })}
    </ScrollView>
  );
}
