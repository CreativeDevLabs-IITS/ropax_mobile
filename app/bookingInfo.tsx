import { FetchPaxBookingInfo } from '@/api/paxBookingInfo';
import CancelBooking from '@/components/cancelModal';
import PreLoader from '@/components/preloader';
import ReschedBooking from '@/components/reschedModal';
import { useCargo } from '@/context/cargoProps';
import { PassengerProps, usePassengers } from '@/context/passenger';
import { useTrip } from '@/context/trip';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Discount } from './summary';

import { bookingStatuses } from './(tabs)/manage-booking';



const { height, width } = Dimensions.get('screen');

type PaxCargos = {
    id: number;
    category?: string;
    brand?: string;
    specification?: string;
    cargo_type?: string;
    cargo_option_id?: number;
    quantity: number;
    amount: number;
}


export type PaxInfo = {
    id?: number;
    first_name?: string;
    last_name?: string;
    age?: number;
    gender?: string;
    address?: string;
    nationality?: string;
    contactNo?: string;
    tripId: number;
    departureDate?: string;
    departureTime?: string;
    departureTimeISO?: string;
    dateIso: string;
    route?: string;
    mobileCode: string;
    webCode: string;
    routeId: number;
    origin: string;
    destination: string;
    vessel?: string;
    vesselId: number;
    vesselCode: string;
    referenceNumber?: string;
    bookingStatus?: number;
    tripStatus: string;
    seatNumber: string;
    passengerTypeId: number;
    passenger_type: string;
    accommodation: string;
    paxTypeCode: string;
    accommodationTypeId: number;
    station?: string | null;
    fare?: number;
    bookingType: string;
    isCargoable: number;
    forCancel?: boolean;
    hasCancelled?: boolean;
    forResched?: boolean;
    paxCargos?: PaxCargos[];
    discount?: Discount | null;
    cashTendered?: number | null;
}



export type PercentagesProps = {
    id: number;
    situation: string;
    feePercentage: number;
    isActive: number;
}

const tabs = [
    { id: 1, name: 'Passengers' },
    { id: 2, name: 'Cargo' }
]


