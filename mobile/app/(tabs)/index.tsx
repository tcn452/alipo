import React, { useEffect, useMemo, useState } from 'react';
import {
  ImageBackground,
  Modal,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Bell,
  ChevronLeft,
  CreditCard,
  Droplet,
  Fuel,
  LocateFixed,
  MapPin,
  Search,
  Settings2,
  ShieldCheck,
  Store,
  UserRound,
  X,
} from 'lucide-react-native';
import { Station } from '@/types/alipo';
import { StationCard } from '@/components/StationCard';
import { pb } from '@/lib/pocketbase';
import { palette, radii } from '@/lib/theme';

const INITIAL_SEED: Station[] = [
  { id: 'stat_llw_001', name: 'Puma Energy Area 47', brand: 'Puma', latitude: -13.9572, longitude: 33.7915, district: 'Area 47', city: 'Lilongwe', verified: true, fuel_types: ['petrol', 'diesel'], latest_status: 'available', latest_queue: 'short', latest_price_petrol: 1640, latest_price_diesel: 1720, last_reported_at: new Date(Date.now() - 20 * 60000).toISOString() },
  { id: 'stat_llw_002', name: 'TotalEnergies City Centre', brand: 'Total', latitude: -13.9712, longitude: 33.7845, district: 'City Centre', city: 'Lilongwe', verified: true, fuel_types: ['petrol', 'diesel'], latest_status: 'available', latest_queue: 'medium', latest_price_petrol: 1640, latest_price_diesel: 1720, last_reported_at: new Date(Date.now() - 35 * 60000).toISOString() },
  { id: 'stat_llw_003', name: 'Petroda Kanengo Industrial', brand: 'Petroda', latitude: -13.8821, longitude: 33.7741, district: 'Kanengo', city: 'Lilongwe', verified: true, fuel_types: ['petrol', 'diesel'], latest_status: 'low', latest_queue: 'long', latest_price_petrol: 1640, latest_price_diesel: 1720, last_reported_at: new Date(Date.now() - 50 * 60000).toISOString() },
  { id: 'stat_llw_004', name: 'OilCom Old Town', brand: 'OilCom', latitude: -13.9845, longitude: 33.7689, district: 'Old Town', city: 'Lilongwe', verified: true, fuel_types: ['petrol', 'diesel'], latest_status: 'out', latest_queue: 'none', latest_price_petrol: 1640, latest_price_diesel: 1720, last_reported_at: new Date(Date.now() - 120 * 60000).toISOString() },
];

const FILTERS = [
  { id: 'all', label: 'All', icon: Settings2 },
  { id: 'available', label: 'Petrol', icon: Droplet },
  { id: 'low', label: 'Diesel', icon: Droplet },
];

const PIN_POSITIONS = [
  { top: '18%', left: '40%' },
  { top: '39%', left: '66%' },
  { top: '58%', left: '27%' },
  { top: '70%', left: '59%' },
] as const;

