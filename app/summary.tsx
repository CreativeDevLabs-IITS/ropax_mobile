import { FetchDiscounts } from '@/api/discounts';
import { SaveBooking } from '@/api/saveBooking';
import { SaveBookingScan } from '@/api/saveBookingScan';
import { SaveCargo } from '@/api/saveCargo';
import { SaveReschedBooking } from '@/api/saveResched';
import DiscountModal from '@/components/discountModal';
import PreLoader from '@/components/preloader';
import { useCargo } from '@/context/cargoProps';
import { usePassengers } from '@/context/passenger';
import { TripContextProps, useTrip } from '@/context/trip';
import { seatRemoval } from '@/utils/channel';

import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { height } = Dimensions.get('window');



type PassengerType = {
    id: number;
    name: string;
    passenger_types_code: string;
    is_senior_pwd: boolean;
    created_at: string;
    updated_at: string;
}

type DiscountRedemption = {
    id: number;
    discount_id: number;
    passenger_id: number;
    passenger_type_id: number;
    used_at: string;
}

export type Discount = {
    id: number;
    discount_code: string;
    percent: number;
    discount_type: string;
    fixed_amount: number | null;
    scope: string;
    trip_applicability: string;
    discount_audience: string;
    is_one_time_per_passenger: boolean;
    expiry_date: string;
    passenger_types?: PassengerType[];
    redemptions?: DiscountRedemption[];
}