export default function BookingInfo() {
    const { cargoProperties, paxCargoProperty, setPaxCargoProperties } = useCargo();
    const { setPassengers, clearPassengers } = usePassengers();
    const { setRefNumber, setBookingId, clearTrip, setRouteID, setTotalFare, setFareChange, setVessel, setID, setOrigin, setDestination, setVesselID, setCode, 
        setWebCode, setDepartureTime, setMobileCode, setIsCargoable, setHasScanned, setTripAccom, setCashTendered, setDepartureDate } = useTrip();
    const { bookingId, paxId, refNum } = useLocalSearchParams();
    const [ loading, setLoading ] = useState(true);
    const [ paxInfo, setPaxInfo ] = useState<PaxInfo[]>([]);
    const [percentages, setPercentages] = useState<PercentagesProps[]>([]);
    const [formTab, setFormTab] = useState('Passengers');
    const [totalTripFare, setTotalTripFare] = useState(0);
    const [proceedLoading,  setProceedLoading] = useState(false)
    const [reschedModal, setReschedModal] = useState(false);
    const [cancelModal, setCancelModal] = useState(false);
    const insets = useSafeAreaInsets();
    const [reprintLoading, setReprintLoading] = useState(false);
    const [isRequestable, setIsRequestable] = useState(true);

    const isOnlinePax = paxInfo.some(p => p?.station?.toLowerCase() == 'online booking');
    const paxBookingStatus = bookingStatuses?.find(s => s.id == paxInfo[0]?.bookingStatus)?.label.toLowerCase();
    const paxInfoToDisplay = paxInfo.find((p: any) => p.id == Number(paxId));

    useFocusEffect(
        useCallback(() => {
            clearPassengers();
            clearTrip();
            handleFetchInfo();
            setPaxCargoProperties([]);
        }, [])
    );

    const paxCargos = useMemo(() => {
        return paxInfo
            .filter(p => p.paxCargos && p.paxCargos.length > 0)
            .flatMap(p => p.paxCargos);
    }, [paxInfo]);

    const handleFetchInfo = async () => {
        try {
            const response = await FetchPaxBookingInfo(Number(bookingId), Number(paxId), String(refNum));
            
            if(!response.error) {
                const paxDatas = response.data;

                function isRequestableChecker (pax_trip: string) {
                    const paxTripDate = new Date(pax_trip);
                    const requestableDays = new Date(paxTripDate);
                    const current = new Date();

                    requestableDays.setDate(requestableDays.getDate() + 7);
                    
                    if(current > requestableDays) {
                        setIsRequestable(false);
                    }else {
                        setIsRequestable(true);   
                    }
                }

                const paxData: PaxInfo[] = paxDatas.map((pax: any) => ({
                    id: pax.id,
                    first_name: pax.first_name,
                    last_name: pax.last_name,
                    age: pax.age,
                    gender: pax.gender,
                    address: pax.address,
                    nationality: pax.nationality,
                    contactNo: pax.bookings[0].contact_number,
                    tripId: pax.bookings[0].trip_schedule_id,
                    dateIso: pax.bookings[0].trip_schedule.specific_days[0],
                    departureDate: new Date(pax.bookings.find((c: any) => c.trip_schedule).trip_schedule.specific_days).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    }),
                    departureTime: new Date(`1970-01-01T${pax.bookings.find((t: any) => 
                        t.trip_schedule)?.trip_schedule.trip.departure_time}`).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                    }),
                    departureTimeISO: pax.bookings[0].trip_schedule.trip.departure_time,
                    routeId: pax.bookings[0].trip_schedule.trip.route_id,
                    origin: pax.bookings[0].trip_schedule.trip.route.origin,
                    destination: pax.bookings[0].trip_schedule.trip.route.destination,
                    route: `${pax.bookings[0].trip_schedule.trip.route.origin} - ${pax.bookings[0].trip_schedule.trip.route.destination}`,
                    station: pax.bookings[0].station?.name,
                    mobileCode: pax.bookings[0].trip_schedule.trip.route.mobile_code,
                    webCode: pax.bookings[0].trip_schedule.trip.route.web_code,
                    vessel: pax.bookings[0].trip_schedule.trip.vessel.name,
                    vesselId: pax.bookings[0].trip_schedule.trip.vessel.id,
                    vesselCode: pax.bookings[0].trip_schedule.trip.vessel.code,
                    referenceNumber: pax.bookings[0].reference_no,
                    bookingStatus: pax.bookings[0]?.status_id ?? 0,
                    tripStatus: pax.bookings[0].trip_schedule.status,
                    seatNumber: pax.bookings[0].pivot?.seat_no ?? 'N/A',
                    passenger_type: pax.passenger_type.name,
                    passengerTypeId: pax.passenger_type.id,
                    paxTypeCode: pax.passenger_type.passenger_types_code,
                    accommodation: pax.accommodation_type[0]?.name,
                    accommodationTypeId: pax.accommodation_type[0]?.id,
                    fare: pax.fares[0]?.fare ? pax.fares[0]?.fare : pax.bookings.find((r: any) => r.pivot)?.pivot?.fare,
                    bookingType: pax.bookings[0].type_id,
                    isCargoable: pax.bookings[0].trip_schedule.trip.vessel.is_cargoable,
                    paxCargos: pax.cargos,
                    discount:  pax.bookings[0]?.discount_redemptions?.[0]?.discount ?? null,
                    cashTendered: pax.bookings[0]?.passenger_tendered_amount
                }))

                const cancelPercents: PercentagesProps[] = response.cancellationPercentage.map((percent: any) => ({
                    id: percent.id,
                    situation: percent.situation,
                    feePercentage: percent.fee_percentage,
                    isActive: percent.is_active
                }))

                isRequestableChecker(paxData[0].dateIso);
                setPaxInfo(paxData);
                setPercentages(cancelPercents)
                const totalBeforeDiscount = paxData.reduce((sum, pax) => sum + Number(pax?.fare ?? 0), 0);
                
                const discountedTotal = paxData.reduce((sum, pax) => {
                    const fare = Number(pax?.fare ?? 0);
                    const discount = pax.discount;

                    if (!discount) return sum + fare;

                    if (discount.scope === 'booking_total') {
                        return sum + fare;
                    }

                    if (discount.scope === 'passenger_fare') {
                        if (discount.discount_type === 'fixed') {
                            return sum + Math.max(0, fare - Number(discount.fixed_amount));
                        } else {
                            const deduction = (fare * discount.percent) / 100;
                            return sum + Math.max(0, fare - deduction);
                        }
                    }

                    return sum + fare;
                }, 0);

                const bookingDiscount = paxData.find(p => p.discount?.scope === 'booking_total')?.discount;
                let finalTotal = discountedTotal;

                if (bookingDiscount) {
                    if (bookingDiscount?.discount_type === 'fixed') {
                        finalTotal = Math.max(0, discountedTotal - Number(bookingDiscount.fixed_amount));
                    } else {
                        const deduction = (discountedTotal * bookingDiscount?.percent) / 100;
                        finalTotal = Math.max(0, discountedTotal - deduction);
                    }
                }

                const totalCargoAmount = paxData.reduce((sum, pax) => {
                    return sum + (pax.paxCargos?.reduce((cSum, c) => cSum + Number(c?.amount ?? 0), 0) ?? 0);
                }, 0);

                setTotalTripFare((paxData[0]?.discount != null ? finalTotal : totalBeforeDiscount) + totalCargoAmount);

            }
        }catch(error: any) {
            Alert.alert('Error', error.message);
        }finally {
            setTimeout(() => {
                setLoading(false)
            }, 200);
        }
    }

    const handleProceedBooking = () => {
        setTripAccom(paxInfo[0].accommodation);
        setProceedLoading(true);
        
        setBookingId(Number(bookingId))
        setID(paxInfo[0].tripId);
        setVessel(paxInfo[0].vessel);
        setVesselID(paxInfo[0].vesselId);
        setRouteID(paxInfo[0].routeId);
        setOrigin(paxInfo[0].origin);
        setDestination(paxInfo[0].destination)
        setMobileCode(paxInfo[0].mobileCode);
        setWebCode(paxInfo[0].webCode);
        setCode(paxInfo[0].vesselCode);
        setDepartureTime(paxInfo[0].departureTimeISO);
        setIsCargoable(paxInfo[0].isCargoable);
        
        
        for(const pax of paxInfo) {
            setPassengers(prev => [...prev, {
                    id: String(pax.id), pax_id: String(pax.id), name: `${pax.last_name}, ${pax.first_name}`, age: pax.age, gender: pax.gender, 
                    nationality: pax.nationality, address: pax.address, contact: pax.contactNo, seatNumber: '', accommodation: pax.accommodation, fare: pax.fare,
                    accommodationID: pax.accommodationTypeId, passType: pax.passenger_type, passType_id: pax.passengerTypeId, passTypeCode: pax.paxTypeCode, hasScanned: true
                }])
            }
            

        setTimeout(() => {
            setHasScanned(true);
            setProceedLoading(false);
            
            if(!paxInfo.some(p => p.passenger_type == 'Passes')) {
                router.push('/seatPlan')
            }else {
                router.push('/bookingForm')
            }
        }, 600);
        
    }

    const handleOnCancelModal = () => {
        setPaxInfo(prev => (
            prev.map(p => ({ ...p, forCancel: false }))
        ))

        setCancelModal(true)
    }

    const handleOnReschedModal = () => {
        setPaxInfo(prev => (
            prev.map(p => ({ ...p, forCancel: false }))
        ));

        setReschedModal(true)
    }

    const handleAddCargo = () => {
        setID(paxInfo[0].tripId);
        setVessel(paxInfo[0].vessel);
        setVesselID(paxInfo[0].vesselId);
        setRouteID(paxInfo[0].routeId);
        setOrigin(paxInfo[0].origin);
        setDestination(paxInfo[0].destination)
        setMobileCode(paxInfo[0].mobileCode);
        setWebCode(paxInfo[0].webCode);
        setCode(paxInfo[0].vesselCode);
        setDepartureTime(paxInfo[0].departureTimeISO);

        setPaxCargoProperties([{ isCargoAdded: true, passenger_id: paxInfo[0].id , quantity: 1 }])

        router.push(`/addPaxCargo?departureTime=${paxInfo[0].departureTime}`)
    }

    const handleReprint = () => {
        setReprintLoading(true);

        setTimeout(() => {
            const paxData: PassengerProps[] = paxInfo.map(pax => ({
                pax_id: String(pax.id),
                id: String(pax.id),
                accommodation: pax.accommodation,
                accommodationID: pax.accommodationTypeId,
                passType: pax.passenger_type,
                passType_id: pax.passengerTypeId,
                passTypeCode: pax.paxTypeCode,
                name: pax.last_name + ', ' + pax.first_name,
                address: pax.address,
                age: pax.age,
                nationality: pax.nationality,
                contact: pax.contactNo,
                gender: pax.gender,
                seatNumber: pax.seatNumber,
                trip: pax.route,
                fare: pax.fare,
                bookingType: pax.bookingType
                
            }));

            const totalBeforeDiscount = paxInfo.reduce((sum, pax) => sum + Number(pax?.fare ?? 0), 0);

            const discountedTotal = paxInfo.reduce((sum, pax) => {
                const fare = Number(pax?.fare ?? 0);
                const discount = pax.discount;

                if (!discount) return sum + fare;
                if (discount.scope === 'booking_total') return sum + fare;

                if (discount.scope === 'passenger_fare') {
                    if (discount.discount_type === 'fixed') {
                        return sum + Math.max(0, fare - Number(discount.fixed_amount));
                    } else {
                        const deduction = (fare * discount.percent) / 100;
                        return sum + Math.max(0, fare - deduction);
                    }
                }

                return sum + fare;
            }, 0);


            const bookingDiscount = paxInfo.find(p => p.discount?.scope === 'booking_total')?.discount;
            let finalTotal = discountedTotal;

            if (bookingDiscount) {
                if (bookingDiscount.discount_type === 'fixed') {
                    finalTotal = Math.max(0, discountedTotal - Number(bookingDiscount.fixed_amount));
                } else {
                    const deduction = (discountedTotal * bookingDiscount.percent) / 100;
                    finalTotal = Math.max(0, discountedTotal - deduction);
                }
            }

            const totalCargoAmount = paxInfo.reduce((sum, pax) => {
                return sum + (pax.paxCargos?.reduce((cSum, c) => cSum + Number(c?.amount ?? 0), 0) ?? 0);
            }, 0);

            const hasDiscount = paxInfo.some(p => p.discount != null);
            const grandTotal = (hasDiscount ? finalTotal : totalBeforeDiscount) + totalCargoAmount;

            const tendered = paxInfo[0]?.cashTendered != null ? Number(paxInfo[0].cashTendered) : 0;

            setPassengers(paxData);
            setRefNumber(paxInfo[0].referenceNumber);
            setTotalFare(grandTotal);
            setCashTendered(tendered);
            setFareChange(tendered - grandTotal);
            setID(paxInfo[0].tripId);
            setVessel(paxInfo[0].vessel);
            setVesselID(paxInfo[0].vesselId);
            setRouteID(paxInfo[0].routeId);
            setOrigin(paxInfo[0].origin);
            setDestination(paxInfo[0].destination);
            setMobileCode(paxInfo[0].mobileCode);
            setWebCode(paxInfo[0].webCode);
            setCode(paxInfo[0].vesselCode);
            setDepartureTime(paxInfo[0].departureTimeISO);
            setDepartureDate(paxInfo[0].dateIso)
            setIsCargoable(paxInfo[0].isCargoable);

            setReprintLoading(false);
            router.push('/generateTicket');
        }, 500);

    }

    return (
        <View style={{ flex: 1, backgroundColor: '#fafafa', paddingBottom: insets.bottom }}>
            <View style={styles.headerContainer}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Pressable onPress={() => router.back()}>
                        <Ionicons name={'arrow-back'} size={30} color={'#fff'} />
                    </Pressable>
                    <Text style={{ color: '#fff', fontSize: 20, fontWeight: 'bold' }}>Booking Details</Text>
                </View>
            </View>
            {loading == true ? (
                <PreLoader loading={loading} />
            ) : (
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, paddingVertical: 20, gap: 5 }}>
                    <ScrollView style={{ flex: 1, paddingHorizontal: 20 }} showsVerticalScrollIndicator={false}>
                        <View style={[styles.card, { padding: 10, gap: 12 }]}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 15 }}>
                                <Ionicons name={'boat'} color={'#fff'} size={28} style={{ padding: 10, backgroundColor: '#cf2a3a', borderRadius: 50 }} />
                                <View>
                                    <Text style={{ color: '#cf2a3a', fontSize: 17, fontWeight: '900' }}>{paxInfo.find((p: any) => p.id == Number(paxId))?.referenceNumber}</Text>
                                    
                                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '89%', backgroundColor: '#f0f0f0', paddingHorizontal: 8, paddingVertical: 5, marginTop: 3, borderRadius: 3 }}>
                                        <Text style={{ color: '#646464', fontSize: 12, fontWeight: '700' }}>Booking status: </Text>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                                            <MaterialCommunityIcons name={bookingStatuses?.find(s => s.id == paxInfo[0]?.bookingStatus)?.icon as any ?? ''} size={14} color={bookingStatuses.find(s => s.id == paxInfo[0]?.bookingStatus)?.color ?? 'transparent'} />
                                            <Text style={{ fontWeight: '800', color: bookingStatuses?.find(s => s.id == paxInfo[0]?.bookingStatus)?.color ?? 'transparent', fontSize: 12 }}>{bookingStatuses?.find(s => s.id == paxInfo[0]?.bookingStatus)?.label ?? ''}</Text>
                                        </View>
                                    </View>
                                </View>
                            </View>
                        </View>

                        {paxInfoToDisplay && paxInfoToDisplay?.discount != null && (
                            <View style={styles.discountContainer}>
                                <View style={styles.discountLeft}>
                                    <MaterialCommunityIcons name={'tag-multiple'} color={'#16a34a'}  size={25}/>
                                    <View>
                                        <Text style={styles.discountCode}>{paxInfoToDisplay?.discount?.discount_code}</Text>
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            <Text style={styles.discountDesc}>
                                                ₱ {paxInfoToDisplay?.discount?.discount_type == 'fixed' ?
                                                    paxInfoToDisplay?.discount?.fixed_amount :
                                                    `${paxInfoToDisplay?.discount?.percent}%`
                                                } Discount on
                                            </Text>
                                            <Text style={styles.discountDesc}>
                                                {paxInfoToDisplay?.discount?.scope == 'booking_total' ?
                                                    ' Total booking amount.' :
                                                    ` Each passenger.`
                                                }
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            </View>
                        )}

                        <View style={styles.card}>
                            <Text style={{ fontWeight: 'bold', padding: 10, borderBottomColor: '#dadada', borderBottomWidth: 1, }}>Booking Information</Text>
                            <View style={{ paddingHorizontal: 10, paddingBottom: 10 }}>
                                <View style={styles.bookingContainer}>
                                    <Text style={{ color: '#646464', fontSize: 13, }}>Booking Type</Text>
                                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#000' }}>{paxInfoToDisplay?.bookingType}</Text>
                                </View>
                                <View style={styles.bookingContainer}>
                                    <Text style={{ color: '#646464', fontSize: 13, }}>Vessel</Text>
                                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#000' }}>{paxInfoToDisplay?.vessel}</Text>
                                </View>
                                <View style={styles.bookingContainer}>
                                    <Text style={{ color: '#646464', fontSize: 13, }}>Route</Text>
                                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#000' }}>{paxInfoToDisplay?.route}</Text>
                                </View>
                                <View style={styles.bookingContainer}>
                                    <Text style={{ color: '#646464', fontSize: 13, }}>Station</Text>
                                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#000' }}>{paxInfoToDisplay?.station ?? '--'}</Text>
                                </View>
                                <View style={styles.bookingContainer}>
                                    <Text style={{ color: '#646464', fontSize: 13, }}>Departure Date</Text>
                                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#000' }}>{paxInfoToDisplay?.departureDate}</Text>
                                </View>
                                <View style={styles.bookingContainer}>
                                    <Text style={{ color: '#646464', fontSize: 13, }}>Departure Time</Text>
                                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#000' }}>{paxInfoToDisplay?.departureTime}</Text>
                                </View>
                            </View>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 12, backgroundColor: '#cf2a3b27', borderBottomRightRadius: 6, borderBottomLeftRadius: 6 }}>
                                <Text style={{ color: '#cf2a3a', fontSize: 13, fontWeight: '800' }}>Total Amount</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                                    {paxInfoToDisplay?.discount != null && (
                                        <Text style={{ color: '#cf2a3a' }}>{`(Discounted)`}</Text>
                                    )}
                                    <Text style={{ fontSize: 16, fontWeight: '800', color: '#cf2a3a' }}>₱ {totalTripFare.toFixed(2)}</Text>
                                </View>
                            </View>
                        </View>

                        <View>
                            <View style={styles.tabs}>
                                {tabs.map((t: any) => (
                                    <Pressable onPress={() => setFormTab(t?.name)} key={t.id} style={{ backgroundColor: formTab == t?.name ? '#f1f1f1' : 'transparent', padding: 9, borderRadius: 5  }}>
                                        <Text style={{ color: formTab == t?.name ? '#cf2a3a' : '#494949' }}>{t?.name}</Text>
                                    </Pressable>
                                ))}
                            </View>
                        </View>
                        {formTab == 'Passengers' ? (
                            <View style={[styles.card,  { marginTop: 10 }]}>
                                <Text style={{ padding: 10, borderBottomColor: '#dadada', borderBottomWidth: 1, fontWeight: 'bold', color: '#000' }}>Passenger/s</Text>
                                {paxInfo.map((pax: any) =>(
                                    <View key={pax.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: 10 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            <Ionicons name={'person'} color={'#fff'} size={18} style={{ padding: 10, backgroundColor: '#cf2a3a', borderRadius: 50, marginRight: 10 }} />
                                            <View style={{ flexDirection: 'column', width: '65%' }}>
                                                <Text style={{ fontSize: 14, fontWeight: '700', color: '#000' }}>{`${pax.first_name} ${pax.last_name}`}</Text>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                                                    <Text style={{ fontSize: 10, color: '#646464', fontWeight: '600' }}>{pax?.seatNumber != 'N/A' ? `Seat# ${pax?.seatNumber}` : 'N/A'}</Text>
                                                    <Text style={{ fontSize: 10, color: '#646464' }}>|</Text>
                                                    <Text style={{ fontSize: 10, color: '#646464', fontWeight: '600' }}>{pax?.passenger_type}</Text>
                                                    <Text style={{ fontSize: 10, color: '#646464' }}>|</Text>
                                                    <Text style={{ fontSize: 10, color: '#646464', fontWeight: '600' }}>{pax?.accommodation}</Text>
                                                </View>
                                            </View>
                                        </View>
                                        <View style={{ flexDirection: 'column', alignItems: 'flex-end' }}>
                                            <Text style={{ color: '#646464', fontSize: 12, }}>Fare</Text>
                                            <Text style={{ fontSize: 14, fontWeight: '800', color: '#cf2a3a' }}>₱ {Number(pax?.fare).toFixed(2)}</Text>
                                        </View>
                                    </View>
                                ))}

                            </View>
                        ) : (
                            <View style={{ marginBottom: 15 }}>
                                <View style={[styles.card, { marginTop: 10 }]}>
                                    <View style={{ position: 'relative', paddingHorizontal: 10, paddingVertical: 8, borderBottomColor: '#dadada', borderBottomWidth: 1 }}>
                                        <Text style={{ fontWeight: 'bold' }}>Cargo</Text>
                                    </View>
                                    {paxCargos.length > 0 ? (
                                        <>
                                            {paxCargos.map(c => (
                                                <View key={c.id} style={{ paddingVertical: 10 }}>
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: 10 }}>
                                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                            <MaterialCommunityIcons name={'truck'} color={'#fff'} size={19} style={{ padding: 10, backgroundColor: '#cf2a3a', borderRadius: 50, marginRight: 10 }} />
                                                            <View style={{ flexDirection: 'column', width: '65%' }}>
                                                                <Text style={{ fontSize: 14, fontWeight: '700', color: '#000' }}>{c?.cargo_type}</Text>
                                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                                                                    <Text style={{ fontSize: 10, color: '#646464', fontWeight: '600' }}>Quantity: {c?.quantity}</Text>
                                                                    {c?.brand && (
                                                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                                                                            <Text style={{ fontSize: 10, color: '#646464' }}>|</Text>
                                                                            <Text style={{ fontSize: 10, color: '#646464', fontWeight: '600' }}>{`${c?.brand} ${c?.specification}CC`}</Text>
                                                                        </View>
                                                                    )}
                                                                    {c?.specification && (
                                                                         <Text style={{ fontSize: 10, color: '#646464', fontWeight: '600' }}>{`${c?.brand} ${c?.specification}CC`}</Text>
                                                                    )}
                                                                    {
                                                                        c?.category && (
                                                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                                                                                <Text style={{ fontSize: 10, color: '#646464' }}>|</Text>
                                                                                <Text style={{ fontSize: 10, color: '#646464', fontWeight: '600' }}>{`${c.category}`}</Text>
                                                                            </View>
                                                                        )
                                                                    }
                                                                </View>
                                                            </View>
                                                        </View>
                                                        <View style={{ flexDirection: 'column', alignItems: 'flex-end' }}>
                                                            <Text style={{ color: '#646464', fontSize: 12, }}>Amount</Text>
                                                            <Text style={{ fontSize: 14, fontWeight: '800', color: '#cf2a3a' }}>{c.amount}</Text>
                                                        </View>
                                                    </View>
                                                </View>
                                            ))}
                                        </>
                                    ) : (
                                        <View style={{ flexDirection: 'column', paddingVertical: 10, justifyContent: 'center', alignItems: 'center' }}>
                                            <Ionicons name={'close-circle'} size={30} color={'#c7c7c7'} />
                                            <Text style={{ fontSize: 10, color: '#646464' }}>No cargo record</Text>
                                        </View>
                                    )}
                                </View>
                                {!isOnlinePax && paxBookingStatus == 'confirmed' && (
                                    <Pressable style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'center', paddingVertical: 10, paddingHorizontal: 15, borderRadius: 8, backgroundColor: '#fff', elevation: 2 }}
                                        onPress={() => handleAddCargo()}>
                                        <Ionicons name={'add'} color={'#cf2a3a'} size={20} />
                                        <Text style={{ color: '#cf2a3a', fontWeight: '600' }}>Add Cargo</Text>
                                    </Pressable>
                                )}
                            </View>
                        )}
                    </ScrollView>
                    <View style={{ paddingVertical: 10, borderTopColor: '#dadada', borderTopWidth: 1 }}>
                        {paxBookingStatus == 'confirmed' && isRequestable == true && !isOnlinePax && (
                            <View style={styles.requestsContainer}>
                                <Pressable onPress={() => handleOnCancelModal()} style={[styles.requestsBtn, { backgroundColor: '#cf2a3a' }]}>
                                    <MaterialCommunityIcons name={'cancel'} color={'#fff'} size={18} />
                                    <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14, }}>Cancel</Text>
                                </Pressable>
                                <Pressable onPress={() => handleOnReschedModal()} style={[styles.requestsBtn, { backgroundColor: '#FCCA03' }]}>
                                    <Ionicons name={'reload'} size={18} style={{ color: '#000' }} />
                                    <Text style={{ fontWeight: '800', fontSize: 14, color: '#000' }}>Reschedule</Text>
                                </Pressable>
                                <Pressable onPress={() => handleReprint()} style={[styles.requestsBtn, { backgroundColor: '#25AD76' }]}>
                                    {reprintLoading == true ? (
                                        <ActivityIndicator size={'small'} color={'#fff'} />
                                    ) : (
                                        <Ionicons name={'print-outline'} color={'#fff'} size={20} />
                                    )}
                                    <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14, }}>Reprint</Text>
                                </Pressable>
                            </View>
                        )}
                        {paxBookingStatus == 'pending' && !isOnlinePax  && (
                            <Pressable  onPress={() => handleProceedBooking()} disabled={proceedLoading} style={[styles.requestsBtn, { backgroundColor: '#cf2a3a', width: '90%', alignSelf: 'center' }]}>
                                {proceedLoading == true ? (
                                    <ActivityIndicator size={'small'} color={'#fff'} style={{ alignSelf: 'center' }} />
                                ) : (
                                    <Text style={{ color: '#fff', fontWeight: '800' }}>Select Seat</Text>
                                )}
                            </Pressable>
                        )}
                    </View>
                </KeyboardAvoidingView>
            )}

            {cancelModal == true && (
                <CancelBooking cancelModal={cancelModal} setCancelModal={setCancelModal} paxInfo={paxInfo} 
                    setPaxInfo={setPaxInfo} percents={percentages} bookingId={bookingId}  />
            )}

            {reschedModal == true && (
                <ReschedBooking reschedModal={reschedModal} setReschedModal={(setReschedModal)} paxInfo={paxInfo} 
                    setPaxInfo={setPaxInfo} bookingId={bookingId} />
            )}

            
        </View>
    )
}


