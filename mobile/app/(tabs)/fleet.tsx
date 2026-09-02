import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Truck, Fuel, Compass, AlertTriangle, TrendingUp, CheckCircle, ArrowRight } from 'lucide-react-native';

export default function FleetScreen() {
  const router = useRouter();

  const vehicles = [
    { plate: 'BT 4421', driver: 'Chifundo Banda', fuel: 'Diesel', status: 'Active' },
    { plate: 'LL 9012', driver: 'Blessings Phiri', fuel: 'Petrol', status: 'Active' },
    { plate: 'ZA 1140', driver: 'Taonga Gondwe', fuel: 'Diesel', status: 'Flagged' },
    { plate: 'BT 8830', driver: 'Kelvin Chirwa', fuel: 'Petrol', status: 'Active' },
  ];

  return (
    <ScrollView className="flex-1 bg-gray-50 p-4" showsVerticalScrollIndicator={false}>
      {/* Header card */}
      <View className="bg-emerald-950 p-5 rounded-2xl mb-4 border border-emerald-900 shadow-md">
        <View className="flex-row items-center space-x-2 mb-2">
          <View className="w-8 h-8 rounded-lg bg-emerald-500 items-center justify-center">
            <Truck size={18} color="#064e3b" />
          </View>
          <View>
            <Text className="text-white font-black text-base">Alipo Fleet Hub</Text>
            <Text className="text-emerald-300 text-xs">B2B Fuel & Dispatch Manager</Text>
          </View>
        </View>

        <Text className="text-emerald-200 text-xs mt-1">
          Monitor your fleet fuel allocation, prevent queue delays, and trigger smart station recommendations.
        </Text>

        <TouchableOpacity
          onPress={() => router.push('/dispatch')}
          className="mt-4 bg-emerald-500 py-3 rounded-xl flex-row items-center justify-center space-x-2 active:opacity-90"
        >
          <Compass size={16} color="#064e3b" />
          <Text className="text-emerald-950 font-bold text-xs">Launch Smart Dispatch Engine</Text>
          <ArrowRight size={14} color="#064e3b" />
        </TouchableOpacity>
      </View>

      {/* Metrics Row */}
      <View className="flex-row space-x-3 mb-4">
        <View className="flex-1 bg-white p-4 rounded-2xl border border-gray-200">
          <Text className="text-[10px] font-bold text-gray-400 uppercase">Active Vehicles</Text>
          <Text className="text-xl font-black text-gray-900 mt-1">9 / 12</Text>
          <View className="flex-row items-center mt-1">
            <CheckCircle size={10} color="#059669" />
            <Text className="text-[10px] text-emerald-600 ml-1 font-semibold">75% active</Text>
          </View>
        </View>

        <View className="flex-1 bg-white p-4 rounded-2xl border border-gray-200">
          <Text className="text-[10px] font-bold text-gray-400 uppercase">Sept Fuel Quota</Text>
          <Text className="text-xl font-black text-gray-900 mt-1">2,840 L</Text>
          <Text className="text-[10px] text-gray-400 mt-1">of 4,500 L allocated</Text>
        </View>
      </View>

      {/* Fleet Vehicles Table / Cards */}
      <View className="bg-white rounded-2xl border border-gray-200 p-4 mb-6 shadow-sm">
        <View className="flex-row items-center justify-between pb-3 border-b border-gray-100">
          <Text className="text-xs font-bold text-gray-900 uppercase">Assigned Fleet Vehicles</Text>
          <Text className="text-xs text-emerald-700 font-semibold">{vehicles.length} Total</Text>
        </View>

        {vehicles.map((v, i) => (
          <View key={i} className="flex-row items-center justify-between py-3 border-b border-gray-50">
            <View className="flex-row items-center space-x-2.5">
              <View className="w-8 h-8 rounded-lg bg-gray-100 items-center justify-center">
                <Truck size={14} color="#374151" />
              </View>
              <View>
                <Text className="font-bold text-gray-900 text-xs">{v.plate}</Text>
                <Text className="text-[11px] text-gray-400">{v.driver}</Text>
              </View>
            </View>

            <View className="items-end">
              <View
                className={`px-2 py-0.5 rounded-full ${
                  v.status === 'Active' ? 'bg-emerald-50' : 'bg-amber-50'
                }`}
              >
                <Text
                  className={`text-[10px] font-bold ${
                    v.status === 'Active' ? 'text-emerald-700' : 'text-amber-700'
                  }`}
                >
                  {v.status}
                </Text>
              </View>
              <Text className="text-[10px] text-gray-400 mt-0.5">{v.fuel}</Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
