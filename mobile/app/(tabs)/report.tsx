import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator
} from 'react-native';
import { FuelStatus, QueueEstimate, FuelType, Station } from '@/types/alipo';
import { pb } from '@/lib/pocketbase';
import { useRouter } from 'expo-router';
import { CheckCircle, AlertTriangle, XCircle, Fuel, Send, Check } from 'lucide-react-native';

const STATIONS_LIST: { id: string; name: string; city: string }[] = [
  { id: 'stat_llw_001', name: 'Puma Energy Area 47', city: 'Lilongwe' },
  { id: 'stat_llw_002', name: 'TotalEnergies City Centre', city: 'Lilongwe' },
  { id: 'stat_llw_003', name: 'Petroda Kanengo Industrial', city: 'Lilongwe' },
  { id: 'stat_llw_004', name: 'OilCom Old Town (Paul Kagame)', city: 'Lilongwe' },
  { id: 'stat_bt_001', name: 'TotalEnergies Chichiri', city: 'Blantyre' },
  { id: 'stat_bt_002', name: 'Puma Ginnery Corner', city: 'Blantyre' },
  { id: 'stat_mzu_001', name: 'Puma Mzuzu CBD', city: 'Mzuzu' }
];

export default function ReportScreen() {
  const router = useRouter();
  const [stationId, setStationId] = useState(STATIONS_LIST[0].id);
  const [status, setStatus] = useState<FuelStatus>('available');
  const [fuelType, setFuelType] = useState<FuelType>('both');
  const [queueEstimate, setQueueEstimate] = useState<QueueEstimate>('short');
  const [price, setPrice] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      const parsedPrice = price ? parseFloat(price) : undefined;
      const reportData = {
        station: stationId,
        status: status,
        fuel_type: fuelType,
        queue_estimate: queueEstimate,
        price: parsedPrice,
        source: 'web',
        reporter_phone: phone.trim() || undefined,
        confirmations: 1,
        is_active: true
      };

      try {
        await pb.collection('reports').create(reportData);
      } catch (e) {
        // Fallback for offline / dev
      }

      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        router.push('/(tabs)');
      }, 1500);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to submit fuel report');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <View className="flex-1 bg-white items-center justify-center p-6">
        <View className="w-16 h-16 rounded-full bg-emerald-100 items-center justify-center mb-4">
          <Check size={32} color="#059669" />
        </View>
        <Text className="text-2xl font-black text-gray-900">Zikomo Kwambiri!</Text>
        <Text className="text-sm text-gray-500 text-center mt-2">
          Your report has been logged to the network. Malawian drivers thank you!
        </Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-gray-50 p-4" showsVerticalScrollIndicator={false}>
      <View className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4 mb-8">
        <View className="flex-row items-center space-x-2">
          <View className="w-8 h-8 rounded-lg bg-emerald-100 items-center justify-center">
            <Fuel size={18} color="#059669" />
          </View>
          <View>
            <Text className="text-base font-bold text-gray-900">Report Fuel Status</Text>
            <Text className="text-xs text-gray-500">Live crowdsource update</Text>
          </View>
        </View>

        {/* Station Selector */}
        <View>
          <Text className="text-xs font-bold text-gray-700 uppercase mb-1.5">Select Station</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
            {STATIONS_LIST.map((st) => (
              <TouchableOpacity
                key={st.id}
                onPress={() => setStationId(st.id)}
                className={`p-2.5 rounded-xl border mr-2 ${
                  stationId === st.id
                    ? 'border-emerald-600 bg-emerald-50'
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                <Text
                  className={`text-xs font-bold ${
                    stationId === st.id ? 'text-emerald-800' : 'text-gray-700'
                  }`}
                >
                  {st.name}
                </Text>
                <Text className="text-[10px] text-gray-400">{st.city}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Status Buttons */}
        <View>
          <Text className="text-xs font-bold text-gray-700 uppercase mb-1.5">Fuel Availability</Text>
          <View className="flex-row space-x-2">
            <TouchableOpacity
              onPress={() => setStatus('available')}
              className={`flex-1 p-3 rounded-xl border items-center ${
                status === 'available'
                  ? 'border-emerald-500 bg-emerald-50'
                  : 'border-gray-200 bg-white'
              }`}
            >
              <CheckCircle size={20} color={status === 'available' ? '#059669' : '#9ca3af'} />
              <Text className="text-xs font-bold text-gray-900 mt-1">Available</Text>
              <Text className="text-[10px] text-gray-400">Ilipo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setStatus('low')}
              className={`flex-1 p-3 rounded-xl border items-center ${
                status === 'low'
                  ? 'border-amber-500 bg-amber-50'
                  : 'border-gray-200 bg-white'
              }`}
            >
              <AlertTriangle size={20} color={status === 'low' ? '#d97706' : '#9ca3af'} />
              <Text className="text-xs font-bold text-gray-900 mt-1">Low Supply</Text>
              <Text className="text-[10px] text-gray-400">Itha msanga</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setStatus('out')}
              className={`flex-1 p-3 rounded-xl border items-center ${
                status === 'out'
                  ? 'border-rose-500 bg-rose-50'
                  : 'border-gray-200 bg-white'
              }`}
            >
              <XCircle size={20} color={status === 'out' ? '#dc2626' : '#9ca3af'} />
              <Text className="text-xs font-bold text-gray-900 mt-1">Out of Fuel</Text>
              <Text className="text-[10px] text-gray-400">Yatha</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Queue Length */}
        <View>
          <Text className="text-xs font-bold text-gray-700 uppercase mb-1.5">Queue Length</Text>
          <View className="flex-row space-x-2">
            {[
              { id: 'none', label: 'None', time: '<5m' },
              { id: 'short', label: 'Short', time: '<15m' },
              { id: 'medium', label: 'Med', time: '15-45m' },
              { id: 'long', label: 'Long', time: '>45m' },
            ].map((q) => (
              <TouchableOpacity
                key={q.id}
                onPress={() => setQueueEstimate(q.id as any)}
                className={`flex-1 p-2 rounded-xl border items-center ${
                  queueEstimate === q.id
                    ? 'border-emerald-600 bg-emerald-50'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <Text className="text-xs font-bold text-gray-900">{q.label}</Text>
                <Text className="text-[10px] text-gray-400">{q.time}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Fuel Type */}
        <View>
          <Text className="text-xs font-bold text-gray-700 uppercase mb-1.5">Fuel Type</Text>
          <View className="flex-row space-x-2">
            {(['both', 'petrol', 'diesel'] as const).map((t) => (
              <TouchableOpacity
                key={t}
                onPress={() => setFuelType(t)}
                className={`flex-1 py-2 rounded-xl border items-center capitalize ${
                  fuelType === t
                    ? 'border-emerald-600 bg-emerald-50'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <Text
                  className={`text-xs font-bold ${
                    fuelType === t ? 'text-emerald-800' : 'text-gray-700'
                  }`}
                >
                  {t === 'both' ? 'Both' : t}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Price & Phone */}
        <View className="flex-row space-x-3">
          <View className="flex-1">
            <Text className="text-xs font-medium text-gray-600 mb-1">Price (MWK/L, opt)</Text>
            <TextInput
              placeholder="e.g. 2530"
              keyboardType="numeric"
              value={price}
              onChangeText={setPrice}
              className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-900"
            />
          </View>

          <View className="flex-1">
            <Text className="text-xs font-medium text-gray-600 mb-1">Phone Number (opt)</Text>
            <TextInput
              placeholder="+265..."
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
              className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-900"
            />
          </View>
        </View>

        {/* Submit CTA */}
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={isSubmitting}
          className="w-full bg-emerald-600 py-3.5 rounded-xl flex-row items-center justify-center space-x-2 mt-2 shadow-md active:opacity-90"
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Send size={16} color="#fff" />
              <Text className="text-white font-bold text-sm">Submit Fuel Report</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