const styles = StyleSheet.create({
    headerContainer: {
        backgroundColor: '#cf2a3a',
        height: 100,
        paddingHorizontal: 20,
        paddingTop: 50,
        position: 'relative'
    },
    loadingContainer: {
        height: height - 150,
        justifyContent: 'center',
        alignItems: 'center',
    },
    card: {
        borderColor: "#dadada",
        borderWidth: 1,
        borderRadius: 8,
        marginBottom: 20,
    },
    fareContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        backgroundColor: '#f1f1f1',
        padding: 8,
        borderRadius: 8
    },
    bookingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 10
    },
    tabs: {
        flexDirection: 'row',
        alignSelf: 'center',
        backgroundColor: '#fff',
        justifyContent: 'center',
        padding: 5,
        borderRadius: 8,
        gap: 5,
        borderColor: "#dadada",
        borderWidth: 1,
    },
    optionContainer: {
        position: 'absolute',
        backgroundColor: '#fff',
        padding: 10,
        width: 150,
        flexDirection: 'column',
        gap: 5,
        elevation: 2,
        right: 10,
        top: 30,
        zIndex: 10,
        borderRadius: 5
    },
    requestsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20
    },
    requestsBtn: {
        paddingVertical: 15,
        justifyContent: 'center',
        borderRadius: 8,
        elevation: 2,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        width: width / 3 - 20
    },
    input: {
        width: 100,
        fontSize: 16,
        height: 40,
        backgroundColor: '#fafafa',
        textAlign: 'right',
        paddingHorizontal: 3,
        borderColor: '#fafafa'
    },
    discountContainer: {
        backgroundColor: '#f0fdf4',
        borderRadius: 8,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderColor: '#16a34a80',
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10
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
})