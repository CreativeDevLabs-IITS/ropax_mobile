import { FetchCargoProps } from '@/api/cargoProps';
import { FetchTotalBookings } from "@/api/totalBookings";
import { FetchTrips } from "@/api/trips";
import CargoComponent from "@/components/cargo";
import PreLoader from '@/components/preloader';
import { CargoProperties, useCargo } from "@/context/cargoProps";
import { usePassengers } from "@/context/passenger";
import { useTrip } from "@/context/trip";
import { seatRemoval } from "@/utils/channel";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Animated, Modal, RefreshControl, ScrollView, Text, TouchableOpacity, useWindowDimensions, View } from "react-native";
import { Calendar } from 'react-native-calendars';
import { GestureHandlerRootView, Pressable } from 'react-native-gesture-handler';

export type TripProps = {
    trip_id: number;
    departure: string;
    vessel: string;
    specific_days: string;
    route_origin: string;
    route_destination: string;
    departure_time: string;
    vessel_id: number;
    route_id: number;
    code: string;
    web_code: string;
    mobile_code: string;
    isCargoable: number;
    hasDeparted: boolean;
}

type TotalBookingProps = {
    station: string;
    color: string;
    count: number;
    accommodationGroup: {
        accommodation: string;
        passenger: {
            type: string;
            passenger_count: number;
        }[];
    }[];
}

type PaxTypeProps = {
    paxTypeID: number;
    paxType: string;
}

type AccommodationProps = {
    accomtTypeID: number;
    accomType: string;
}

const bookingTypes = [
    { type: 'Walk-In', icon: 'walk' },
    { type: 'Cargo', icon: 'truck-cargo-container' }
];

