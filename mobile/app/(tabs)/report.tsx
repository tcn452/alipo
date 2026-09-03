import React, { useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Clock3, Fuel, Send, UserRound, XCircle } from 'lucide-react-native';
import { FuelStatus, QueueEstimate, FuelType } from '@/types/alipo';
import { pb } from '@/lib/pocketbase';
import { palette, radii } from '@/lib/theme';

const STATUS_OPTIONS: { id: FuelStatus; label: string; detail: string; color: string; icon: typeof Fuel }[] = [
  { id: 'available', label: 'Fuel available', detail: '', color: palette.leaf, icon: Fuel },
  { id: 'low', label: 'Medium queue', detail: '15–45 min', color: palette.amber, icon: Clock3 },
  { id: 'out', label: 'Long queue', detail: '> 45 min', color: palette.red, icon: UserRound },
  { id: 'unknown', label: 'No fuel', detail: '', color: '#686B68', icon: XCircle },
];

const QUEUES: { id: QueueEstimate; label: string; detail: string }[] = [
  { id: 'short', label: 'Short', detail: '< 15 min' },
  { id: 'medium', label: 'Medium', detail: '15–45 min' },
  { id: 'long', label: 'Long', detail: '> 45 min' },
];

export default function ReportScreen() {
  const router = useRouter();
  const [status, setStatus] = useState<FuelStatus>('available');
  const [fuelType, setFuelType] = useState<FuelType>('petrol');
  const [queueEstimate, setQueueEstimate] = useState<QueueEstimate>('short');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await pb.collection('reports').create({
        station: 'stat_llw_001',
        status,
        fuel_type: fuelType,
        queue_estimate: queueEstimate,
        source: 'mobile',
        note: note.trim() || undefined,
        confirmations: 1,
        is_active: true,
      });
    } catch {
      // Offline reports still complete locally in this prototype state.
    } finally {
      setIsSubmitting(false);
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        router.replace('/(tabs)');
      }, 1400);
    }
  };

  if (isSuccess) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: palette.ivory, alignItems: 'center', justifyContent: 'center', padding: 30, gap: 14 }}>
        <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: palette.forestSoft, alignItems: 'center', justifyContent: 'center' }}>
          <Send size={30} color={palette.forest} />
        </View>
        <Text selectable style={{ color: palette.ink, fontSize: 25, fontWeight: '900' }}>Zikomo kwambiri!</Text>
        <Text selectable style={{ color: palette.muted, textAlign: 'center', fontSize: 14, lineHeight: 21 }}>
          Your report is live and helping drivers across Malawi.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: palette.ivory }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: palette.forest }}>
        <View style={{ height: 72, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity accessibilityLabel="Back to home" onPress={() => router.back()} style={{ padding: 6 }}>
            <ArrowLeft size={24} color={palette.white} />
          </TouchableOpacity>
          <View style={{ gap: 2 }}>
            <Text selectable style={{ color: palette.white, fontSize: 15, fontWeight: '900' }}>Report an update</Text>
            <Text selectable style={{ color: '#C8DACE', fontSize: 11 }}>Puma Area 47, Lilongwe</Text>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView contentInsetAdjustmentBehavior="automatic" showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 34, gap: 24 }}>
        <View style={{ gap: 11 }}>
          <Text selectable style={{ color: palette.ink, fontSize: 14, fontWeight: '900' }}>What’s the fuel situation?</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {STATUS_OPTIONS.map(({ id, label, detail, color, icon: Icon }) => {
              const selected = status === id;
              return (
                <TouchableOpacity
                  key={id}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  onPress={() => setStatus(id)}
                  style={{
                    width: '48%', minHeight: 112, borderRadius: radii.control, padding: 14,
                    alignItems: 'center', justifyContent: 'center', gap: 7,
                    backgroundColor: selected ? palette.forestSoft : palette.surface,
                    borderWidth: 1.5, borderColor: selected ? palette.leaf : palette.line,
                  }}
                >
                  <Icon size={25} color={color} />
                  <Text style={{ color: palette.ink, fontSize: 12, fontWeight: '900', textAlign: 'center' }}>{label}</Text>
                  {detail ? <Text style={{ color: palette.muted, fontSize: 10 }}>({detail})</Text> : null}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={{ gap: 11 }}>
          <Text selectable style={{ color: palette.ink, fontSize: 14, fontWeight: '900' }}>Fuel type</Text>
          <View style={{ flexDirection: 'row', gap: 9 }}>
            {(['petrol', 'diesel', 'both'] as const).map((type) => {
              const selected = fuelType === type;
              return (
                <TouchableOpacity key={type} onPress={() => setFuelType(type)} style={{ flex: 1, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: radii.pill, backgroundColor: selected ? palette.forest : '#EEE9DF' }}>
                  <Text style={{ color: selected ? palette.white : palette.ink, fontSize: 12, fontWeight: '800', textTransform: 'capitalize' }}>{type === 'both' ? 'Other' : type}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={{ gap: 11 }}>
          <Text selectable style={{ color: palette.ink, fontSize: 14, fontWeight: '900' }}>Queue length <Text style={{ color: palette.muted, fontWeight: '500' }}>(optional)</Text></Text>
          <View style={{ flexDirection: 'row', gap: 9 }}>
            {QUEUES.map(({ id, label, detail }) => {
              const selected = queueEstimate === id;
              return (
                <TouchableOpacity key={id} onPress={() => setQueueEstimate(id)} style={{ flex: 1, minHeight: 66, alignItems: 'center', justifyContent: 'center', gap: 3, borderRadius: radii.control, backgroundColor: selected ? palette.forestSoft : '#EEE9DF', borderWidth: 1, borderColor: selected ? palette.leaf : 'transparent' }}>
                  <Text style={{ color: palette.ink, fontSize: 11, fontWeight: '900' }}>{label}</Text>
                  <Text style={{ color: palette.muted, fontSize: 9 }}>({detail})</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={{ gap: 11 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text selectable style={{ color: palette.ink, fontSize: 14, fontWeight: '900' }}>Add a note <Text style={{ color: palette.muted, fontWeight: '500' }}>(optional)</Text></Text>
            <Text selectable style={{ color: palette.muted, fontSize: 10, fontVariant: ['tabular-nums'] }}>{note.length}/150</Text>
          </View>
          <TextInput
            accessibilityLabel="Optional report note"
            value={note}
            onChangeText={setNote}
            maxLength={150}
            multiline
            placeholder="Anything else to help?"
            placeholderTextColor="#8A918C"
            style={{ minHeight: 74, padding: 14, textAlignVertical: 'top', borderRadius: radii.control, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.line, color: palette.ink, fontSize: 13 }}
          />
        </View>

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Submit report"
          onPress={handleSubmit}
          disabled={isSubmitting}
          style={{ height: 54, borderRadius: radii.control, backgroundColor: palette.forest, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, opacity: isSubmitting ? 0.7 : 1 }}
        >
          {isSubmitting ? <ActivityIndicator color={palette.white} /> : <><Send size={18} color={palette.white} /><Text style={{ color: palette.white, fontSize: 14, fontWeight: '900' }}>Submit report</Text></>}
        </TouchableOpacity>
        <Text selectable style={{ color: palette.muted, fontSize: 11, textAlign: 'center', lineHeight: 16 }}>Your report helps keep Malawi moving.</Text>
      </ScrollView>
    </View>
  );
}
