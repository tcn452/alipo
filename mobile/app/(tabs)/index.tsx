import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  SafeAreaView
} from 'react-native';
import { Station } from '@/types/alipo';
import { CITIES } from '@/lib/constants';
import { StationCard } from '@/components/StationCard';
import { pb } from '@/lib/pocketbase';
import { useRouter } from 'expo-router';
import { Search, Fuel, RefreshCw, AlertTriangle, CheckCircle, XCircle } from 'lucide-react-native';

const INITIAL_SEED: Station[] = [
  {
    id: 'stat_llw_001',
    name: 'Puma Energy Area 47',
    brand: 'Puma',
    latitude: -13.9572,
    longitude: 33.7915,
    district: 'Area 47',
    city: 'Lilongwe',
    verified: true,
    fuel_types: ['petrol', 'diesel'],
    latest_status: 'available',
    latest_queue: 'short',
    latest_price_petrol: 2530,
    latest_price_diesel: 2734,
    last_reported_at: new Date(Date.now() - 15 * 60000).toISOString()
  },
  {
    id: 'stat_llw_002',
    name: 'TotalEnergies City Centre',
    brand: 'Total',
    latitude: -13.9712,
    longitude: 33.7845,
    district: 'City Centre',
    city: 'Lilongwe',
    verified: true,
    fuel_types: ['petrol', 'diesel'],
    latest_status: 'available',
    latest_queue: 'medium',
    latest_price_petrol: 2530,
    latest_price_diesel: 2734,
    last_reported_at: new Date(Date.now() - 35 * 60000).toISOString()
  },
  {
    id: 'stat_llw_003',
    name: 'Petroda Kanengo Industrial',
    brand: 'Petroda',
    latitude: -13.8821,
    longitude: 33.7741,
    district: 'Kanengo',
    city: 'Lilongwe',
    verified: true,
    fuel_types: ['petrol', 'diesel'],
    latest_status: 'low',
    latest_queue: 'long',
    latest_price_petrol: 2530,
    latest_price_diesel: 2734,
    last_reported_at: new Date(Date.now() - 50 * 60000).toISOString()
  },
  {
    id: 'stat_llw_004',
    name: 'OilCom Old Town (Paul Kagame)',
    brand: 'OilCom',
    latitude: -13.9845,
    longitude: 33.7689,
    district: 'Old Town',
    city: 'Lilongwe',
    verified: true,
    fuel_types: ['petrol', 'diesel'],
    latest_status: 'out',
    latest_queue: 'none',
    latest_price_petrol: 2530,
    latest_price_diesel: 2734,
    last_reported_at: new Date(Date.now() - 120 * 60000).toISOString()
  },
  {
    id: 'stat_bt_001',
    name: 'TotalEnergies Chichiri',
    brand: 'Total',
    latitude: -15.7981,
    longitude: 35.0254,
    district: 'Chichiri',
    city: 'Blantyre',
    verified: true,
    fuel_types: ['petrol', 'diesel'],
    latest_status: 'available',
    latest_queue: 'short',
    latest_price_petrol: 2530,
    latest_price_diesel: 2734,
    last_reported_at: new Date(Date.now() - 25 * 60000).toISOString()
  },
  {
    id: 'stat_bt_002',
    name: 'Puma Ginnery Corner',
    brand: 'Puma',
    latitude: -15.7925,
    longitude: 35.0118,
    district: 'Ginnery Corner',
    city: 'Blantyre',
    verified: true,
    fuel_types: ['petrol', 'diesel'],
    latest_status: 'low',
    latest_queue: 'long',
    latest_price_petrol: 2530,
    latest_price_diesel: 2734,
    last_reported_at: new Date(Date.now() - 60 * 60000).toISOString()
  }
];