export default function HomeScreen() {
  const router = useRouter();
  const [stations, setStations] = useState<Station[]>(INITIAL_SEED);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);

  const fetchStations = async () => {
    setRefreshing(true);
    try {
      const result = await pb.collection('stations').getFullList({ sort: '-updated' });
      if (result.length) setStations(result as unknown as Station[]);
    } catch {
      // Keep the useful offline seed visible when PocketBase is unavailable.
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStations();
  }, []);

  const visibleStations = useMemo(() => {
    const query = search.trim().toLowerCase();
    return stations.filter((station) => {
      if (filter !== 'all' && station.latest_status !== filter) return false;
      if (!query) return true;
      return [station.name, station.brand, station.district, station.city]
        .join(' ')
        .toLowerCase()
        .includes(query);
    });
  }, [filter, search, stations]);

  const nearest = visibleStations[0];

  return (
    <View style={{ flex: 1, backgroundColor: palette.ivory }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: palette.forest }}>
        <View style={{ paddingHorizontal: 18, paddingTop: 10, paddingBottom: 22, gap: 18 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ gap: 3 }}>
              <Text selectable style={{ color: palette.white, fontSize: 22, fontWeight: '900', letterSpacing: -0.4 }}>
                Moni! 👋🏾
              </Text>
              <Text selectable style={{ color: '#D3E3D9', fontSize: 12, lineHeight: 17 }}>
                Find fuel. Share updates. Keep Malawi moving.
              </Text>
            </View>
            <TouchableOpacity accessibilityLabel="Notifications" style={{ padding: 8 }}>
              <Bell size={23} color={palette.white} />
            </TouchableOpacity>
          </View>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: palette.surface,
              borderRadius: radii.control,
              paddingHorizontal: 14,
              height: 48,
              gap: 10,
            }}
          >
            <Search size={19} color={palette.muted} />
            <TextInput
              accessibilityLabel="Search station or area"
              placeholder="Search station or area"
              placeholderTextColor="#8A918C"
              value={search}
              onChangeText={setSearch}
              style={{ flex: 1, color: palette.ink, fontSize: 14 }}
            />
            {search ? (
              <TouchableOpacity accessibilityLabel="Clear search" onPress={() => setSearch('')}>
                <X size={17} color={palette.muted} />
              </TouchableOpacity>
            ) : null}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            <TouchableOpacity
              onPress={() => setFilter('all')}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 36,
                borderRadius: radii.pill, backgroundColor: filter === 'all' ? palette.surface : '#174F3C',
              }}
            >
              <LocateFixed size={15} color={filter === 'all' ? palette.forest : palette.white} />
              <Text style={{ color: filter === 'all' ? palette.forest : palette.white, fontSize: 12, fontWeight: '800' }}>Nearest</Text>
            </TouchableOpacity>
            {FILTERS.slice(1).map(({ id, label, icon: Icon }) => (
              <TouchableOpacity
                key={id}
                onPress={() => setFilter(filter === id ? 'all' : id)}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 36,
                  borderRadius: radii.pill, backgroundColor: filter === id ? palette.surface : '#174F3C',
                }}
              >
                <Icon size={14} color={label === 'Petrol' ? palette.orange : palette.white} fill={label === 'Diesel' ? palette.white : 'transparent'} />
                <Text style={{ color: filter === id ? palette.forest : palette.white, fontSize: 12, fontWeight: '700' }}>{label}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              onPress={() => setFilter('all')}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 36, borderRadius: radii.pill, backgroundColor: '#174F3C' }}
            >
              <Settings2 size={14} color={palette.white} />
              <Text style={{ color: palette.white, fontSize: 12, fontWeight: '700' }}>All</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </SafeAreaView>

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchStations} tintColor={palette.forest} />}
        contentContainerStyle={{ padding: 14, paddingBottom: 32, gap: 16 }}
        showsVerticalScrollIndicator={false}
      >
        <ImageBackground
          source={require('../../assets/alipo-map.png')}
          resizeMode="cover"
          imageStyle={{ borderRadius: radii.card }}
          style={{ height: 270, borderRadius: radii.card, overflow: 'hidden', borderWidth: 1, borderColor: palette.line }}
        >
          {stations.slice(0, 4).map((station, index) => {
            const color = station.latest_status === 'available' ? palette.leaf : station.latest_status === 'low' ? palette.amber : palette.red;
            return (
              <TouchableOpacity
                key={station.id}
                accessibilityLabel={`${station.name} map pin`}
                onPress={() => setSelectedStation(station)}
                style={{
                  position: 'absolute', ...PIN_POSITIONS[index], width: 38, height: 38, borderRadius: 19,
                  alignItems: 'center', justifyContent: 'center', backgroundColor: color,
                  borderWidth: 3, borderColor: palette.white,
                }}
              >
                <Fuel size={17} color={palette.white} />
              </TouchableOpacity>
            );
          })}
          <View style={{ position: 'absolute', left: '48%', top: '48%', width: 56, height: 56, borderRadius: 28, backgroundColor: '#4887C033', alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ width: 17, height: 17, borderRadius: 9, backgroundColor: '#4186C4', borderColor: palette.white, borderWidth: 3 }} />
          </View>
          <TouchableOpacity accessibilityLabel="Centre map" style={{ position: 'absolute', right: 12, bottom: 12, width: 42, height: 42, borderRadius: 21, backgroundColor: palette.surface, alignItems: 'center', justifyContent: 'center' }}>
            <LocateFixed size={19} color={palette.forest} />
          </TouchableOpacity>
        </ImageBackground>

        {nearest ? (
          <View style={{ gap: 9 }}>
            <Text selectable style={{ color: palette.ink, fontSize: 14, fontWeight: '900' }}>Nearest station</Text>
            <StationCard station={nearest} compact onPress={() => setSelectedStation(nearest)} />
          </View>
        ) : (
          <View style={{ padding: 24, alignItems: 'center', gap: 8, backgroundColor: palette.surface, borderRadius: radii.card }}>
            <MapPin size={28} color={palette.muted} />
            <Text style={{ color: palette.ink, fontWeight: '800' }}>No matching stations</Text>
            <Text style={{ color: palette.muted, fontSize: 12 }}>Try another station name or fuel filter.</Text>
          </View>
        )}

        <View style={{ gap: 9 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text selectable style={{ color: palette.ink, fontSize: 14, fontWeight: '900' }}>Recent reports</Text>
            <Text style={{ color: palette.leaf, fontSize: 12, fontWeight: '800' }}>See all</Text>
          </View>
          <View style={{ backgroundColor: palette.surface, borderRadius: radii.card, borderWidth: 1, borderColor: palette.line, padding: 14, flexDirection: 'row', gap: 11, alignItems: 'center' }}>
            <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: palette.forestSoft, alignItems: 'center', justifyContent: 'center' }}>
              <ShieldCheck size={17} color={palette.leaf} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text selectable style={{ color: palette.ink, fontSize: 12, fontWeight: '800' }}>Station (verified)</Text>
              <Text selectable style={{ color: palette.muted, fontSize: 11 }}>Fuel available, short queue.</Text>
            </View>
            <Text selectable style={{ color: palette.muted, fontSize: 10 }}>20 min ago</Text>
          </View>
        </View>
      </ScrollView>

      <Modal visible={Boolean(selectedStation)} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSelectedStation(null)}>
        {selectedStation ? (
          <SafeAreaView style={{ flex: 1, backgroundColor: palette.ivory }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 }}>
              <TouchableOpacity accessibilityLabel="Close details" onPress={() => setSelectedStation(null)} style={{ padding: 6 }}><ChevronLeft size={25} color={palette.ink} /></TouchableOpacity>
              <View style={{ flexDirection: 'row', gap: 10 }}><TouchableOpacity onPress={() => setSelectedStation(null)} style={{ padding: 6 }}><X size={22} color={palette.ink} /></TouchableOpacity></View>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 20, paddingBottom: 104, gap: 18 }}>
              <View style={{ width: 58, height: 58, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.forest }}><Fuel size={27} color={palette.white} /></View>
              <View style={{ gap: 5 }}>
                <Text selectable style={{ color: palette.ink, fontSize: 28, fontWeight: '900', letterSpacing: -0.7 }}>{selectedStation.name.replace('Energy ', '')}</Text>
                <Text selectable style={{ color: palette.muted, fontSize: 13 }}>{selectedStation.district}, {selectedStation.city}</Text>
                <Text selectable style={{ color: palette.ink, fontSize: 13 }}>1.2 km from you · <Text style={{ color: palette.leaf, fontWeight: '800' }}>Open</Text></Text>
              </View>
              <View style={{ flexDirection: 'row', backgroundColor: palette.forestSoft, borderRadius: radii.control, padding: 14, justifyContent: 'space-between' }}>
                <View><Text style={{ color: palette.ink, fontWeight: '800', fontSize: 12 }}>Fuel available</Text><Text style={{ color: palette.muted, fontSize: 10 }}>Updated 20 min ago</Text></View>
                <View style={{ alignItems: 'flex-end' }}><Text style={{ color: palette.ink, fontWeight: '800', fontSize: 12 }}>Short queue</Text><Text style={{ color: palette.muted, fontSize: 10 }}>(&lt; 15 min)</Text></View>
              </View>
              <View style={{ gap: 10 }}>
                <Text style={{ color: palette.ink, fontWeight: '900', fontSize: 14 }}>Prices (MWK per litre)</Text>
                {[['Petrol', selectedStation.latest_price_petrol, palette.orange], ['Diesel', selectedStation.latest_price_diesel, palette.forest]].map(([label, price, color]) => (
                  <View key={String(label)} style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 14, borderRadius: radii.control, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.line }}>
                    <Text selectable style={{ color: palette.ink, fontWeight: '800' }}>{String(label)}</Text><Text selectable style={{ color: String(color), fontWeight: '900', fontVariant: ['tabular-nums'] }}>{Number(price || 0).toLocaleString()}</Text>
                  </View>
                ))}
              </View>
              <View style={{ gap: 10 }}>
                <Text style={{ color: palette.ink, fontWeight: '900', fontSize: 14 }}>Details</Text>
                <View style={{ borderRadius: radii.control, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.line, overflow: 'hidden' }}>
                  {[
                    { label: 'Fuel types', value: 'Petrol, Diesel', icon: Fuel },
                    { label: 'Services', value: 'Shop, Air, Toilets', icon: Store },
                    { label: 'Payment', value: 'Cash, Cards, Mo626', icon: CreditCard },
                    { label: 'Reported by', value: 'Station (verified)', icon: UserRound },
                  ].map(({ label, value, icon: Icon }, index) => (
                    <View key={label} style={{ flexDirection: 'row', alignItems: 'center', padding: 13, gap: 9, borderBottomWidth: index === 3 ? 0 : 1, borderBottomColor: palette.line }}>
                      <Icon size={14} color={palette.muted} />
                      <Text style={{ flex: 1, color: palette.ink, fontSize: 11, fontWeight: '700' }}>{label}</Text>
                      <Text style={{ color: palette.muted, fontSize: 10 }}>{value}</Text>
                    </View>
                  ))}
                </View>
              </View>
              <View style={{ gap: 10 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: palette.ink, fontWeight: '900', fontSize: 14 }}>Recent reports</Text><Text style={{ color: palette.leaf, fontWeight: '800', fontSize: 11 }}>See all</Text></View>
                <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', padding: 13, borderRadius: radii.control, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.line }}>
                  <ShieldCheck size={18} color={palette.leaf} />
                  <View style={{ flex: 1 }}><Text style={{ color: palette.ink, fontWeight: '800', fontSize: 11 }}>Station (verified)</Text><Text style={{ color: palette.muted, fontSize: 10 }}>Fuel available, short queue.</Text></View>
                  <Text style={{ color: palette.muted, fontSize: 9 }}>20 min ago</Text>
                </View>
              </View>
            </ScrollView>
            <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, backgroundColor: palette.ivory }}>
              <TouchableOpacity onPress={() => { setSelectedStation(null); router.push('/(tabs)/report'); }} style={{ height: 52, borderRadius: radii.control, backgroundColor: palette.forest, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: palette.white, fontSize: 14, fontWeight: '900' }}>Report an update</Text></TouchableOpacity>
            </View>
          </SafeAreaView>
        ) : null}
      </Modal>
    </View>
  );
}