export default function ManualBooking() {
    const { id, setRouteID, setVessel, setID, setOrigin, setDestination, setVesselID, setCode, setWebCode, setDepartureTime, setDepartureDate, setMobileCode, setIsCargoable } = useTrip();
    const { passengers, clearPassengers } = usePassengers();
    const { setCargoProperties } = useCargo();
    const { height, width } = useWindowDimensions();
    const [bookingType, setBookingType] = useState<string>('Walk-In');
    const [trips, setTrips] = useState<TripProps[] | null>(null);
    const [totalBookings, setTotalBookings] = useState<TotalBookingProps[] | null>(null);
    const [totalPayingCount, setTotalPayingCount] = useState<number>(0);
    const [paxTypes, setPaxTypes] = useState<PaxTypeProps[] | null>(null);
    const [accomTypes, setAccomTypes] = useState<AccommodationProps[] | null>(null);
    const [contentLoading, setContentLoading] = useState(true);
    const [loading, setLoading] = useState(false);
    const [refresh, setRefresh] = useState(false);
    const [calendar, setCalendar] = useState(false);
    const [tripDate, setTripDate] = useState('');
    const [formattedDate, setFormattedDate] = useState('');
    const [onDateChange, setOnDateChange] = useState(new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" }));
    const [expanded, setExpanded] = useState(false);
    const [totalSheetLoading, setTotalSheetLoading] = useState(false);
    const [bottomSheetTripID, setBottomSheetTripID] = useState<number | null>(null);
    const [cargoReady, setCargoReady] = useState(false);
    const translateY = useRef(new Animated.Value(height + 50)).current;
    const fadeInAnim = useRef(new Animated.Value(0)).current;

    const tripsRef = useRef(trips);
    useEffect(() => { tripsRef.current = trips; }, [trips]);

    useEffect(() => {
        setContentLoading(true);
        const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
        setTripDate(today);

        const date = new Date(today);
        const options: Intl.DateTimeFormatOptions = {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            timeZone: 'Asia/Manila'
        }

        const formattedDate = date.toLocaleDateString('en-US', options);
        const day = date.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'Asia/Manila' });
        const queryDate = `${formattedDate} (${day})`;

        setFormattedDate(queryDate);
        handleFetchTrips(today);
        handleFetchCargoProps();
    }, [])

    useEffect(() => {
        if (!tripsRef.current?.length) {
            const interval = setInterval(handleTimeChecker, 60 * 60 * 1000)
            return () => clearInterval(interval)
        }
    }, [])

    const handleFetchCargoProps = async () => {
        try {
            const cargoPropsResponse = await FetchCargoProps();
            if (cargoPropsResponse) {
                setCargoProperties(cargoPropsResponse as CargoProperties);
                setCargoReady(true);
            }
        } catch (error) {
            console.log('Cargo props error:', error);
        }
    }

    const handleTimeChecker = useCallback(() => {
        const dateTime = new Date(
            new Date().toLocaleString("en-CA", { timeZone: "Asia/Manila" })
        );
        const toISODate = dateTime.toLocaleDateString("en-CA", { timeZone: 'Asia/Manila' });

        setTrips(prev => {
            if (!prev) return prev;
            return prev.map(trip => {
                if (toISODate != trip.specific_days) return trip;
                if (!trip.departure_time) return trip;

                const parts = trip.departure_time.split(":");
                if (parts.length < 2) return trip;

                const hours = Number(parts[0]);
                const minutes = Number(parts[1]);

                if (isNaN(hours) || isNaN(minutes)) return trip;

                const tripTime = new Date(dateTime);
                tripTime.setHours(hours, minutes, 0, 0);

                if (dateTime > tripTime && !trip.hasDeparted) {
                    return { ...trip, hasDeparted: true }
                }
                return trip;
            });
        });
    }, [])

    const handleRefresh = () => {
        setRefresh(true);
        handleFetchCargoProps();
        setBookingType('Walk-In');

        setTimeout(() => {
            const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
            setTripDate(today);
            const date = new Date(today);
            const options: Intl.DateTimeFormatOptions = {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                timeZone: 'Asia/Manila'
            }

            const formattedDate = date.toLocaleDateString('en-US', options);
            const day = date.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'Asia/Manila' });
            const queryDate = `${formattedDate} (${day})`;

            setFormattedDate(queryDate);
            setOnDateChange(today);
            handleFetchTrips(today);
            setRefresh(false);
        }, 1500);
    }

    const handleOnDateSelect = (selectedDate: string) => {
        setContentLoading(true);
        const selected = new Date(selectedDate).toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
        setTripDate(selected);
        const date = new Date(selected);
        const options: Intl.DateTimeFormatOptions = {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            timeZone: 'Asia/Manila'
        }

        const formattedDate = date.toLocaleDateString('en-US', options);
        const day = date.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'Asia/Manila' });
        const queryDate = `${formattedDate} (${day})`;

        const dateSelected = new Date(selectedDate).toISOString().split('T')[0]
        setFormattedDate(queryDate);
        setOnDateChange(dateSelected);
        handleFetchTrips(dateSelected);
    }

    const handleFetchTrips = async (queryDate: string) => {
        try {
            const tripsFetch = await FetchTrips(queryDate);

            if (!tripsFetch || !tripsFetch.data) {
                throw new Error("Invalid API response");
            }

            function verifyTime(timeString: string, specificDay: string): 'scheduled' | 'departed' {
                if (!timeString || !specificDay) return 'scheduled';

                const currentTime = new Date();
                const toISODate = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });

                if (toISODate !== specificDay) return 'scheduled';

                const parts = timeString.split(':');
                if (parts.length < 2) return 'scheduled';

                const hours = Number(parts[0]);
                const minutes = Number(parts[1]);

                if (isNaN(hours) || isNaN(minutes)) return 'scheduled';

                const tripTime = new Date(currentTime);
                tripTime.setHours(hours, minutes, 0, 0);

                const departureAllowance = new Date(tripTime);
                departureAllowance.setHours(departureAllowance.getHours() + 1);

                return currentTime > departureAllowance ? 'departed' : 'scheduled';
            }

            if (!tripsFetch.error) {
                const tripsData: TripProps[] = tripsFetch.data.map((t: any) => {
                    const departureTime = t.trip?.departure_time ?? '';
                    const status = departureTime ? verifyTime(departureTime, t.specific_days) : 'scheduled';

                    return {
                        trip_id: t.id,
                        vessel: t.trip?.vessel?.name ?? 'N/A',
                        specific_days: t.specific_days[0] ?? '',
                        route_origin: t.trip?.route?.origin ?? '',
                        route_destination: t.trip?.route?.destination ?? '',
                        departure_time: departureTime,
                        vessel_id: t.trip?.vessel_id ?? 0,
                        route_id: t.trip?.route_id ?? 0,
                        mobile_code: t.trip?.route?.mobile_code ?? '',
                        web_code: t.trip?.route?.web_code ?? '',
                        code: t.trip?.vessel?.code ?? '',
                        departure: departureTime
                            ? new Date(`1970-01-01T${departureTime}`).toLocaleTimeString('en-US', {
                                hour: 'numeric',
                                minute: '2-digit',
                                hour12: true
                            })
                            : '',
                        isCargoable: t.trip?.vessel?.is_cargoable ?? 0,
                        hasDeparted: status === 'departed'
                    };
                });

                setTrips(tripsData);
                if (tripsData.length > 0) {
                    setBottomSheetTripID(tripsData[0].trip_id ?? null);
                }
            }
        } catch (error: any) {
            console.log("FetchTrips error:", error);
            Alert.alert("Error", error.message || "Something went wrong");
        } finally {
            setContentLoading(false);
        }
    }

    const handleSaveTrip = useCallback(async (vesselName: string, trip_id: number, routeId: number, origin: string, destination: string, mobileCode: string, code: string, web_code: string, departureTime: string, vesselID: number, cargoable: number, departureDate: string) => {
        setLoading(true);

        const stationID = await AsyncStorage.getItem('stationID');

        if (!stationID) {
            setLoading(false);
            Alert.alert('Invalid', 'Station is not set yet.');
            return;
        }

        setTimeout(() => {
            if (trip_id != id) {
                passengers.forEach(passenger => {
                    seatRemoval(passenger?.seatNumber, id)
                });
                setVessel('');
                clearPassengers();
            }

            setVessel(vesselName);
            setID(trip_id);
            setVesselID(vesselID);
            setRouteID(routeId);
            setOrigin(origin);
            setDestination(destination);
            setMobileCode(mobileCode);
            setCode(code);
            setWebCode(web_code);
            setLoading(false);
            setDepartureTime(departureTime);
            setDepartureDate(departureDate);
            setIsCargoable(cargoable);

            router.push('/seatPlan');
        }, 100);
    }, [
        id, passengers, clearPassengers, setVessel, setID, setVesselID, setRouteID,
        setOrigin, setDestination, setMobileCode, setCode, setWebCode,
        setDepartureTime, setDepartureDate, setIsCargoable
    ])

    const toggleSheet = () => {
        if (!bottomSheetTripID) {
            Alert.alert('Oops', 'No trip available');
            return;
        }

        handleFetchTotalBookings(bottomSheetTripID);
        setTotalSheetLoading(true);
        setExpanded(true);

        Animated.spring(translateY, {
            toValue: height / 9,
            useNativeDriver: true
        }).start();
        Animated.timing(fadeInAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true
        }).start();
    }

    const closeToggle = () => {
        setExpanded(false);

        Animated.spring(translateY, {
            toValue: height + 50,
            useNativeDriver: true
        }).start();
        Animated.timing(fadeInAnim, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true
        }).start();
    }

    const handleFetchTotalBookings = async (trip_id: number | null) => {
        try {
            const totalBookingFetch = await FetchTotalBookings(trip_id);

            if (!totalBookingFetch.error) {
                const totalBookingFetchData: TotalBookingProps[] = totalBookingFetch.data.map((t: any) => ({
                    station: t.station,
                    count: t.count,
                    color: t.color,
                    accommodationGroup: t.accommodations.map((a: any) => ({
                        accommodation: a.accommodation,
                        passenger: a.passenger.map((p: any) => ({
                            type: p.type,
                            passenger_count: p.passenger_count
                        }))
                    }))
                }));

                const totalBookingPaxTypes: PaxTypeProps[] = totalBookingFetch.paxTypes.map((p: any) => ({
                    paxTypeID: p.id,
                    paxType: p.passenger_types_code
                }));

                const totalBookingAccomTypes: AccommodationProps[] = totalBookingFetch.accommodationTypes.map((a: any) => ({
                    accomtTypeID: a.id,
                    accomType: a.name
                }));

                setTotalPayingCount(totalBookingFetch.total_paying);
                setTotalBookings(totalBookingFetchData);
                setPaxTypes(totalBookingPaxTypes);
                setAccomTypes(totalBookingAccomTypes);
            }
        } catch (error: any) {
            setTotalSheetLoading(false);
            Alert.alert('Error', error.message);
        } finally {
            setTotalSheetLoading(false);
        }
    }

    return (
        <GestureHandlerRootView style={{ backgroundColor: '#fdfdfd', flex: 1, position: 'relative' }}>
            {calendar && (
                <Modal transparent animationType="slide" onRequestClose={() => setCalendar(false)}>
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
                        <View style={{ width: '80%', backgroundColor: '#fff', padding: 20, borderRadius: 10 }}>
                            <Text style={{ fontSize: 18, fontWeight: 'bold' }}>Select Date</Text>
                            <Calendar
                                minDate={new Date().toISOString().split('T')[0]}
                                onDayPress={(day) => {
                                    setTripDate(day.dateString);
                                    setCalendar(false);
                                    handleOnDateSelect(day.dateString);
                                }}
                                markedDates={{ [tripDate]: { selected: true, selectedColor: '#CF2A3A' } }}
                            />
                            <TouchableOpacity onPress={() => setCalendar(false)} style={{ marginTop: 20, padding: 10, backgroundColor: '#CF2A3A', borderRadius: 5 }}>
                                <Text style={{ color: '#fff', textAlign: 'center' }}>Close Calendar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>
            )}

            <View style={{ paddingTop: 30, height: 100, backgroundColor: '#cf2a3a', paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ color: '#fff', fontSize: 20, fontWeight: 'bold' }}>Manual Booking</Text>
                <View style={{ flexDirection: 'row', gap: 15, alignItems: 'center' }}>
                    <TouchableOpacity onPress={() => setCalendar(true)}>
                        <Ionicons name="calendar" size={25} color={'#fff'} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => toggleSheet()}>
                        <Ionicons name="list" size={30} color={'#fff'} />
                    </TouchableOpacity>
                </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', borderBottomColor: '#FFC107', borderBottomWidth: 1 }}>
                {bookingTypes.map((bt) => (
                    <TouchableOpacity onPress={() => setBookingType(bt.type)} key={bt.type}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 8, justifyContent: 'center', width: '50%', backgroundColor: bookingType == bt.type ? '#FFC107' : '#ffc1071f' }}>
                        <MaterialCommunityIcons name={bt.icon as any} style={{ color: '#000' }} size={20} />
                        <Text style={{ color: '#000', fontWeight: 'bold' }}>{bt.type}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            <View style={{ flex: 1 }}>
                {bookingType != 'Cargo' && (
                    <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 15, paddingTop: 20 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                            <Text style={{ fontSize: 18, fontWeight: 'bold',color: '#000' }}>Available Trip</Text>
                            <Text style={{ fontSize: 15, fontWeight: 'bold', color: '#000' }}>{formattedDate ? formattedDate.split('(')[0] : ''}</Text>
                        </View>
                        <PreLoader loading={loading} />
                    </View>
                )}

                <ScrollView
                    scrollEnabled={bookingType == 'Walk-In'}
                    refreshControl={bookingType == 'Cargo' ? undefined : (
                        <RefreshControl refreshing={refresh} onRefresh={handleRefresh} colors={['#cf2a3a']} progressViewOffset={60} />
                    )}
                    showsVerticalScrollIndicator={false}
                    nestedScrollEnabled={true}
                    style={{ flex: 1 }}
                >
                    {bookingType == 'Walk-In' ? (
                        <View style={{ paddingHorizontal: 20, minHeight: height }}>
                            {contentLoading ? (
                                <PreLoader loading={contentLoading} />
                            ) : !trips || trips.length == 0 || !trips.some(t => !t.hasDeparted) ? (
                                <View style={{ height: height / 2, justifyContent: 'center' }}>
                                    <Text style={{ color: '#7A7A85', textAlign: 'center' }}>No Available Trips</Text>
                                </View>
                            ) : (
                                <>
                                    {trips.filter(t => !t.hasDeparted).map((trip) => (
                                        <TouchableOpacity
                                            onPress={() => handleSaveTrip(trip.vessel, trip.trip_id, trip.route_id, trip.route_origin, trip.route_destination, trip.mobile_code, trip.code, trip.web_code, trip.departure_time, trip.vessel_id, trip.isCargoable, trip.specific_days)}
                                            key={trip.trip_id}
                                            style={{ elevation: 5, backgroundColor: '#fff', borderRadius: 10, marginTop: 12, flexDirection: 'row', alignItems: 'center' }}>
                                            <View style={{ height: '100%', borderTopLeftRadius: 10, borderBottomLeftRadius: 10, width: 5, backgroundColor: '#cf2a3a' }} />
                                            <View style={{ width: '78%', paddingHorizontal: 15, paddingVertical: 20 }}>
                                                <Text style={{ fontWeight: 'bold', fontSize: 13, color: '#cf2a3a' }}>{trip.departure}</Text>
                                                <Text style={{ fontWeight: 'bold', fontSize: 13, color: '#000' }}>{`${trip.route_origin}  >  ${trip.route_destination}`}</Text>
                                                <Text style={{ fontWeight: 'bold', fontSize: 13, color: '#000' }}>{`[ ${trip.vessel} ]`}</Text>
                                            </View>
                                            <Ionicons name="chevron-forward" size={18} style={{ marginLeft: 30 }} />
                                        </TouchableOpacity>
                                    ))}
                                    {trips.some(t => t.hasDeparted) && (
                                        <>
                                            <Text style={{ color: '#7A7A85', marginTop: 40, fontWeight: 'bold' }}>Departed</Text>
                                            {trips.filter(t => t.hasDeparted).map((trip) => (
                                                <View key={trip.trip_id} style={{ paddingHorizontal: 15, paddingVertical: 20, backgroundColor: '#fff', opacity: 0.5, borderRadius: 10, marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                                    <View>
                                                        <Text style={{ fontWeight: 'bold', fontSize: 15, color: '#cf2a3a' }}>{trip.departure}</Text>
                                                        <Text style={{ fontWeight: 'bold', fontSize: 15, color: '#000' }}>{`${trip.route_origin}  >  ${trip.route_destination}`}</Text>
                                                        <Text style={{ fontWeight: 'bold', fontSize: 15, color: '#000' }}>{`[ ${trip.vessel} ]`}</Text>
                                                    </View>
                                                    <Ionicons name="chevron-forward" size={18} />
                                                </View>
                                            ))}
                                            
                                        </>
                                    )}
                                </>
                            )}
                        </View>
                    ) : (
                        <View style={{ flex: 1 }}>
                            {cargoReady ? (
                                <CargoComponent dateChange={onDateChange} />
                            ) : (
                                <PreLoader loading={true} />
                            )}
                        </View>
                    )}
                </ScrollView>
            </View>

            {expanded && (
                <Animated.View style={{ opacity: fadeInAnim, position: 'absolute', zIndex: 9 }}>
                    <TouchableOpacity onPress={() => closeToggle()} style={{ backgroundColor: '#00000065', width, height }} />
                </Animated.View>
            )}

            <Animated.View style={{ position: 'absolute', bottom: 0, backgroundColor: '#fff', width, height: height * 0.9, transform: [{ translateY }], borderTopRightRadius: 20, borderTopLeftRadius: 20, zIndex: 10 }}>
                <View style={{ padding: 10, flex: 1 }}>
                    {totalSheetLoading ? (
                        <PreLoader loading={totalSheetLoading} />
                    ) : (
                        <>
                            <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                                <View>
                                    {trips && trips.length > 0 && (
                                        <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#000' }}>Available Trips</Text>
                                    )}
                                </View>
                                <TouchableOpacity onPress={() => closeToggle()} style={{ alignSelf: 'flex-end' }}>
                                    <Ionicons name={'chevron-down'} size={30} color={'#cf2a3a'} />
                                </TouchableOpacity>
                            </View>
                            {trips && trips.length > 0 ? (
                                <>
                                    <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap', paddingTop: 5 }}>
                                        {trips.map((trip) => (
                                            <TouchableOpacity
                                                onPress={() => { setTotalSheetLoading(true); setBottomSheetTripID(trip.trip_id); handleFetchTotalBookings(trip.trip_id); }}
                                                key={trip.trip_id}
                                                style={{ paddingHorizontal: 12, paddingVertical: 8, backgroundColor: bottomSheetTripID == trip.trip_id ? '#cf2a3a' : '#fff', borderRadius: 5, flexDirection: 'row', alignItems: 'center', borderColor: '#cf2a3a', borderWidth: 1 }}>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                                                    <Text style={{ fontWeight: 'bold', fontSize: 12, color: bottomSheetTripID == trip.trip_id ? '#fff' : '#000' }}>{`${trip.mobile_code} [ ${trip.code} ]`}</Text>
                                                    <Text style={{ fontWeight: 'bold', fontSize: 13, color: bottomSheetTripID == trip.trip_id ? '#fff' : '#cf2a3a' }}>{trip.departure}</Text>
                                                </View>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                    <ScrollView style={{ marginTop: 20 }} showsVerticalScrollIndicator={false}>
                                        <Text style={{ fontWeight: 'bold', paddingBottom: 10, fontSize: 18, color: '#cf2a3a', marginBottom: 10, borderBottomColor: '#b4b4b4ff', borderBottomWidth: 1 }}>{totalPayingCount} TOTAL PAYING PASSENGERS</Text>
                                        <View style={{ gap: 15 }}>
                                            {totalBookings?.map((tb, index) => (
                                                <View key={index} style={{ paddingBottom: 10, borderBottomColor: '#b4b4b4ff', borderBottomWidth: 1 }}>
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                                                        <View style={{ backgroundColor: tb.color, height: 15, width: 15 }} />
                                                        <Text style={{ fontWeight: 'bold', fontSize: 17, color: '#000' }}>{tb.station}</Text>
                                                        <Text style={{ color: '#5c5c5cff', fontSize: 12, }}>{`[${tb.count} paying passenger/s]`}</Text>
                                                    </View>
                                                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginTop: 5 }}>
                                                        {accomTypes?.map((accomType) => (
                                                            <View key={accomType.accomtTypeID} style={{ flexDirection: 'column', width: '50%' }}>
                                                                <Text style={{ fontWeight: 'bold', color: '#000' }}>{accomType.accomType}</Text>
                                                                {tb.accommodationGroup
                                                                    .filter(g => g.accommodation == accomType.accomType)
                                                                    .map((accom, accomIndex) => (
                                                                        <View key={accomIndex}>
                                                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                                                                                {paxTypes?.map((type) => {
                                                                                    const matches = accom.passenger.filter(pax => pax.type == type.paxType);
                                                                                    if (matches.length < 1) return null;
                                                                                    return (
                                                                                        <View key={type.paxTypeID}>
                                                                                            {matches.map((p, pIndex) => (
                                                                                                <View key={pIndex} style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                                                                    <Text style={{ color: '#5c5c5cff', fontSize: 12 }}>{p.type}: </Text>
                                                                                                    <Text style={{ color: '#5c5c5cff', fontSize: 12 }}>{p.passenger_count}</Text>
                                                                                                </View>
                                                                                            ))}
                                                                                        </View>
                                                                                    );
                                                                                })}
                                                                            </View>
                                                                        </View>
                                                                    ))}
                                                            </View>
                                                        ))}
                                                    </View>
                                                </View>
                                            ))}
                                        </View>
                                    </ScrollView>
                                </>
                            ) : (
                                <View style={{ flex: 1, justifyContent: 'center' }}>
                                    <Text style={{ color: '#7A7A85', textAlign: 'center' }}>No Available Trips</Text>
                                </View>
                            )}
                        </>
                    )}
                </View>
            </Animated.View>

            {bookingType == 'Walk-In' && (
                <Pressable onPress={() => router.push('/scanner')} style={{ position: 'absolute', bottom: 20, right: 20, padding: 18, backgroundColor: '#cf2a3a', borderRadius: 50, elevation: 3 }}>
                    <MaterialCommunityIcons name={'qrcode-scan'} size={28} color={'#fff'} />
                </Pressable>
            )}
        </GestureHandlerRootView>
    );
}