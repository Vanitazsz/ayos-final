import React,{useEffect,useState}from'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Screen } from '@/components/layout/Screen';
import { Button } from '@/components/buttons/Button';
import { theme } from '@/constants/theme';
import { CheckCircle2 } from 'lucide-react-native';
import { fetchPaymentForBooking } from '@/services/api';

export default function PaymentSuccessScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const bookingId=Array.isArray(id)?id[0]:id;const[payment,setPayment]=useState<any>(null);useEffect(()=>{if(bookingId)void fetchPaymentForBooking(bookingId).then(result=>{if(!result.error)setPayment(result.data)});},[bookingId]);const receipt=Array.isArray(payment?.receipts)?payment.receipts[0]:payment?.receipts;

  return (
    <Screen safeArea>
      <View style={styles.container}>
        <CheckCircle2 color={theme.colors.success} size={80} style={styles.icon} />
        <Text style={[theme.typography.h1, styles.title]}>{payment?.status==='SUCCESSFUL'?'Payment Successful!':'Cash Confirmation Recorded'}</Text>
        <Text style={[theme.typography.body1, styles.subtitle]}>
          {payment?.status==='SUCCESSFUL'?`The cash payment of ₱${Number(payment?.service_amount??0).toLocaleString('en-PH',{minimumFractionDigits:2})} is fully confirmed.`:'The other booking participant must also confirm the cash payment.'}
        </Text>

        <View style={styles.receiptCard}>
          <View style={styles.row}>
            <Text style={[theme.typography.body2, { color: theme.colors.textSecondary }]}>Reference No.</Text>
            <Text style={theme.typography.label}>{receipt?.receipt_number??payment?.id?.slice(0,12)??'Loading'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={[theme.typography.body2, { color: theme.colors.textSecondary }]}>Date</Text>
            <Text style={theme.typography.label}>{payment?.successful_at?new Date(payment.successful_at).toLocaleString():'Awaiting both confirmations'}</Text>
          </View>
          <View style={[styles.row, { borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: theme.spacing.md, marginTop: theme.spacing.sm }]}>
            <Text style={theme.typography.h4}>Total Paid</Text>
            <Text style={[theme.typography.h3, { color: theme.colors.primary }]}>₱ {Number(payment?.service_amount??0).toLocaleString('en-PH',{minimumFractionDigits:2})}</Text>
          </View>
        </View>

        <View style={styles.actions}>
          <Button 
            title="Rate the Service" 
            onPress={() => router.replace(`/review/${id}`)}
            fullWidth 
            style={styles.actionBtn}
          />
          <Button 
            title="Back to Home" 
            variant="ghost"
            onPress={() => router.replace('/(tabs)/home')}
            fullWidth 
          />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: theme.spacing.xxxl },
  icon: { marginBottom: theme.spacing.lg },
  title: { marginBottom: theme.spacing.sm, textAlign: 'center' },
  subtitle: { color: theme.colors.textSecondary, textAlign: 'center', marginBottom: theme.spacing.xxl, paddingHorizontal: theme.spacing.xl },
  receiptCard: { width: '100%', backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, padding: theme.spacing.lg, marginBottom: theme.spacing.xxxl, ...theme.shadows.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: theme.spacing.sm },
  actions: { width: '100%', marginTop: 'auto' },
  actionBtn: { marginBottom: theme.spacing.sm },
});
