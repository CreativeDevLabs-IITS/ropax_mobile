import { FetchAccommodations } from '@/api/accommodations';
import { FetchTotalBookings } from "@/api/totalBookings";
import L1Vessel from '@/components/L1Vessel';
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
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from "react-native";
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
    const [hasAvailableSeat, setHasAvailableSeat] = useState<boolean>(true);
    const [isLoading, setIsLoading] = useState(true);

    const seatSheetRef = useRef<BottomSheet>(null);

    const passengersRef = useRef(passengers);
    useEffect(() => {
        passengersRef.current = passengers;
    }, [passengers]);

    const { width, height } = useWindowDimensions();
    const isTablet = width >= 600;
    const bgImageHeight = isTablet ? height + 800 : height + 620;
    const iconSize = isTablet ? { width: 55, height: 54 } : { width: 41, height: 40 };
    const logoSize = isTablet ? { width: 160, height: 37 } : { width: 120, height: 28 };

    const seatSnapPoints = useMemo(() => ['30%'], []);

    const nonInfantPax = useMemo(
        () => passengers.filter(p => p.passType !== 'Infant'),
        [passengers]
    );

    const hasEmptySeat = useMemo(
        () => nonInfantPax.some(p => p.passType !== 'Passes' && p.seatNumber === ''),
        [nonInfantPax]
    );

    const hasPasses = useMemo(
        () => passengers.some(p => p.passType === 'Passes'),
        [passengers]
    );

    const hasSeat = useMemo(
        () => passengers.some(p => p.seatNumber != null && p.seatNumber !== ''),
        [passengers]
    );

    const passesIsHidden = useMemo(
        () => !!(passengers.length > 0 && hasSeat),
        [passengers, hasSeat]
    );

    const sheetIndex = useMemo(
        () => passengers.length > 0 && passengers.some(p => p.passType !== 'Passes') ? 0 : -1,
        [passengers]
    );
    

    const handleSeatSelect = useCallback(() => {
        if (passengers.length === 0 || passengers.every(p => p.passType === 'Passes')) return;
        seatSheetRef.current?.snapToIndex(0);
    }, [passengers]);

    const handleRemoveSeat = useCallback((seat: number | string, paxId: string | number) => {
        if (!seat) return;

        if (errorForm.includes(seat)) {
            setErrorForm(prev => prev.filter(e => e !== seat));
        }

        seatRemoval(seat, id);

        setPassengers(prev => {
            const specialPaxBooking = prev.some(
                p => (p.hasScanned || p.forResched) && p.id === paxId
            );

            const updatedPassengers = specialPaxBooking
                ? prev.map(p => p.id === paxId ? { ...p, seatNumber: '' } : p)
                : prev.filter(p => p.seatNumber !== seat);

            const noSeatsLeft = updatedPassengers.filter(p => p.seatNumber).length === 0;

            if (noSeatsLeft && !specialPaxBooking) {
                seatSheetRef.current?.close();
            }

            return updatedPassengers;
        });
    }, [id, errorForm, setPassengers]);

    const handleForceSeatRemoval = useCallback(() => {
        const currentPassengers = passengersRef.current;
        currentPassengers.forEach(paxSeat => {
            const seat = paxSeat.seatNumber;
            if (seat && errorForm.includes(seat)) {
                setErrorForm(prev => prev.filter((e: any) => e !== seat));
            }
            if (seat) seatRemoval(seat, id);
        });
    }, [errorForm, id]);

    const handleSeatSelectRef = useRef(handleSeatSelect);
    useEffect(() => {
        handleSeatSelectRef.current = handleSeatSelect;
    }, [handleSeatSelect]);

    const stableHandleSeatSelect = useCallback(() => {
        handleSeatSelectRef.current();
    }, []);

    const handleCreatePasses = useCallback(() => {
        const temp = Crypto.randomUUID();
        setPassengers([{
            id: temp,
            passType_id: passesTypeID,
            passType: passesTypeName,
            passTypeCode: passesTypeCode,
        }]);
        router.push('/bookingForm');
    }, [passesTypeID, passesTypeName, passesTypeCode, setPassengers]);

    const renderBottomSheetBackdrop = useCallback(
        (props: any) => (
            <BottomSheetBackdrop
                {...props}
                appearsOnIndex={6}
                disappearsOnIndex={0}
                pressBehavior={'none'}
                opacity={0.5}
            />
        ),
        []
    );

    const vesselComponent = useMemo(() => {
        const vesselLower = vessel.toLowerCase();
        const sharedProps = {
            onSeatSelect: stableHandleSeatSelect,
            accommodations,
            seatAvailability: setHasAvailableSeat,
            setParentLoading: setIsLoading,
        };

        if (vesselLower.trim() === 'mbca leopards sea runner' || vesselLower === 'sea runner') {
            return <SRVessel {...sharedProps} />;
        }
        if (vesselLower.trim() === 'mv leopards 1' || vesselLower === 'leopards 1') {
            return <L1Vessel {...sharedProps} />;
        }
        return <L2Vessel {...sharedProps} />;
    }, [vessel, accommodations]);

    useEffect(() => {
        let isMounted = true;
        const controller = new AbortController();

        const fetchDependencies = async () => {
            try {
                const [accommodationTypes, totalBookingsCount] = await Promise.all([
                    FetchAccommodations(),
                    FetchTotalBookings(id),
                ]);

                if(!isMounted) return;

                if (!accommodationTypes.error) {
                    const accomms: AccomsProps[] = accommodationTypes.data.map((a: any) => ({
                        id: a?.id,
                        name: a.name,
                        code: a.code,
                    }));
                    setAccommodations(accomms);
                }

                if (!totalBookingsCount.error) {
                    setTotalBookings(totalBookingsCount.total_paying);
                }
            } catch (error: any) {
                Alert.alert(
                    'Error',
                    error.message || 'Failed to fetch. Check your internet connection and try again.'
                );
            }
        };

        fetchDependencies();
        const date = new Date();
        setYear(date.getFullYear().toString().slice(-2));

        return () => {
            isMounted = false;
        }
    }, []);

    return (
        <GestureHandlerRootView style={styles.root}>
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity
                        onPress={() => { handleForceSeatRemoval(); router.push('/manual-booking'); }}
                        style={{ zIndex: 1 }}
                    >
                        <Ionicons name={'arrow-back'} size={30} color={'#fff'} />
                    </TouchableOpacity>

                    {(passengers.length < 1 || hasPasses) && (
                        <TouchableOpacity
                            onPress={handleCreatePasses}
                            style={passesIsHidden ? styles.hiddenPassesBtn : styles.visiblePassesBtn}
                        >
                            <MaterialCommunityIcons name={'account-arrow-right'} size={30} color={'#fff'} />
                        </TouchableOpacity>
                    )}
                </View>

                {!isLoading && !hasAvailableSeat && (
                    <SeatAccommAlert
                        setPassengers={setPassengers}
                        accommodations={accommodations}
                    />
                )}

                <View style={[styles.absoluteOverlay, { width }]}>
                    <Text style={styles.vesselTitle}>{vessel}</Text>
                    <Text style={styles.vesselSubtitle}>Vessel Seat Plan</Text>

                    <View style={{ paddingTop: 10, height: height - 60 }}>
                        <ScrollView
                            style={{ height }}
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={styles.scrollContent}
                        >
                            {!isLoading && (
                                <Image
                                    source={deck}
                                    style={{
                                        opacity: 0.5,
                                        width: '105%',
                                        height: bgImageHeight,
                                        alignSelf: 'center',
                                        tintColor: '#ffffff',
                                    }}
                                />
                            )}

                            <View style={[styles.vesselContentWrap, { height, width: '95%' }]}>
                                {!isLoading && (
                                    <>
                                        <Image
                                            source={icon}
                                            style={{ width: iconSize.width, height: iconSize.height, marginTop: 40 }}
                                        />
                                        <Image
                                            source={text_logo}
                                            style={{ width: logoSize.width, height: logoSize.height, marginTop: 10 }}
                                        />

                                        <Text style={styles.totalPaxText}>
                                            {totalBookings} TOTAL PAYING PASSENGERS
                                        </Text>

                                        <View style={styles.routeCard}>
                                            <View style={styles.routeEndpoint}>
                                                <Ionicons
                                                    name={'boat'}
                                                    size={16}
                                                    color={'#fff'}
                                                    style={styles.routeIcon}
                                                />
                                                <Text style={styles.routeEndpointText}>{origin}</Text>
                                            </View>
                                            <Ionicons name={'arrow-forward'} color={'#cf2a3a'} size={25} />
                                            <View style={styles.routeEndpoint}>
                                                <Ionicons
                                                    name={'location'}
                                                    size={15}
                                                    color={'#fff'}
                                                    style={styles.routeIcon}
                                                />
                                                <Text style={styles.routeEndpointText}>{destination}</Text>
                                            </View>
                                        </View>
                                    </>
                                )}

                                <View style={styles.vesselWrap}>
                                    {vesselComponent}
                                </View>
                            </View>
                        </ScrollView>
                    </View>
                </View>

                <BottomSheet
                    ref={seatSheetRef}
                    snapPoints={seatSnapPoints}
                    index={sheetIndex}
                    bottomInset={1}
                    backdropComponent={renderBottomSheetBackdrop}
                    enableHandlePanningGesture={false}
                    enableContentPanningGesture={false}
                    handleIndicatorStyle={{ display: 'none' }}
                >
                    <Text style={styles.sheetTitle}>Seat# selected</Text>

                    <View style={styles.sheetPadding}>
                        <View style={styles.sheetSeatBox}>
                            <ScrollView
                                showsVerticalScrollIndicator={false}
                                style={styles.sheetSeatScroll}
                            >
                                <View style={styles.sheetSeatRow}>
                                    {passengers
                                        .filter(p => p.passType !== 'Infant' && p.passType !== 'Passes')
                                        .map((p) => (
                                            <View key={p.id} style={styles.seatItemWrap}>
                                                {p.seatNumber !== '' && (
                                                    <TouchableOpacity
                                                        onPress={() => handleRemoveSeat(p.seatNumber, p.id)}
                                                        style={styles.seatRemoveBtn}
                                                    >
                                                        <Ionicons name="remove-circle" size={28} color={'#cf2a3a'} />
                                                    </TouchableOpacity>
                                                )}
                                                <TouchableOpacity
                                                    style={[
                                                        styles.seatButton,
                                                        errorForm.includes(p.seatNumber!)
                                                            ? styles.seatButtonError
                                                            : styles.seatButtonNormal,
                                                    ]}
                                                >
                                                    <Text style={styles.seatButtonText}>{p.seatNumber}</Text>
                                                </TouchableOpacity>
                                            </View>
                                        ))
                                    }
                                </View>
                            </ScrollView>
                        </View>
                    </View>

                    <TouchableOpacity
                        onPress={() => router.replace('/bookingForm')}
                        disabled={hasEmptySeat}
                        style={[
                            styles.continueBtn,
                            hasEmptySeat ? styles.continueBtnDisabled : styles.continueBtnEnabled,
                        ]}
                    >
                        <Text style={styles.continueBtnText}>Continue</Text>
                    </TouchableOpacity>
                </BottomSheet>
            </View>
        </GestureHandlerRootView>
    );
}




