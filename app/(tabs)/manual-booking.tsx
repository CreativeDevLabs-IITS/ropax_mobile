import { FetchCargoProps } from '@/api/cargoProps';
import { FetchTotalBookings } from "@/api/totalBookings";
import { FetchTrips } from "@/api/trips";
import CargoComponent from "@/components/cargo";
import PreLoader from '@/components/preloader';
import { useBleManager } from '@/context/BLEManager';
import { CargoProperties, useCargo } from "@/context/cargoProps";
import { usePassengers } from "@/context/passenger";
import { useTrip } from "@/context/trip";
import { seatRemoval } from "@/utils/channel";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Animated, Modal, PermissionsAndroid, Platform, RefreshControl, ScrollView, Text, TouchableOpacity, useWindowDimensions, View } from "react-native";
import { Device } from 'react-native-ble-plx';
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
    station_id?: number;
    color: string;
    count: number;
    accommodationGroup: {
        accommodation: string;
        passenger: {
            type: string;
            passenger_count: number;
            pax_fare: number;
            total_amount: number;
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
    const { connectedDevice, connectedDeviceId, bleManager, setConnectedDevice, setConnectedDeviceId } = useBleManager();
    const { height, width } = useWindowDimensions();

    const [stationID, setStationId] = useState<number | null>(null);
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

    // ── BLE state ────────────────────────────────────────────────
    const [bleDevices, setBleDevices] = useState<Device[]>([]);
    const [bleModalVisible, setBleModalVisible] = useState(false);
    const [scanning, setScanning] = useState(false);
    const [bleLoading, setBleLoading] = useState(false);
    const [showDisconnect, setShowDisconnect] = useState(false);

    const translateY = useRef(new Animated.Value(height + 50)).current;
    const fadeInAnim = useRef(new Animated.Value(0)).current;
    const scanTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isMountedRef = useRef(true);
    const tripsRef = useRef(trips);

    useEffect(() => { tripsRef.current = trips; }, [trips]);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);
            bleManager?.stopDeviceScan();
        };
    }, []);

    useEffect(() => {
        setContentLoading(true);
        const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
        setTripDate(today);

        const date = new Date(today);
        const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Manila' };
        const formattedDate = date.toLocaleDateString('en-US', options);
        const day = date.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'Asia/Manila' });
        setFormattedDate(`${formattedDate} (${day})`);
        handleFetchTrips(today);
        handleFetchCargoProps();
        handleFetchStationID();
    }, []);

    useEffect(() => {
        const reConnect = async () => {
            if (!connectedDeviceId || connectedDevice) return;
            try {
                await connectToADevice(connectedDeviceId);
            } catch {
                setConnectedDevice(null);
            } finally {
                setBleLoading(false);
            }
        };
        reConnect();
    }, [connectedDeviceId]);

    useEffect(() => {
        return () => {
            if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);
            bleManager?.stopDeviceScan();
        };
    }, []);

    useEffect(() => {
        if (!tripsRef.current?.length) {
            const interval = setInterval(handleTimeChecker, 60 * 60 * 1000);
            return () => clearInterval(interval);
        }
    }, []);

    useEffect(() => {
        return () => {
            translateY.stopAnimation();
            fadeInAnim.stopAnimation();
            translateY.removeAllListeners();
            fadeInAnim.removeAllListeners();
        };
    }, []);

    const requestBlePermissions = async (): Promise<boolean> => {
        if (Platform.OS === 'android') {
            const granted = await PermissionsAndroid.requestMultiple([
                PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
                PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
                PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            ]);
            return Object.values(granted).every(s => s === PermissionsAndroid.RESULTS.GRANTED);
        }
        return true;
    };

    const startScan = async () => {
        const hasPermission = await requestBlePermissions();
        if (!hasPermission) {
            Alert.alert('Permission denied', 'Bluetooth permissions are required to print.');
            return;
        }

        setBleDevices([]);
        setScanning(true);
        setBleModalVisible(true);

        bleManager.startDeviceScan(null, null, (error, device) => {
            if (error) { setScanning(false); return; }
            if (device?.name) {
                setBleDevices(prev => prev.some(d => d.id === device.id) ? prev : [...prev, device]);
            }
        });

        scanTimeoutRef.current = setTimeout(() => {
            bleManager.stopDeviceScan();
            setScanning(false);
        }, 10000);
    };

    const connectToADevice = async (deviceId: string) => {
        try {
            setBleLoading(true);
            bleManager.stopDeviceScan();
            const connected = await bleManager.connectToDevice(deviceId);
            await connected.discoverAllServicesAndCharacteristics();
            setConnectedDevice(connected);
            setConnectedDeviceId(deviceId);
            setBleModalVisible(false);
            Alert.alert('Connected', 'Connected to a device');
        } catch (error: any) {
            Alert.alert('Connection failed', error.message);
        } finally {
            setBleLoading(false);
        }
    };

    const handleDisconnect = useCallback(() => {
        setConnectedDevice(null);
        setConnectedDeviceId(null);
        setShowDisconnect(false);
    }, []);

    const sendBytesToPrinter = async (printData: Uint8Array) => {
        if (!connectedDevice) {
            Alert.alert('No printer connected', 'Please connect to a Bluetooth printer first.');
            startScan();
            return;
        }

        try {
            setBleLoading(true);

            const services = await connectedDevice.services();
            let printCharacteristic = null;

            for (const service of services) {
                const characteristics = await service.characteristics();
                for (const char of characteristics) {
                    if (char.isWritableWithResponse || char.isWritableWithoutResponse) {
                        printCharacteristic = char;
                        break;
                    }
                }
                if (printCharacteristic) break;
            }

            if (!printCharacteristic) {
                Alert.alert('Error', 'No writable characteristic found on this printer.');
                return;
            }

            const toBase64 = (chunk: Uint8Array): string => {
                let binary = '';
                chunk.forEach(b => (binary += String.fromCharCode(b)));
                return btoa(binary);
            };

            const chunkSize = 200;
            for (let i = 0; i < printData.length; i += chunkSize) {
                const chunk = printData.slice(i, i + chunkSize);
                const base64Chunk = toBase64(chunk);
                if (printCharacteristic.isWritableWithResponse) {
                    await printCharacteristic.writeWithResponse(base64Chunk);
                } else {
                    await printCharacteristic.writeWithoutResponse(base64Chunk);
                }
                await new Promise(resolve => setTimeout(resolve, 50));
            }

            Alert.alert('Success', 'Report printed successfully!');
        } catch (error: any) {
            Alert.alert('Print failed', error.message);
        } finally {
            setBleLoading(false);
        }
    };

    const buildReportPrintBytes = useCallback((printableData: TotalBookingProps, tripInfo: TripProps | undefined): Uint8Array => {
        const ESC = 0x1B;
        const GS  = 0x1D;
        const LF  = 0x0A;

        const bytes: number[] = [];
        const push = (...b: number[]) => bytes.push(...b);

        const pushStr = (str: string) => {
            for (let i = 0; i < str?.length; i++) bytes.push(str.charCodeAt(i) & 0xFF);
        };

        const padLeft = (text: any, w: number) => {
            const s = text == null ? '' : String(text);
            return s.length >= w ? s : ' '.repeat(w - s.length) + s;
        };

        const padRight = (text: any, w: number) => {
            const s = text == null ? '' : String(text);
            return s.length >= w ? s : s + ' '.repeat(w - s.length);
        };

        const println  = (str: string) => { pushStr(str); push(LF); };
        const alignCenter = () => push(ESC, 0x61, 0x01);
        const alignLeft   = () => push(ESC, 0x61, 0x00);
        const boldOn      = () => push(ESC, 0x45, 0x01);
        const boldOff     = () => push(ESC, 0x45, 0x00);
        const fontNormal  = () => push(GS, 0x21, 0x00);

        push(ESC, 0x40);
        alignCenter();
        boldOn();
        println('LEOPARDS');
        println('MOTORBOAT SERVICE');
        push(LF);
        boldOff();
        println('BOOKING REPORT');
        println('--------------------------------');

        alignLeft();
        println(padRight('Station:', 16) + padLeft(printableData.station ?? '', 16));

        if (tripInfo) {
            println(padRight('Route:', 16) + padLeft(tripInfo.mobile_code ?? '', 16));
            println(padRight('Vessel:', 16) + padLeft(tripInfo.vessel ?? '', 16));
            println(padRight('Departure:', 16) + padLeft(tripInfo.departure ?? '', 16));
        }

        println('--------------------------------');

        const bClassGroup = printableData.accommodationGroup.filter(g =>
            ['Business Class', 'B-Class', 'B Class', 'Deluxe', 'Deluxe Class'].includes(g.accommodation)
        );

        boldOn(); println('B-CLASS ACCOMMODATION:'); boldOff();

        if (bClassGroup.length > 0) {
            let bClassTotal = 0;
            bClassGroup.forEach(g => {
                g.passenger.forEach(p => {
                    println(
                        padRight(`${p.type}`, 14) +
                        padRight(`x${p.passenger_count}`, 8) +
                        padLeft(`P${Number(p.total_amount).toFixed(2)}`, 10)
                    );
                    bClassTotal += Number(p.total_amount);
                });
            });
            push(LF);
            println(padRight('  Subtotal:', 24) + padLeft(`P${bClassTotal.toFixed(2)}`, 8));
        } else {
            println('  No booking');
        }

        push(LF);
        println('--------------------------------');

        const touristGroup = printableData.accommodationGroup.filter(g => g.accommodation === 'Tourist');

        boldOn(); println('TOURIST ACCOMMODATION:'); boldOff();

        if (touristGroup.length > 0) {
            let touristTotal = 0;
            touristGroup.forEach(g => {
                g.passenger.forEach(p => {
                    println(
                        padRight(`${p.type}`, 14) +
                        padRight(`x${p.passenger_count}`, 8) +
                        padLeft(`P${Number(p.total_amount).toFixed(2)}`, 10)
                    );
                    touristTotal += Number(p.total_amount);
                });
            });
            push(LF);
            println(padRight('  Subtotal:', 24) + padLeft(`P${touristTotal.toFixed(2)}`, 8));
        } else {
            println('  No booking');
        }

        push(LF);
        println('--------------------------------');

        const cargoGroup = (printableData as any).cargo ?? [];

        boldOn(); println('CARGO:'); boldOff();

        if (cargoGroup.length > 0) {
            let cargoTotal = 0;
            cargoGroup.forEach((c: any) => {
                const desc = c.cargoType === 'Rolling Cargo'
                    ? `${c.cargoBrand} ${c.cargoSpecification}`
                    : c.parcelCategory;
                println(`${c.quantity}x ${desc} - P${Number(c.cargoAmount).toFixed(2)}`);
                cargoTotal += Number(c.cargoAmount);
            });
            push(LF);
            println(padRight('  Subtotal:', 24) + padLeft(`P${cargoTotal.toFixed(2)}`, 8));
        } else {
            println('  No booking');
        }

        push(LF);
        println('--------------------------------');

        const bTotal = bClassGroup.flatMap(g => g.passenger).reduce((s, p) => s + Number(p.total_amount), 0);
        const tTotal = touristGroup.flatMap(g => g.passenger).reduce((s, p) => s + Number(p.total_amount), 0);
        const cTotal = cargoGroup.reduce((s: number, c: any) => s + Number(c.cargoAmount ?? 0), 0);
        const grandTotal = bTotal + tTotal + cTotal;

        boldOn(); println('SUMMARY:'); boldOff();
        println(padRight('B-Class Total:', 20)  + padLeft(`P${bTotal.toFixed(2)}`, 12));
        println(padRight('Tourist Total:', 20)   + padLeft(`P${tTotal.toFixed(2)}`, 12));
        println(padRight('Cargo Total:', 20)     + padLeft(`P${cTotal.toFixed(2)}`, 12));
        println('--------------------------------');
        boldOn();
        println(padRight('GRAND TOTAL:', 20) + padLeft(`P${grandTotal.toFixed(2)}`, 12));
        boldOff();
        println('--------------------------------');

        fontNormal();
        push(LF, LF, LF, LF, LF, LF);
        push(GS, 0x56, 0x41, 0x00);

        return new Uint8Array(bytes);
    }, []);

    const handlePrintReport = useCallback(async () => {
        if (!stationID) {
            Alert.alert('Invalid', 'Station is not set yet.');
            return;
        }

        if (!totalBookings || totalBookings.length === 0) {
            Alert.alert('Invalid', 'No booking data available. Please load a trip first.');
            return;
        }

        const printableData = totalBookings.find(t => t.station_id == stationID);

        if (!printableData) {
            Alert.alert('Invalid', 'No booking data found for this station.');
            return;
        }

        if (!connectedDevice) {
            Alert.alert('No printer connected', 'Please connect to a Bluetooth printer first.');
            startScan();
            return;
        }

        const tripInfo = trips?.find(t => t.trip_id === bottomSheetTripID);
        const reportBytes = buildReportPrintBytes(printableData, tripInfo);
        await sendBytesToPrinter(reportBytes);
    }, [stationID, totalBookings, connectedDevice, trips, bottomSheetTripID, buildReportPrintBytes]);

    const handleFetchStationID = useCallback(async () => {
        if (stationID) return;
        const storedStationID = await AsyncStorage.getItem('stationID');
        if (!storedStationID) return;
        setStationId(Number(storedStationID));
    }, []);

    const handleFetchCargoProps = async () => {
        try {
            const cargoPropsResponse = await FetchCargoProps();
            if (cargoPropsResponse) {
                setCargoProperties(cargoPropsResponse as CargoProperties);
                setCargoReady(true);
            }
        } catch (error) {
            console.log('Error', error);
        }
    };

    const handleTimeChecker = useCallback(() => {
        const dateTime = new Date(new Date().toLocaleString("en-CA", { timeZone: "Asia/Manila" }));
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
                if (dateTime > tripTime && !trip.hasDeparted) return { ...trip, hasDeparted: true };
                return trip;
            });
        });
    }, []);

    const handleRefresh = () => {
        setRefresh(true);
        handleFetchCargoProps();
        setBookingType('Walk-In');
        setTimeout(() => {
            const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
            setTripDate(today);
            const date = new Date(today);
            const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Manila' };
            const formattedDate = date.toLocaleDateString('en-US', options);
            const day = date.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'Asia/Manila' });
            setFormattedDate(`${formattedDate} (${day})`);
            setOnDateChange(today);
            handleFetchTrips(today);
            setRefresh(false);
        }, 1500);
    };

    const handleOnDateSelect = (selectedDate: string) => {
        setContentLoading(true);
        const selected = new Date(selectedDate).toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
        setTripDate(selected);
        const date = new Date(selected);
        const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Manila' };
        const formattedDate = date.toLocaleDateString('en-US', options);
        const day = date.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'Asia/Manila' });
        const dateSelected = new Date(selectedDate).toISOString().split('T')[0];
        setFormattedDate(`${formattedDate} (${day})`);
        setOnDateChange(dateSelected);
        handleFetchTrips(dateSelected);
    };

    const handleFetchTrips = async (queryDate: string) => {
        try {
            const tripsFetch = await FetchTrips(queryDate);
            if (!tripsFetch || !tripsFetch.data) throw new Error("Invalid API response");

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
                            ? new Date(`1970-01-01T${departureTime}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
                            : '',
                        isCargoable: t.trip?.vessel?.is_cargoable ?? 0,
                        hasDeparted: status === 'departed'
                    };
                });
                setTrips(tripsData);
                if (tripsData.length > 0) setBottomSheetTripID(tripsData[0].trip_id ?? null);
            }
        } catch (error: any) {
            Alert.alert("Error", error.message || "Something went wrong");
        } finally {
            setContentLoading(false);
        }
    };

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
                passengers.forEach(passenger => { seatRemoval(passenger?.seatNumber, id); });
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
    }, [id, passengers, clearPassengers, setVessel, setID, setVesselID, setRouteID, setOrigin, setDestination, setMobileCode, setCode, setWebCode, setDepartureTime, setDepartureDate, setIsCargoable]);

    const toggleSheet = () => {
        if (!bottomSheetTripID) { Alert.alert('Oops', 'No trip available'); return; }
        handleFetchTotalBookings(bottomSheetTripID);
        setTotalSheetLoading(true);
        setExpanded(true);
        Animated.spring(translateY, { toValue: height / 9, useNativeDriver: true }).start();
        Animated.timing(fadeInAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    };

    const closeToggle = () => {
        setExpanded(false);
        Animated.spring(translateY, { toValue: height + 50, useNativeDriver: true }).start();
        Animated.timing(fadeInAnim, { toValue: 0, duration: 500, useNativeDriver: true }).start();
    };

    const handleFetchTotalBookings = async (trip_id: number | null) => {
        try {
            const totalBookingFetch = await FetchTotalBookings(trip_id);
            if (!totalBookingFetch.error) {
                const totalBookingFetchData: TotalBookingProps[] = totalBookingFetch.data.map((t: any) => ({
                    station: t.station,
                    station_id: t.station_id,
                    count: t.count,
                    color: t.color,
                    accommodationGroup: t.accommodations.map((a: any) => ({
                        accommodation: a.accommodation,
                        passenger: a.passenger.map((p: any) => ({
                            type: p.type,
                            passenger_count: p.passenger_count,
                            pax_fare: p.pax_fare,
                            total_amount: p.total_amount
                        }))
                    }))
                }));
                const totalBookingPaxTypes: PaxTypeProps[] = totalBookingFetch.paxTypes.map((p: any) => ({ paxTypeID: p.id, paxType: p.passenger_types_code }));
                const totalBookingAccomTypes: AccommodationProps[] = totalBookingFetch.accommodationTypes.map((a: any) => ({ accomtTypeID: a.id, accomType: a.name }));
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
    };

    return (
        <GestureHandlerRootView style={{ backgroundColor: '#fdfdfd', flex: 1, position: 'relative' }}>
            <PreLoader loading={bleLoading} />

            <Modal transparent animationType="slide" visible={bleModalVisible}>
                <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: height * 0.6 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#000' }}>Select Printer</Text>
                            <TouchableOpacity onPress={() => { bleManager?.stopDeviceScan(); setBleModalVisible(false); }}>
                                <Ionicons name="close" size={24} color="#cf2a3a" />
                            </TouchableOpacity>
                        </View>
                        {scanning && (
                            <Text style={{ color: '#cf2a3a', textAlign: 'center', marginBottom: 10 }}>Scanning for devices...</Text>
                        )}
                        <ScrollView>
                            {bleDevices.length === 0 && !scanning ? (
                                <Text style={{ color: '#999', textAlign: 'center', marginTop: 20 }}>No devices found. Try scanning again.</Text>
                            ) : (
                                bleDevices.map(device => (
                                    <TouchableOpacity
                                        key={device?.id}
                                        onPress={() => connectToADevice(device.id)}
                                        style={{ padding: 15, borderBottomColor: '#dadada', borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                        <Ionicons name="print" size={20} color="#cf2a3a" />
                                        <View>
                                            <Text style={{ fontWeight: 'bold' }}>{device.name}</Text>
                                            <Text style={{ fontSize: 12, color: '#999' }}>{device?.id}</Text>
                                        </View>
                                    </TouchableOpacity>
                                ))
                            )}
                        </ScrollView>
                        <TouchableOpacity
                            onPress={startScan}
                            style={{ backgroundColor: '#cf2a3a', padding: 12, borderRadius: 8, marginTop: 15 }}>
                            <Text style={{ color: '#fff', textAlign: 'center', fontWeight: 'bold', fontSize: 17 }}>
                                {scanning ? 'Scanning...' : 'Scan Again'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {showDisconnect && (
                <View style={{ backgroundColor: '#fff', width: 180, height: 50, padding: 10, justifyContent: 'center', borderRadius: 8, elevation: 5, position: 'absolute', zIndex: 50, right: 20, top: 70 }}>
                    <TouchableOpacity onPress={handleDisconnect} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                        <MaterialCommunityIcons name={'printer-off-outline'} color={'#000'} size={18} />
                        <Text style={{ color: '#000' }}>Disconnect Printer</Text>
                    </TouchableOpacity>
                </View>
            )}

            {calendar && (
                <Modal transparent animationType="slide" onRequestClose={() => setCalendar(false)}>
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
                        <View style={{ width: '80%', backgroundColor: '#fff', padding: 20, borderRadius: 10 }}>
                            <Text style={{ fontSize: 18, fontWeight: 'bold' }}>Select Date</Text>
                            <Calendar
                                onDayPress={(day) => { setTripDate(day.dateString); setCalendar(false); handleOnDateSelect(day.dateString); }}
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
                    {connectedDevice && (
                        <TouchableOpacity onPress={() => setShowDisconnect(!showDisconnect)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Ionicons name="print" size={18} color="#fff" />
                            <Text style={{ color: '#fff', fontSize: 12 }}>{connectedDevice.name}</Text>
                            <Ionicons name="chevron-down" color="#fff" size={16} />
                        </TouchableOpacity>
                    )}
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
                            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#000' }}>Available Trip</Text>
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
                    style={{ flex: 1 }}>
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
                            {cargoReady ? <CargoComponent dateChange={onDateChange} /> : <PreLoader loading={true} />}
                        </View>
                    )}
                </ScrollView>
            </View>

            {expanded && (
                <Animated.View style={{ opacity: fadeInAnim, position: 'absolute', zIndex: 9 }}>
                    <TouchableOpacity onPress={() => closeToggle()} style={{ backgroundColor: '#00000065', width, height }} />
                </Animated.View>
            )}

            <Animated.View style={{ position: 'absolute', bottom: 0, backgroundColor: '#fff', width, height: height * 0.85, transform: [{ translateY }], borderTopRightRadius: 20, borderTopLeftRadius: 20, zIndex: 10 }}>
                <View style={{ padding: 10, flex: 1 }}>
                    {totalSheetLoading ? (
                        <PreLoader loading={totalSheetLoading} />
                    ) : (
                        <View style={{ flex: 1 }}>
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
                                <View style={{ height: '80%' }}>
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
                                    <ScrollView style={{ marginTop: 20, flex: 1 }} showsVerticalScrollIndicator={false}>
                                        <Text style={{ fontWeight: 'bold', paddingBottom: 10, fontSize: 18, color: '#cf2a3a', marginBottom: 10, borderBottomColor: '#b4b4b4ff', borderBottomWidth: 1 }}>{totalPayingCount} TOTAL PAYING PASSENGERS</Text>
                                        <View style={{ gap: 15 }}>
                                            {totalBookings?.map((tb, index) => (
                                                <View key={index} style={{ paddingBottom: 10, borderBottomColor: '#b4b4b4ff', borderBottomWidth: 1 }}>
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                                                        <View style={{ backgroundColor: tb.color, height: 15, width: 15 }} />
                                                        <Text style={{ fontWeight: 'bold', fontSize: 17, color: '#000' }}>{tb.station}</Text>
                                                        <Text style={{ color: '#5c5c5cff', fontSize: 12 }}>{`[${tb.count} paying passenger/s]`}</Text>
                                                    </View>
                                                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginTop: 5 }}>
                                                        {accomTypes?.map((accomType) => (
                                                            <View key={accomType.accomtTypeID} style={{ flexDirection: 'column', width: '50%' }}>
                                                                <Text style={{ fontWeight: 'bold', color: '#000' }}>{accomType.accomType}</Text>
                                                                {tb.accommodationGroup
                                                                    .filter(g => g.accommodation == accomType.accomType)
                                                                    .map((accom, accomIndex) => (
                                                                        <View key={accomIndex}>
                                                                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 5, width: '90%' }}>
                                                                                {paxTypes?.map((type) => {
                                                                                    const matches = accom.passenger.filter(pax => pax.type == type.paxType);
                                                                                    if (matches?.length < 1) return null;
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

                                    <TouchableOpacity
                                        onPress={handlePrintReport}
                                        disabled={bleLoading || totalBookings?.length == 0}
                                        style={{ backgroundColor: '#cf2a3a', paddingVertical: 14, width: '100%', borderRadius: 5, alignItems: 'center', alignSelf: 'center', marginTop: 10, opacity: bleLoading || totalBookings?.length == 0 ? 0.6 : 1 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                            <Ionicons name="print" size={20} color="#fff" />
                                            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>
                                                {connectedDevice ? 'Print Report' : 'Connect & Print Report'}
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <View style={{ flex: 1, justifyContent: 'center' }}>
                                    <Text style={{ color: '#7A7A85', textAlign: 'center' }}>No Available Trips</Text>
                                </View>
                            )}
                        </View>
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