export default function PaymentSummary() {
    const { passengers, setPassengers } = usePassengers();
    const { id, bookingId, totalFare, originalFare, fareChange, webCode, destination, origin, departure_time, vessel, reSchedAll, isDiscounted, couponCode, discountId, discountValue,
            setTotalFare, setDiscountType, setDiscountValue, setIsDiscounted, setCouponCode, setRefNumber, setFareChange, setCashTendered } = useTrip();
    const { paxCargoProperty } = useCargo();
    const [discounts, setDiscounts] = useState<Discount[]>([]);
    const [loading, setLoading] = useState(false);
    const [cashTendered, setPassCashTendered] = useState(0);
    const [timeWithRoute, setTimeWithRoute] = useState('');
    const [discountModal, setDiscountModal] = useState(false);
    const insets = useSafeAreaInsets();
    const [preloader, setPreloader] = useState(true);

    useEffect(() => {
        handleFetchDiscounts()
        const departureTime = new Date(`1970-01-01T${departure_time}`).toLocaleTimeString(
                        'en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true
                        });

        setTimeWithRoute(`${origin} --- ${destination} | ${departureTime}`)
    }, []);

    useEffect(() => {
        if(cashTendered != 0) {
            if(paxCargoProperty.some((c => c.withPassenger == true))) {
                const change = cashTendered - totalFare;
                setFareChange(change);
            }else{
                const change = cashTendered - Number(totalFare);
                setFareChange(change);
            }

            setCashTendered(cashTendered)
        }
    }, [cashTendered, totalFare]);

    const handleRemoveDiscount = () => {
        setTotalFare(originalFare)

        setPassengers(prev => prev.map(p => {
            return {...p, fare: p.originalFare}
        }))

        setIsDiscounted(false);
        setCouponCode('');
        setDiscountType('');
        setDiscountValue(null);
    }

    const handleFetchDiscounts = async () => {
        try {
            const response = await FetchDiscounts();

            if(!response.error) {
                const fetchedDiscounts: Discount[] = response.discounts.map((d: any) => ({
                    id: d?.id,
                    discount_code: d?.discount_code,
                    percent: d?.percent,
                    discount_type: d?.discount_type,
                    fixed_amount: d?.fixed_amount,
                    scope: d?.scope,
                    trip_applicability: d?.trip_applicability,
                    discount_audience: d?.discount_audience,
                    is_one_time_per_passenger: d?.is_one_time_per_passenger,
                    expiry_date: d?.expiry_date,
                    passenger_types: d?.passenger_types,
                    redemptions: d?.redemptions
                }));

                setDiscounts(fetchedDiscounts);
            }
        }catch(error: any) {
            Alert.alert('Error', error.message)
        }finally{
            setPreloader(false)
        }
    }

    const handleConfirmation = async () => {
        setLoading(true);

        if(cashTendered == 0 && !passengers.some(p => p.passType == 'Passes')) {
            setLoading(false);
            Alert.alert('Invalid', 'Payment is missing.');
            return;
        }

        if((!passengers.some(p => p.passTypeCode == 'P' || p.passType == 'Passes') && totalFare > cashTendered)) {
            setLoading(false);
            Alert.alert('Invalid', 'Cash tendered is less than the total amount due.');
            return;
        }
        
        setCashTendered(cashTendered);

        const stationID = await AsyncStorage.getItem('stationID');

        if(!stationID) {
            setLoading(false);
            Alert.alert('Invalid', 'Station is not set yet.');
            return;
        }

        try {
            const trip = { id, totalFare, webCode } as TripContextProps;

            if(passengers.length > 0 && passengers.some(p => p.hasScanned != true && p.forResched != true)) {
                const response = await SaveBooking(trip, passengers, Number(stationID), discountId, discountValue, cashTendered);
                console.log(response.error);
                
                if(!response.error) {
                    setRefNumber(response.reference_no);
                    passengers.forEach(p => {
                        if(p.seatNumber) {
                            seatRemoval(p.seatNumber, id)
                        }
                    });
                }
            }else if(passengers.length > 0 && passengers.some(p => p.hasScanned == true)){
                const response = await SaveBookingScan(trip, passengers, Number(stationID), bookingId, discountId, discountValue, cashTendered);
                
                if(!response.error) {
                    setRefNumber(response.reference_no);
                    passengers.forEach(p => {
                        if(p.seatNumber) {
                            seatRemoval(p.seatNumber, id)
                        }
                    })
                }
            }else if(passengers.length > 0 && passengers.some(p => p.forResched == true)) {
                
                const response = await SaveReschedBooking(trip, passengers, Number(stationID), bookingId, reSchedAll, discountValue, cashTendered);
                
                if(!response.error) {
                    setRefNumber(response.reference_no);
                    passengers.forEach(p => {
                        if(p.seatNumber) {
                            seatRemoval(p.seatNumber, id)
                        }
                    })
                }
            }else {
                const res = await SaveCargo(trip, paxCargoProperty, paxCargoProperty[0].isCargoAdded, paxCargoProperty[0].passenger_id)
            }

            router.push('/generateTicket');
        }catch(error: any) {
            Alert.alert('Error', error.message);
        }finally {
            setLoading(false);
        }

    }

    return (
        <View style={{ flexDirection: 'column', justifyContent: 'space-between', backgroundColor: '#fafafa', flex: 1, paddingBottom: insets.bottom }}>
            <View style={{ flex: 1, marginBottom: 10 }}>
                <View style={{ height: 100, backgroundColor: '#cf2a3a', paddingTop: 40, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 15 }}>
                    <TouchableOpacity onPress={() => router.back()} >
                        <Ionicons name='arrow-back' size={28} color={'#fff'} />
                    </TouchableOpacity>
                    <Text style={{ fontSize: 18, color: '#fff', fontWeight: 'bold', textAlign: 'center' }}>Payment Summary</Text>
                </View>
                {preloader == true ? (
                    <PreLoader loading={preloader} />
                ) : (
                   <>
                    <View style={{ padding: 10 }}>
                        <View style={{ borderColor: "#dadada", borderWidth: 1, padding: 10, borderRadius: 8, flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                            <Ionicons name={'boat'} color={'#fff'} size={28} style={{ backgroundColor: '#cf2a3a', padding: 10, borderRadius: 50 }} />
                            <View style={{ flexDirection: 'column' }}>
                                <Text style={{ color: '#cf2a3a', fontSize: 18, fontWeight: '900', marginTop: -5 }}>{vessel}</Text>
                                <Text style={{ color: '#747373ff', fontSize: 13, fontWeight: '600' }}>{timeWithRoute}</Text>
                            </View>
                        </View>
                        {isDiscounted && (
                            <View style={styles.discountContainer}>
                                <View style={styles.discountLeft}>
                                     <MaterialCommunityIcons name={'tag-multiple'} color={'#16a34a'}  size={25}/>
                                    <View>
                                        <Text style={styles.discountCode}>{couponCode}</Text>
                                        <Text style={styles.discountDesc}>
                                            ₱ {discountValue} Discount
                                        </Text>
                                    </View>
                                </View>
                                <TouchableOpacity onPress={() => handleRemoveDiscount()} style={styles.discountRemove}>
                                    <Text style={styles.discountRemoveText}>✕</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                        <View style={{ borderColor: "#dadada", borderWidth: 1, borderRadius: 8, marginTop: 15 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 3, backgroundColor: '#cf2a3b27', borderTopRightRadius: 6, borderTopLeftRadius: 6, padding: 10  }}>
                                <View>
                                    <Text style={{ fontWeight: 'bold', color: '#cf2a3a', fontSize: 18 }}>Payment</Text>
                                    <Text style={{ fontSize: 12, fontWeight: '600', color: '#cf2a3a' }}>Payment must be settled before departure.</Text>
                                </View>
                                <Ionicons name={'alert-circle'} color={'#cf2a3a'} size={24} />
                            </View>
                            <View style={{ paddingHorizontal: 10, paddingBottom: 15, paddingTop: 5, gap: 10 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <Text style={{ color: '#646464', fontSize: 15, }}>Cash Tendered</Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, borderBottomColor: "#cf2a3a", borderBottomWidth: 1 }}>
                                        <Text style={{ fontSize: 20, fontWeight: '600', color: '#000' }}>₱</Text>
                                        <TextInput onChangeText={(text) => setPassCashTendered(Number(text))} keyboardType={'numeric'} placeholder='0.00' style={{ width: 100, fontSize: 25, height: 55, fontWeight: 'bold', color: '#000', backgroundColor: '#fafafa', textAlign: 'right', paddingHorizontal: 3, borderColor: '#fafafa' }} />
                                    </View>
                                </View>
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <Text style={{ color: '#cf2a3a', fontSize: 18, fontWeight: '700' }}>Change</Text>
                                    <Text style={{ fontSize: 26, fontWeight: '800', color: '#cf2a3a' }}>₱ {cashTendered != 0 ? fareChange?.toFixed(2) : '00.00'}</Text>
                                </View>
                            </View>
                        </View>
                    </View>
                    <KeyboardAvoidingView behavior={Platform.OS === 'android' ? 'padding' : 'height'} style={{ flex: 1, paddingBottom: 10 }}>
                        <View style={{ paddingHorizontal: 10, flex: 1 }}>
                            <View style={{ borderColor: "#dadada", borderWidth: 1, borderRadius: 8, flex: 1 }}>
                                {passengers.length > 0 ? (
                                    <>
                                        <Text style={{ padding: 10, fontSize: 17, borderBottomColor: '#dadada', borderBottomWidth: 1, fontWeight: 'bold', color: '#616161' }}>Passenger/s</Text>
                                        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                                            {passengers.map((pax: any) =>(
                                                <View key={pax.id}>
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, paddingTop: 10 }}>
                                                        <View style={{ flexDirection: 'column', width: '65%' }}>
                                                            <Text style={{ fontSize: 17, fontWeight: '700', color: '#cf2a3a' }}>{pax.name}</Text>
                                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                                                                <Text style={{ fontSize: 12, color: '#646464', fontWeight: '600' }}>{pax?.seatNumber != 'N/A' ? `Seat# ${pax?.seatNumber}` : '--'}</Text>
                                                                <Text style={{ fontSize: 10, color: '#646464' }}>|</Text>
                                                                <Text style={{ fontSize: 12, color: '#646464', fontWeight: '600' }}>{pax?.passType}</Text>
                                                                <Text style={{ fontSize: 10, color: '#646464' }}>|</Text>
                                                                <Text style={{ fontSize: 12, color: '#646464', fontWeight: '600' }}>{pax?.accommodation}</Text>
                                                            </View>
                                                        </View>
                                                        <View style={{ flexDirection: 'column', alignItems: 'flex-end' }}>
                                                            <Text style={{ color: '#646464', fontSize: 12, }}>Fare</Text>
                                                            <Text style={{ fontSize: 17, fontWeight: '800', color: '#cf2a3a' }}>₱ {Number(pax?.fare ?? 0).toFixed(2)}</Text>
                                                        </View>
                                                    </View>
                                                    {pax.infant && pax.infant.length > 0 && pax.infant.map((inf: any, index: number) => (
                                                        <View key={`inf-${index}`} style={{ flexDirection: 'row',justifyContent: 'space-between', paddingHorizontal: 10, paddingTop: 5 }} >
                                                            <View style={{ flexDirection: 'column', width: '70%' }}>
                                                                <Text style={{ fontSize: 17, fontWeight: '700', color: '#cf2a3a' }}>
                                                                    {inf.name}
                                                                </Text>

                                                                <View style={{ flexDirection: 'row', gap: 5 }}>
                                                                    <Text style={{ fontSize: 12, color: '#646464', fontWeight: '600' }}>
                                                                        N/A
                                                                    </Text>
                                                                    <Text style={{ fontSize: 10, color: '#646464', fontWeight: '600' }}>
                                                                        |
                                                                    </Text>
                                                                    <Text style={{ fontSize: 12, color: '#646464', fontWeight: '600' }}>
                                                                        Infant
                                                                    </Text>
                                                                    <Text style={{ fontSize: 10, color: '#646464', fontWeight: '600' }}>
                                                                        |
                                                                    </Text>
                                                                    <Text style={{ fontSize: 12, color: '#646464', fontWeight: '600' }}>
                                                                        {inf.gender}
                                                                    </Text>
                                                                </View>
                                                            </View>
                                                            <View style={{ flexDirection: 'column', alignItems: 'flex-end' }}>
                                                                <Text style={{ color: '#646464', fontSize: 12, }}>Fare</Text>
                                                                <Text style={{ fontSize: 17, fontWeight: '800', color: '#cf2a3a' }}>₱ 0.00</Text>
                                                            </View>
                                                        </View>
                                                    ))}
                                        
                                                </View>
                                            ))}
                                            {passengers.some(p => p.hasCargo == true) && (
                                                <>
                                                    <Text style={{ padding: 10, borderBottomColor: '#dadada', borderBottomWidth: 1,borderTopColor: '#dadada', borderTopWidth: 1, fontWeight: 'bold', marginTop: 5, color: '#616161' }}>
                                                        Cargo/s
                                                    </Text>
                                                {passengers.map((p, pIndex) =>
                                                        p.hasCargo && p.cargo?.map((cargo, index) => (
                                                            <View
                                                            key={`${pIndex}-${index}`}
                                                            style={{
                                                                flexDirection: 'row',
                                                                alignItems: 'center',
                                                                justifyContent: 'space-between',
                                                                paddingHorizontal: 10,
                                                                paddingTop: 10
                                                            }}
                                                            >
                                                            <View style={{ flexDirection: 'column', width: '65%' }}>
                                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                                                                <Text style={{ fontSize: 17, fontWeight: '700', color: '#cf2a3a' }}>
                                                                    {`${cargo.quantity}x`}
                                                                </Text>

                                                                <Text style={{ fontSize: 17, color: '#cf2a3a', fontWeight: '700' }}>
                                                                    {cargo.cargoType === 'Rolling Cargo'
                                                                    ? `${cargo.cargoBrand} ${cargo.cargoSpecification}`
                                                                    : cargo.parcelCategory}
                                                                </Text>
                                                                </View>

                                                                <Text style={{ fontSize: 12, color: '#646464', fontWeight: '600' }}>
                                                                {`(${cargo.cargoType})`}
                                                                </Text>
                                                            </View>

                                                            <Text style={{ fontSize: 17, fontWeight: '800', color: '#cf2a3a' }}>
                                                                ₱ {(Number(cargo.cargoAmount || 0)).toFixed(2)} 
                                                            </Text>
                                                            </View>
                                                        ))
                                                    )}
                                                </> 
                                            )}
                                        </ScrollView>
                                    </>
                                ) : (
                                    <>
                                        <Text style={{ padding: 10, borderBottomColor: '#dadada', borderBottomWidth: 1, fontWeight: 'bold', marginTop: 5 }}>
                                            Cargo/s
                                        </Text>
                                        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                                            {paxCargoProperty.map((cargo, index) =>(
                                                <View key={index} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, paddingTop: 10 }}>
                                                    <View style={{ flexDirection: 'column', width: '65%' }}>
                                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                                                            <Text style={{ fontSize: 17, fontWeight: '700', color: '#cf2a3a' }}>{`${cargo.quantity}x`}</Text>
                                                            <Text style={{ fontSize: 17, color: '#cf2a3a', fontWeight: '700' }}>
                                                                { cargo.cargoType == 'Rolling Cargo' ? `${cargo.cargoBrand} ${cargo.cargoSpecification}` : cargo.parcelCategory}
                                                            </Text>
                                                        </View>
                                                        <Text style={{ fontSize: 12, color: '#646464', fontWeight: '600' }}>{`(${cargo.cargoType})`}</Text>
                                                    </View>
                                                    <Text style={{ fontSize: 17, fontWeight: '800', color: '#cf2a3a' }}>₱ {(Number(cargo.cargoAmount || 0)).toFixed(2)}</Text>
                                                </View>
                                            ))}
                                        </ScrollView>
                                    </> 
                                )}
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingHorizontal: 10, paddingVertical: 12, backgroundColor: '#cf2a3b27', borderBottomRightRadius: 6, borderBottomLeftRadius: 6 }}>
                                    <Text style={{ color: '#cf2a3a', fontSize: 17, fontWeight: '800' }}>Total Amount</Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                                        {isDiscounted && (
                                            <Text style={{ color: '#cf2a3a' }}>{`(Discounted)`}</Text>
                                        )}
                                        <Text style={{ fontSize: 20, fontWeight: '800', color: '#cf2a3a' }}>₱ {totalFare.toFixed(2)}</Text>
                                    </View>
                                </View>
                            </View>
                        </View>
                    </KeyboardAvoidingView>
                   </> 
                )}
            </View>

            {discountModal && (
                <DiscountModal discountModal={discountModal} setDiscountModal={setDiscountModal} discounts={discounts} />
            )}

            {preloader == false && (
                <View>
                    {isDiscounted == false && passengers.length > 0 && (
                        <TouchableOpacity disabled={loading} onPress={() => setDiscountModal(true)} style={{ width: '95%', alignSelf: 'center', borderRadius: 8, borderWidth: 1, borderColor: '#cf2a3a', paddingVertical: 13, justifyContent: 'center', flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 10 }}>
                            <MaterialCommunityIcons name={'tag-multiple'} color={'#cf2a3a'}  size={25}/>
                            <Text style={{ color: '#cf2a3a', fontSize: 16, fontWeight: 'bold' }}>Apply Discount</Text>
                        </TouchableOpacity>
                    )}
                    
                    <TouchableOpacity disabled={loading} onPress={() => handleConfirmation()} style={{ backgroundColor: '#cf2a3a', width: '95%', alignSelf: 'center', borderRadius: 8, paddingVertical: 13 }}>
                        {loading == true ? (
                            <ActivityIndicator size={'small'} color={'#fff'} style={{ alignSelf: 'center' }} />
                        ) : (
                            <Text style={{ fontSize: 20, fontWeight: 'bold', textAlign: 'center', color: '#fff' }}>Confirm</Text>
                        )}
                    </TouchableOpacity>
                </View>
            )}
        </View>
    )
}

const styles = StyleSheet.create({
    discountContainer: {
        backgroundColor: '#f0fdf4',
        borderRadius: 8,
        marginTop: 15,
        padding: 14,
        borderColor: '#16a34a80',
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    discountLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flex: 1,
    },
    discountTag: {
        fontSize: 22,
    },
    discountCode: {
        fontSize: 14,
        fontWeight: '700',
        color: '#16a34a',
        letterSpacing: 0.5,
    },
    discountDesc: {
        fontSize: 12,
        color: '#16a34a',
        marginTop: 2,
        fontWeight: '700'
    },
    discountRemove: {
        width: 28,
        height: 28,
        borderRadius: 6,
        backgroundColor: '#16a34a18',
        justifyContent: 'center',
        alignItems: 'center',
    },
    discountRemoveText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#16a34a',
    },
});