const styles = StyleSheet.create({
    root: { 
        flex: 1, 
        backgroundColor: '#cf2a3a' 
    },
    container: { 
        height: '100%', 
        overflow: 'hidden' 
    },
    header: { 
        height: 100, 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        paddingHorizontal: 20, 
        paddingTop: 20 
    },
    absoluteOverlay: { 
        position: 'absolute', 
        paddingTop: 50, 
        flex: 1 
    },
    vesselTitle: { 
        color: '#fff', 
        fontSize: 16, 
        fontWeight: 'bold', 
        alignSelf: 'center', 
        textAlign: 'center' 
    },
    vesselSubtitle: { 
        textAlign: 'center', 
        color: '#fff', 
        fontSize: 10 
    },
    scrollContent: { 
        paddingBottom: 20 
    },
    vesselContentWrap: { 
        zIndex: 5, 
        position: 'absolute', 
        alignSelf: 'center', 
        alignItems: 'center' 
    },
    totalPaxText: { 
        fontSize: 13, 
        fontWeight: '900', 
        color: '#fff', 
        marginTop: 20, 
        textAlign: 'center' 
    },
    routeCard: {
        width: '80%', 
        backgroundColor: '#FAFAFA', 
        marginTop: 20,
        borderTopLeftRadius: 30, 
        borderTopRightRadius: 30,
        borderBottomLeftRadius: 5, 
        borderBottomRightRadius: 5,
        paddingVertical: 30, 
        paddingHorizontal: 10,
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'space-between',
    },
    routeEndpoint: { 
        flexDirection: 'row', 
        gap: 3, 
        alignItems: 'center'
    },
    routeEndpointText: { 
        fontSize: 12, 
        fontWeight: 'bold', 
        color: '#000' 
    },
    routeIcon: { 
        padding: 3, 
        backgroundColor: '#cf2a3a', 
        borderRadius: 5 
    },
    vesselWrap: { 
        alignSelf: 'center' 
    },
    sheetTitle: { 
        fontSize: 14, 
        fontWeight: 'bold', 
        marginLeft: 20, 
        color: '#474747' 
    },
    sheetSeatBox: { 
        height: 90, 
        borderColor: '#B3B3B3', 
        borderWidth: 1, 
        backgroundColor: '#fff', 
        borderRadius: 8, 
        paddingHorizontal: 8, 
        width: '100%', 
        marginTop: 5 
    },
    sheetSeatScroll: { 
        flex: 1, 
        paddingTop: 10, 
        paddingBottom: 20 
    },
    sheetSeatRow: { 
        flexDirection: 'row', 
        flexWrap: 'wrap', 
        gap: 12 
    },
    seatItemWrap: { 
        position: 'relative' 
    },
    seatRemoveBtn: { 
        position: 'absolute', 
        top: -10, 
        right: -9, 
        zIndex: 3 
    },
    seatButton: { 
        borderWidth: 1, 
        borderRadius: 5, 
        width: 50,
        height: 50, 
        justifyContent: 'center' 
    },
    seatButtonNormal: { 
        borderColor: '#000', 
        backgroundColor: 'transparent' 
    },
    seatButtonError: { 
        borderColor: '#cf2a3a', 
        backgroundColor: '#cf2a3b3d' 
    },
    seatButtonText: { 
        textAlign: 'center', 
        fontWeight: 'bold', 
        fontSize: 16, 
        color: '#000' 
    },
    continueBtn: { 
        width: '95%', 
        alignSelf: 'center', 
        borderRadius: 8, 
        paddingVertical: 15, 
        marginTop: 15, 
        backgroundColor: '#cf2a3a' 
    },
    continueBtnDisabled: { 
        opacity: 0.5 
    },
    continueBtnEnabled: { 
        opacity: 1 
    },
    continueBtnText: { 
        fontSize: 16, 
        fontWeight: 'bold', 
        textAlign: 'center', 
        color: '#fff' 
    },
    sheetPadding: { 
        paddingHorizontal: 10 
    },
    hiddenPassesBtn: { 
        opacity: 0 
    },
    visiblePassesBtn: { 
        opacity: 1 
    },
});