export default function HomeScreen() {
  const router = useRouter();
  const [stations, setStations] = useState<Station[]>(INITIAL_SEED);
  const [selectedCity, setSelectedCity] = useState<string>('All Cities');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const fetchStations = async () => {
    setRefreshing(true);
    try {
      const res = await pb.collection('stations').getFullList({ sort: '-updated' });
      if (res && res.length > 0) {
        setStations(res as unknown as Station[]);
      }
    } catch (e) {
      // Fallback in dev
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStations();
  }, []);

  const filteredStations = useMemo(() => {
    return stations.filter((s) => {
      if (selectedCity !== 'All Cities' && s.city !== selectedCity) return false;
      if (selectedStatus !== 'all' && s.latest_status !== selectedStatus) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          s.name.toLowerCase().includes(q) ||
          s.district.toLowerCase().includes(q) ||
          s.brand.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [stations, selectedCity, selectedStatus, search]);

  const stats = useMemo(() => {
    const available = filteredStations.filter((s) => s.latest_status === 'available').length;
    const low = filteredStations.filter((s) => s.latest_status === 'low').length;
    const out = filteredStations.filter((s) => s.latest_status === 'out').length;
    return { available, low, out };
  }, [filteredStations]);

  return (
    <View className="flex-1 bg-gray-50">
      {/* Top Banner with Stats */}
      <View className="bg-emerald-900 px-4 py-3 border-b border-emerald-800">
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <Text className="text-white font-black text-lg">Alipo Fuel Tracker</Text>
            <Text className="text-emerald-200 text-xs">Live availability across Malawi</Text>
          </View>

          {/* Quick Metrics */}
          <View className="flex-row space-x-2">
            <View className="bg-emerald-800/80 px-2.5 py-1.5 rounded-xl flex-row items-center space-x-1.5 border border-emerald-700">
              <View className="w-2 h-2 rounded-full bg-emerald-400" />
              <Text className="text-xs font-bold text-white">{stats.available}</Text>
            </View>

            <View className="bg-emerald-800/80 px-2.5 py-1.5 rounded-xl flex-row items-center space-x-1.5 border border-emerald-700">
              <View className="w-2 h-2 rounded-full bg-amber-400" />
              <Text className="text-xs font-bold text-white">{stats.low}</Text>
            </View>

            <View className="bg-emerald-800/80 px-2.5 py-1.5 rounded-xl flex-row items-center space-x-1.5 border border-emerald-700">
              <View className="w-2 h-2 rounded-full bg-rose-400" />
              <Text className="text-xs font-bold text-white">{stats.out}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Search & Filters */}
      <View className="bg-white p-3 border-b border-gray-200 space-y-2.5">
        {/* Search Input */}
        <View className="flex-row items-center bg-gray-100 rounded-xl px-3 py-2">
          <Search size={16} color="#9ca3af" />
          <TextInput
            placeholder="Search area, brand or station..."
            placeholderTextColor="#9ca3af"
            value={search}
            onChangeText={setSearch}
            className="flex-1 ml-2 text-xs text-gray-900"
          />
        </View>

        {/* City Switcher */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
          {CITIES.map((city) => (
            <TouchableOpacity
              key={city}
              onPress={() => setSelectedCity(city)}
              className={`px-3 py-1.5 rounded-lg mr-2 ${
                selectedCity === city ? 'bg-emerald-600' : 'bg-gray-100'
              }`}
            >
              <Text
                className={`text-xs font-semibold ${
                  selectedCity === city ? 'text-white' : 'text-gray-700'
                }`}
              >
                {city}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Status Pills */}
        <View className="flex-row space-x-2 pt-1">
          {[
            { id: 'all', label: 'All' },
            { id: 'available', label: '🟢 Available' },
            { id: 'low', label: '🟡 Low Supply' },
            { id: 'out', label: '🔴 Out' },
          ].map((st) => (
            <TouchableOpacity
              key={st.id}
              onPress={() => setSelectedStatus(st.id)}
              className={`px-2.5 py-1 rounded-md ${
                selectedStatus === st.id ? 'bg-gray-900' : 'bg-gray-100'
              }`}
            >
              <Text
                className={`text-[11px] font-semibold ${
                  selectedStatus === st.id ? 'text-white' : 'text-gray-600'
                }`}
              >
                {st.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Station List */}
      <FlatList
        data={filteredStations}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 12, paddingBottom: 24 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={fetchStations} colors={['#059669']} />
        }
        renderItem={({ item }) => (
          <StationCard
            station={item}
            onPress={() => {}}
            onReportPress={() => {
              router.push('/(tabs)/report');
            }}
          />
        )}
        ListEmptyComponent={
          <View className="bg-white p-8 rounded-2xl items-center justify-center mt-4">
            <Fuel size={36} color="#9ca3af" />
            <Text className="text-gray-700 font-bold mt-2">No stations found</Text>
            <Text className="text-xs text-gray-400 mt-1">Try changing the city or search query</Text>
          </View>
        }
      />
    </View>
  );
}
