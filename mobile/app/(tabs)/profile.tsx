import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, Alert } from 'react-native';
import { Phone, KeyRound, ShieldCheck, Fuel, LogOut, CheckCircle2 } from 'lucide-react-native';

export default function ProfileScreen() {
  const [phone, setPhone] = useState('+265');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'login' | 'authenticated'>('login');

  const handleLogin = () => {
    if (phone.length < 10) {
      Alert.alert('Invalid Number', 'Please enter a valid Malawi phone number (+265...)');
      return;
    }
    setStep('authenticated');
    Alert.alert('Signed In', `Logged in successfully as ${phone}`);
  };

  return (
    <ScrollView className="flex-1 bg-gray-50 p-4" showsVerticalScrollIndicator={false}>
      {/* Brand card */}
      <View className="bg-white p-5 rounded-2xl border border-gray-200 mb-4 items-center">
        <View className="w-14 h-14 rounded-2xl bg-emerald-500 items-center justify-center mb-3">
          <Fuel size={28} color="#064e3b" />
        </View>
        <Text className="text-xl font-black text-gray-900">Alipo Malawi</Text>
        <Text className="text-xs text-gray-400 mt-0.5">Version 1.0.0 (Phase 1 MVP)</Text>

        <View className="mt-3 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100 flex-row items-center space-x-1">
          <ShieldCheck size={14} color="#059669" />
          <Text className="text-xs font-bold text-emerald-800">Phone-First Identity Network</Text>
        </View>
      </View>

      {/* Auth Card */}
      <View className="bg-white p-5 rounded-2xl border border-gray-200 mb-4 space-y-3">
        <Text className="text-xs font-bold text-gray-900 uppercase">
          {step === 'login' ? 'Fleet Dispatcher & Attendant Login' : 'Active Session'}
        </Text>

        {step === 'login' ? (
          <>
            <View className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 flex-row items-center">
              <Phone size={16} color="#9ca3af" />
              <TextInput
                placeholder="+265888123456"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
                className="flex-1 ml-2 text-xs text-gray-900"
              />
            </View>

            <TouchableOpacity
              onPress={handleLogin}
              className="bg-emerald-600 py-3 rounded-xl items-center active:opacity-90 mt-1"
            >
              <Text className="text-white font-bold text-xs">Request SMS OTP Code</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View className="space-y-3">
            <View className="flex-row items-center space-x-2">
              <CheckCircle2 size={16} color="#059669" />
              <Text className="text-xs font-bold text-gray-800">{phone}</Text>
            </View>
            <TouchableOpacity
              onPress={() => setStep('login')}
              className="bg-rose-50 py-2.5 rounded-xl items-center border border-rose-100 flex-row justify-center space-x-1"
            >
              <LogOut size={14} color="#e11d48" />
              <Text className="text-rose-600 font-bold text-xs">Sign Out</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Alternative Channels Info */}
      <View className="bg-emerald-900 p-5 rounded-2xl border border-emerald-800 text-white space-y-2">
        <Text className="text-white font-bold text-sm">Offline Channels in Malawi</Text>
        <Text className="text-emerald-200 text-xs">
          If you have no mobile internet data bundle, use:
        </Text>
        <View className="bg-emerald-950/60 p-3 rounded-xl border border-emerald-800 space-y-1 mt-1">
          <Text className="text-xs text-white">
            📞 USSD Code: <Text className="font-bold text-emerald-300">*384*265#</Text>
          </Text>
          <Text className="text-xs text-white">
            💬 WhatsApp Bot: <Text className="font-bold text-emerald-300">+265 888 000 100</Text>
          </Text>
          <Text className="text-xs text-white">
            🌐 Web Map: <Text className="font-bold text-emerald-300">alipo.vercel.app</Text>
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
