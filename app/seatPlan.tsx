import { FetchAccommodations } from '@/api/accommodations';
import { FetchTotalBookings } from "@/api/totalBookings";
import L2Vessel from "@/components/L2Vessel";
import SeatAccommAlert from '@/components/seatAccommAlert';
import SRVessel from "@/components/srVessel";
import { usePassengers } from "@/context/passenger";
import { usePassesType } from "@/context/passes";
import { useTrip } from "@/context/trip";
import { seatRemoval } from "@/utils/channel";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import BottomSheet, { BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import * as Crypto from 'expo-crypto';
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Image, ScrollView, Text, TouchableOpacity, useWindowDimensions, View } from "react-native";
import { GestureHandlerRootView } from 'react-native-gesture-handler';


const deck = require('@/assets/images/deck.png');
const icon = require('@/assets/images/logo_icon.png');
const text_logo = require('@/assets/images/logo.png');


export type AccomsProps = {
    id: number;
    name?: string;
    code: string;
}

export default function SeatPlan() {
    const { passengers, setPassengers } = usePassengers();
    const { id, vessel, destination, origin } = useTrip();
    const { passesTypeID, passesTypeCode, passesTypeName } = usePassesType();
    const [accommodations, setAccommodations] = useState<AccomsProps[] | null>(null);
    const [year, setYear] = useState('');
    const [totalBookings, setTotalBookings] = useState<number>(0);
    const [errorForm, setErrorForm] = useState<(string | number)[]>([]);
    const [passesIsHidden, setPassesIsHidden] = useState(false);
    const [hasAvailableSeat, setHasAvailableSeat] = useState<boolean>(true);
    const passengersRef = useRef(passengers);
    const seatSheetRef = useRef<BottomSheet>(null);
    const [isLoading, setIsLoading] = useState(true);
    const { width, height } = useWindowDimensions();

    const isTablet = width >= 600;
    const bgImageHeight = isTablet ? height + 800 : height + 620;
    const iconSize = isTablet ? { width: 55, height: 54 } : { width: 41, height: 40 };
    const logoSize = isTablet ? { width: 160, height: 37 } : { width: 120, height: 28 };

    const sheetIndex = passengers.length > 0 && passengers.some(p => p.passType != 'Passes') ? 0 : -1;
    const seatSnapPoints = useMemo(() => ["30%"], []);
    const nonInfantPax = useMemo(() => passengers.filter(p => p.passType != 'Infant'), [passengers]);
    const hasEmptySeat = useMemo(() => nonInfantPax.filter(p => p.passType != 'Infant').some(p => p.seatNumber == ''), [nonInfantPax]);
    const hasPasses = useMemo(() => passengers.some(p => p.passType == 'Passes'), [passengers]);
    const hasSeat = useMemo(() => passengers.some(p => p.seatNumber != null), [passengers]);

    
    const handleSeatSelect = useCallback(() => {
        if(passengers.length == 0 && passengers.some(p => p.passType != 'Passes')) {
            // seatSheetRef.current?.snapToIndex(0);
        }
    }, [])

    const handleRemoveSeat =  useCallback((seat: number | string, paxId: string | number) => {
        if (!seat) return;

        if (errorForm.includes(seat)) {
            setErrorForm(prev => prev.filter(e => e != seat));
        }

        seatRemoval(seat, id);

        setPassengers(prev => {
            const specialPaxBooking = prev.some(p => (p.hasScanned || p.forResched) && p.id == paxId);

            const updatedPassengers = specialPaxBooking
                ? prev.map(p =>
                    p.id == paxId ? { ...p, seatNumber: '' } : p
                )
                : prev.filter(p => p.seatNumber != seat);

            const noSeatsLeft = updatedPassengers.filter(p => p.seatNumber).length === 0;

            const regularPaxBooking =
                noSeatsLeft && !specialPaxBooking;

            if (regularPaxBooking) {
                seatSheetRef.current?.close();
            }

            return updatedPassengers;
        });
    }, [id, errorForm, setPassengers]);

    const handleForceSeatRemoval = useCallback(() => {
        passengers.forEach(paxSeat => {
            const seat = paxSeat.seatNumber;
            if (errorForm.includes(seat)) {
                setErrorForm(prev => prev.filter((e: any) => e != seat));
            }
            seatRemoval(seat, id);
        });
    }, [passengers, errorForm, id]);

    const handleCreatePasses = useCallback(() => {
        setPassengers([]);
        const temp = Crypto.randomUUID();
        setTimeout(() => {
            setPassengers([{
                id: temp, passType_id: passesTypeID, passType: passesTypeName, passTypeCode: passesTypeCode
            }]);
        }, 400);
        router.push('/bookingForm');
    }, [passesTypeID, passesTypeName, passesTypeCode]);

    const renderBottomSheetBackdrop = useCallback(
        (props: any) => (
            <BottomSheetBackdrop {...props} appearsOnIndex={6} disappearsOnIndex={0} pressBehavior={'none'} opacity={0.5} />
        ), []
    )

    const handleFetchDependencies = useCallback(async() => {
        try {
            const [accommodationTypes, totalBookingsCount] = await Promise.all([
                FetchAccommodations(),
                FetchTotalBookings(id)
            ]);

            if(!accommodationTypes.error) {
                const accomms: AccomsProps[] = accommodationTypes.data.map((a: any) => ({
                    id: a?.id,
                    name: a.name,
                    code: a.code
                }));

                setAccommodations(accomms);
            }

            if(!totalBookingsCount.error) {
                setTotalBookings(totalBookingsCount.total_paying);
            }
        }catch(error: any) {
            Alert.alert('Error', error.message || 'Failed to fetch. Chech your internet connection and try again.');
        }
    }, [])


    const vesselComponent = useMemo(() => {
        return vessel == 'Mbca Leopards Sea Runner' || vessel == 'Sea Runner'
            ? <SRVessel onSeatSelect={handleSeatSelect} accommodations={accommodations} seatAvailability={setHasAvailableSeat} setParentLoading={setIsLoading} />
            : <L2Vessel onSeatSelect={handleSeatSelect} accommodations={accommodations} seatAvailability={setHasAvailableSeat} setParentLoading={setIsLoading} />
    }, [vessel, handleSeatSelect, accommodations]);


    useEffect(() => {
        handleFetchDependencies()

        const date = new Date();
        setYear(date.getFullYear().toString().slice(-2));
    }, []);

    useEffect(() => {
        passengersRef.current = passengers;
    }, [passengers]);

    useEffect(() => {
        if(passengers && hasSeat) {
            setPassesIsHidden(true)
        }else {
            setPassesIsHidden(false);
        }
    }, [passengers]);




    return (
        <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#cf2a3a' }}>
            <View style={{ height: '100%', overflow: 'hidden' }}>
                <View style={{ height: 100, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 20 }}>
                    <TouchableOpacity onPress={() => {handleForceSeatRemoval(); router.back()}} style={{ zIndex: 1 }}>
                        <Ionicons name={'arrow-back'} size={30} color={'#fff'} />
                    </TouchableOpacity>
                    {(passengers.length < 1 || hasPasses) && (
                        <TouchableOpacity onPress={() => handleCreatePasses()} style={{ opacity: passesIsHidden == true ?0 : 1 }}>
                            <MaterialCommunityIcons name={'account-arrow-right'} size={30} color={'#fff'} />
                        </TouchableOpacity>
                    )}
                </View>

                {isLoading == false && hasAvailableSeat == false && (
                    <SeatAccommAlert setPassengers={setPassengers} accommodations={accommodations} />
                )}

                <View style={{ position: 'absolute', paddingTop: 50, width: width, flex: 1 }}>
                    <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold', alignSelf: 'center', textAlign: 'center' }}>{vessel}</Text>
                    <Text style={{ textAlign: 'center', color: '#fff', fontSize: 10 }}>Vessel Seat Plan</Text>
                    <View style={{ paddingTop: 10, height: height - 60 }}>
                        <ScrollView style={{ height }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>

                            {!isLoading && (
                                <Image source={deck} style={{ opacity: 0.5, width: '105%', height: bgImageHeight, alignSelf: 'center', tintColor: '#ffffff' }} />
                            )}

                            <View style={{ height, width: '95%', zIndex: 5, position: 'absolute', alignSelf: 'center', alignItems: 'center', }}>
                                {!isLoading && (
                                    <>
                                        <Image source={icon} style={{ width: iconSize.width, height: iconSize.height, marginTop: 40 }} />
                                        <Image source={text_logo} style={{ width: logoSize.width, height: logoSize.height, marginTop: 10 }} />

                                        <Text style={{ fontSize: 13, fontWeight: '900', color: '#fff', marginTop: 20, textAlign: 'center' }}>{totalBookings} TOTAL PAYING PASSENGERS</Text>

                                        <View style={{ width: '80%', backgroundColor: '#FAFAFA', marginTop: 20, borderTopLeftRadius: 30, borderTopRightRadius: 30, borderBottomLeftRadius: 5,
                                                borderBottomRightRadius: 5, paddingVertical: 30, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <View style={{ flexDirection: 'row', gap: 3, alignItems: 'center' }}>
                                                <Ionicons name={'boat'} size={16} color={'#fff'} style={{ padding: 3, backgroundColor: '#cf2a3a', borderRadius: 5 }} />
                                                <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#000' }}>{origin}</Text>
                                            </View>
                                            <Ionicons name={'arrow-forward'} color={'#cf2a3a'} size={25} />
                                            <View style={{ flexDirection: 'row', gap: 3, alignItems: 'center' }}>
                                                <Ionicons name={'location'} size={15} color={'#fff'} style={{ padding: 3, backgroundColor: '#cf2a3a', borderRadius: 5 }} />
                                                <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#000' }}>{destination}</Text>
                                            </View>
                                        </View>
                                    </>
                                )}

                                <View style={{ alignSelf: 'center' }}>
                                    {vesselComponent}
                                </View>
                            </View>
                        </ScrollView>
                    </View>
                </View>

                <BottomSheet ref={seatSheetRef} snapPoints={seatSnapPoints} index={sheetIndex } bottomInset={1} backdropComponent={renderBottomSheetBackdrop} enableHandlePanningGesture={false} enableContentPanningGesture={false}  handleIndicatorStyle={{ display: 'none' }} >
                    <Text style={{ fontSize: 14, fontWeight: "bold", marginLeft: 20, color: '#474747' }}>Seat# selected</Text>
                    <View style={{ paddingHorizontal: 10 }}>
                        <View style={{ height: 90, borderColor: '#B3B3B3', borderWidth: 1, backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 8, width: '100%', marginTop: 5 }}>
                            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1, paddingTop: 10, paddingBottom: 20 }}>
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                                    {passengers.filter(p => p.passType != 'Infant' && p.passType != 'Passes').map((p) => (
                                        <View key={p.id} style={{ position: 'relative' }}>
                                            {p.seatNumber != '' && (
                                                <TouchableOpacity onPress={() => handleRemoveSeat(p.seatNumber, p.id)} style={{ position: 'absolute', top: -10, right: -9, zIndex: 3 }}>
                                                    <Ionicons name="remove-circle" size={28} color={'#cf2a3a'} />
                                                </TouchableOpacity>
                                            )}
                                            <TouchableOpacity style={{ borderColor: errorForm.includes(p.seatNumber!) ? '#cf2a3a' : '#000', backgroundColor: errorForm.includes(p.seatNumber!) ? '#cf2a3b3d' : 'transparent', borderWidth: 1, borderRadius: 5, width: 50, height: 50, justifyContent: 'center' }}>
                                                <Text style={{ textAlign: 'center', fontWeight: 'bold', fontSize: 16, color: '#000' }}>{p.seatNumber}</Text>
                                            </TouchableOpacity>
                                        </View>
                                    ))}
                                </View>
                            </ScrollView>
                        </View>
                    </View>

                    <TouchableOpacity onPress={() => router.push('/bookingForm')} disabled={hasEmptySeat} style={{ backgroundColor: '#cf2a3a', opacity: hasEmptySeat ? 0.5 : 1, width: '95%', alignSelf: 'center', borderRadius: 8, paddingVertical: 15, marginTop: 15 }}>
                        <Text style={{ fontSize: 16, fontWeight: 'bold', textAlign: 'center', color: '#fff' }}>Continue</Text>
                    </TouchableOpacity>
                </BottomSheet>

            </View>
        </GestureHandlerRootView>


    )
}