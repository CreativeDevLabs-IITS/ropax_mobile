import { FetchCargoVessel } from '@/api/cargoVessel';
import { useCargo } from '@/context/cargoProps';
import { useTrip } from '@/context/trip';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { Dropdown } from 'react-native-element-dropdown';

const { height, width } = Dimensions.get('window');

type CargoTripProps = {
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
    isCargoable?: boolean;
    hasDeparted?: boolean;
};

export default function CargoComponent({ dateChange }: { dateChange: string }) {
    const {
        setTotalFare, setNote, setRouteID, setVessel, setID,
        setOrigin, setDestination, setVesselID, setCode,
        setWebCode, setDepartureTime, setMobileCode, clearTrip,
    } = useTrip();
    const { cargoProperties, paxCargoProperty, setPaxCargoProperties } = useCargo();

    const [trips, setTrips] = useState<CargoTripProps[] | null>(null);
    const [cargoContentLoading, setCargoContentLoading] = useState(true);
    const [selectedVessel, setSelectedVessel] = useState('');
    const [timeWithRoute, setTimeWithRoute] = useState('');
    const [saveCargoLoading, setSaveCargoLoading] = useState(false);
    const [formLoading, setFormLoading] = useState(true);
    const [formVisible, setFormVisible] = useState(false);

    const tripsAnim = useRef(new Animated.Value(0)).current;   // opacity for trip list
    const formAnim = useRef(new Animated.Value(width)).current; // translateX for form

    // ─── Cargo helpers (index-based, mirrors AddPaxCargo) ────────────────────

    const updateByIndex = useCallback((index: number, patch: Record<string, any>) => {
        setPaxCargoProperties(prev =>
            prev.map((c, i) => (i === index ? { ...c, ...patch } : c))
        );
    }, [setPaxCargoProperties]);

    const handleAddCargo = useCallback(() => {
        setPaxCargoProperties(prev => [...prev, { quantity: 1 }]);
    }, [setPaxCargoProperties]);

    const handleRemoveCargo = useCallback((index: number) => {
        setPaxCargoProperties(prev => prev.filter((_, i) => i !== index));
    }, [setPaxCargoProperties]);

    const handleQuantity = useCallback((op: 'add' | 'minus', index: number) => {
        setPaxCargoProperties(prev =>
            prev.map((c, i) => {
                if (i !== index) return c;
                const next = op === 'add' ? c.quantity + 1 : Math.max(1, c.quantity - 1);
                return { ...c, quantity: next };
            })
        );
    }, [setPaxCargoProperties]);

    const totalAmount = useMemo(
        () => paxCargoProperty.reduce((sum, c) => sum + Number(c.cargoAmount ?? 0), 0),
        [paxCargoProperty]
    );

    useEffect(() => {
        setTotalFare(totalAmount);
    }, [totalAmount]);

    // ─── Date change: reset and re-fetch ─────────────────────────────────────

    useEffect(() => {
        closeFormSheet();
        setCargoContentLoading(true);
        handleFetchTrips(dateChange);
    }, [dateChange]);

    // ─── Hourly departed-status checker ──────────────────────────────────────

    useEffect(() => {
        if (trips && trips.length > 0) {
            const interval = setInterval(handleTimeChecker, 60 * 60 * 1000);
            return () => clearInterval(interval);
        }
    }, [trips]);

    const handleTimeChecker = () => {
        const now = new Date();
        const toISODate = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });

        setTrips(prev =>
            prev?.map(trip => {
                if (toISODate !== trip.specific_days || trip.hasDeparted) return trip;
                const [hours, minutes] = trip.departure_time.split(':').map(Number);
                const tripTime = new Date(now);
                tripTime.setHours(hours, minutes, 0, 0);
                return now > tripTime ? { ...trip, hasDeparted: true } : trip;
            }) ?? null
        );
    };

    // ─── Fetch trips ──────────────────────────────────────────────────────────

    const handleFetchTrips = async (queryDate: string) => {
        try {
            const tripsFetch = await FetchCargoVessel(queryDate);

            if (tripsFetch) {
                const toISODate = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });

                const tripsData: CargoTripProps[] = tripsFetch.data.map((t: any) => {
                    const depTime: string = t.trip?.departure_time ?? '';
                    const [hours, minutes] = depTime.split(':').map(Number);
                    const tripTime = new Date();
                    tripTime.setHours(hours, minutes, 0, 0);
                    const hasDeparted =
                        t.specific_days === toISODate ? new Date() > tripTime : false;

                    return {
                        trip_id: t?.id,
                        vessel: t.trip?.vessel?.name,
                        specific_days: t.specific_days,
                        route_origin: t.trip?.route?.origin,
                        route_destination: t.trip?.route?.destination,
                        departure_time: depTime,
                        vessel_id: t.trip?.vessel_id,
                        route_id: t.trip?.route_id,
                        mobile_code: t.trip?.route?.mobile_code,
                        web_code: t.trip?.route?.web_code,
                        code: t.trip?.vessel?.code,
                        departure: new Date(`1970-01-01T${depTime}`).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true,
                        }),
                        isCargoable: t.trip?.vessel?.is_cargoable,
                        hasDeparted,
                    };
                });

                setTrips(tripsData);
            }
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setCargoContentLoading(false);
        }
    };

    // ─── Sheet animations ─────────────────────────────────────────────────────

    const openFormSheet = () => {
        setFormVisible(true);
        Animated.parallel([
            Animated.timing(tripsAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
            Animated.timing(formAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        ]).start();
    };

    const closeFormSheet = () => {
        Animated.parallel([
            Animated.timing(tripsAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
            Animated.timing(formAnim, { toValue: width, duration: 200, useNativeDriver: true }),
        ]).start(() => {
            setFormVisible(false);
            setFormLoading(true);
            setPaxCargoProperties([]);
            setTotalFare(0);
            setNote('');
        });
    };

    // ─── Trip selection ───────────────────────────────────────────────────────

    const handleTripSelect = (
        vesselName: string,
        trip_id: number,
        routeId: number,
        origin: string,
        destination: string,
        mobileCode: string,
        code: string,
        web_code: string,
        departureTime: string,
        vesselID: number
    ) => {
        clearTrip();

        const departure_time = new Date(`1970-01-01T${departureTime}`).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        });

        setSelectedVessel(vesselName);
        setTimeWithRoute(`${origin}  >  ${destination} | ${departure_time}`);

        // Set all trip context before showing the form to prevent flicker
        setVessel(vesselName);
        setID(trip_id);
        setVesselID(vesselID);
        setRouteID(routeId);
        setOrigin(origin);
        setDestination(destination);
        setMobileCode(mobileCode);
        setCode(code);
        setWebCode(web_code);
        setDepartureTime(departureTime);

        // Seed the first cargo item
        setPaxCargoProperties([{ quantity: 1 }]);

        openFormSheet();

        // Delay only the loading flag so the form slides in before content appears
        setTimeout(() => setFormLoading(false), 220);
    };

    // ─── Proceed / validation ─────────────────────────────────────────────────

    const handleSaveCargo = useCallback(() => {
        setSaveCargoLoading(true);

        setTimeout(() => {
            for (const c of paxCargoProperty) {
                if (c.cargoType === 'Rolling Cargo' && !c.cargoSpecification?.trim()) {
                    Alert.alert('Invalid', 'CC is required.');
                    setSaveCargoLoading(false);
                    return;
                }
                if (c.cargoType === 'Rolling Cargo' && !c.cargoPlateNo?.trim()) {
                    Alert.alert('Invalid', 'Plate number is required.');
                    setSaveCargoLoading(false);
                    return;
                }
                if (c.cargoType === 'Parcel' && !c.parcelCategory?.trim()) {
                    Alert.alert('Invalid', 'Parcel category is required.');
                    setSaveCargoLoading(false);
                    return;
                }
            }
            if (totalAmount === 0) {
                Alert.alert('Invalid', 'Cargo amount is missing.');
                setSaveCargoLoading(false);
                return;
            }

            setSaveCargoLoading(false);
            router.push('/summary');
        }, 500);
    }, [paxCargoProperty, totalAmount]);

    // ─── Render ───────────────────────────────────────────────────────────────

    const availableTrips = trips?.filter(t => !t.hasDeparted) ?? [];

    return (
        <View style={{ height: height - 225 }}>

            {/* ── Trip list ── */}
            <Animated.View style={{ flex: 1, opacity: tripsAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }}>
                <View style={{ paddingHorizontal: 15, paddingTop: 20 }}>
                    {availableTrips.length > 0 && (
                        <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#000' }}>Select Trip</Text>
                    )}
                </View>

                {cargoContentLoading ? (
                    <View style={{ flex: 1, justifyContent: 'center' }}>
                        <ActivityIndicator size="large" color="#cf2a3a" />
                    </View>
                ) : availableTrips.length === 0 ? (
                    <View style={{ flex: 1, justifyContent: 'center' }}>
                        <Text style={{ color: '#7A7A85', textAlign: 'center' }}>No Available Trips</Text>
                    </View>
                ) : (
                    <View style={{ paddingHorizontal: 20 }}>
                        {availableTrips.map(trip => (
                            <TouchableOpacity
                                key={trip.trip_id}
                                onPress={() =>
                                    handleTripSelect(
                                        trip.vessel, trip.trip_id, trip.route_id,
                                        trip.route_origin, trip.route_destination,
                                        trip.mobile_code, trip.code, trip.web_code,
                                        trip.departure_time, trip.vessel_id
                                    )
                                }
                                style={{
                                    elevation: 5, backgroundColor: '#fff', borderRadius: 10,
                                    marginTop: 12, flexDirection: 'row', alignItems: 'center',
                                }}
                            >
                                <View style={{ height: '100%', borderTopLeftRadius: 10, borderBottomLeftRadius: 10, width: 5, backgroundColor: '#cf2a3a' }} />
                                <View style={{ flex: 1, paddingHorizontal: 15, paddingVertical: 20 }}>
                                    <Text style={{ fontWeight: 'bold', fontSize: 13, color: '#cf2a3a' }}>{trip.departure}</Text>
                                    <Text style={{ fontWeight: 'bold', fontSize: 13, color: '#000' }}>
                                        {`${trip.route_origin}  >  ${trip.route_destination} [ ${trip.vessel} ]`}
                                    </Text>
                                </View>
                                <Ionicons name="chevron-forward" size={18} style={{ marginRight: 12, color: '#000' }} />
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
            </Animated.View>

            {/* ── Cargo form sheet ── */}
            {formVisible && (
                <Animated.View
                    style={{
                        transform: [{ translateX: formAnim }],
                        position: 'absolute', top: 0, left: 0,
                        width, height: '100%',
                        backgroundColor: '#fdfdfd',
                        paddingTop: 20,
                    }}
                >
                    {formLoading ? (
                        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                            <ActivityIndicator size="large" color="#cf2a3a" />
                        </View>
                    ) : (
                        <View style={{ flex: 1 }}>

                            {/* Header */}
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                                    <Ionicons
                                        name="boat" color="#fff" size={26}
                                        style={{ backgroundColor: '#cf2a3a', padding: 5, borderRadius: 50 }}
                                    />
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ color: '#747373', fontSize: 11 }} numberOfLines={1}>{timeWithRoute}</Text>
                                        <Text style={{ color: '#cf2a3a', fontSize: 15, fontWeight: '900', marginTop: -2 }} numberOfLines={1}>{selectedVessel}</Text>
                                    </View>
                                </View>

                                <View style={{ flexDirection: 'row', gap: 8, marginLeft: 8 }}>
                                    <TouchableOpacity
                                        onPress={closeFormSheet}
                                        style={{ paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#cf2a3a', borderRadius: 5 }}
                                    >
                                        <Ionicons name="arrow-back" color="#fff" size={18} />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Total row (only when multiple cargo) */}
                            {paxCargoProperty.length > 1 && (
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-end', paddingHorizontal: 16, marginTop: 12 }}>
                                    <Text style={{ fontWeight: 'bold', color: '#545454', fontSize: 16 }}>Total Amount:</Text>
                                    <View style={{ borderBottomColor: '#cf2a3a', borderBottomWidth: 2, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10 }}>
                                        <Text style={{ fontSize: 17, color: '#cf2a3a', fontWeight: 'bold' }}>₱ </Text>
                                        <Text style={{ fontWeight: 'bold', fontSize: 17, color: '#cf2a3a' }}>
                                            {totalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </Text>
                                    </View>
                                </View>
                            )}

                            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                                <ScrollView
                                    keyboardShouldPersistTaps="handled"
                                    showsVerticalScrollIndicator={false}
                                    contentContainerStyle={{ paddingHorizontal: 10, paddingBottom: 120 }}
                                    nestedScrollEnabled
                                >
                                    {/* Add cargo button */}
                                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 }}>
                                        <TouchableOpacity
                                            onPress={handleAddCargo}
                                            style={{ backgroundColor: '#cf2a3a', padding: 10, borderRadius: 5, flexDirection: 'row', gap: 5, alignItems: 'center' }}
                                        >
                                            <Ionicons name="add" size={20} color="#fff" />
                                            <Text style={{ color: '#fff', fontWeight: '600', fontSize: 16 }}>Add Cargo</Text>
                                        </TouchableOpacity>
                                    </View>

                                    {/* Cargo items */}
                                    {paxCargoProperty.map((c: any, index: number) => (
                                        <View key={index} style={{ backgroundColor: '#fff', padding: 10, borderRadius: 8, marginTop: 10, elevation: 5 }}>

                                            {/* Remove button for non-first items */}
                                            {index !== 0 && (
                                                <TouchableOpacity
                                                    onPress={() => handleRemoveCargo(index)}
                                                    style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', marginBottom: 4 }}
                                                >
                                                    <Ionicons name="close" size={20} color="#cf2a3a" />
                                                    <Text style={{ color: '#cf2a3a', fontWeight: '600', fontSize: 15 }}>Remove</Text>
                                                </TouchableOpacity>
                                            )}

                                            {/* Amount + Quantity row */}
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <View style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                                                    <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#545454' }}>Amount:</Text>
                                                    <View style={{ borderColor: '#FFC107', backgroundColor: '#ffc10727', borderWidth: 2, borderRadius: 5, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15 }}>
                                                        <Text style={{ fontSize: 16, color: '#000' }}>₱ </Text>
                                                        <TextInput
                                                            placeholderTextColor="#B3B3B3"
                                                            value={c.cargoAmount != null ? String(c.cargoAmount) : ''}
                                                            onChangeText={text => updateByIndex(index, { cargoAmount: Number(text) || 0 })}
                                                            keyboardType="numeric"
                                                            placeholder="0.00"
                                                            style={{ fontWeight: 'bold', fontSize: 16, color: '#000', minWidth: 80 }}
                                                        />
                                                    </View>
                                                </View>

                                                {c.cargoType && c.cargoType !== 'Rolling Cargo' && (
                                                    <View style={{ flexDirection: 'column', alignItems: 'flex-end' }}>
                                                        <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#545454' }}>Quantity:</Text>
                                                        <View style={{ flexDirection: 'row', alignItems: 'center', borderColor: '#B3B3B3', paddingHorizontal: 8, borderWidth: 1, borderRadius: 5 }}>
                                                            <TouchableOpacity
                                                                disabled={c.quantity === 1}
                                                                onPress={() => handleQuantity('minus', index)}
                                                                style={{ paddingRight: 5 }}
                                                            >
                                                                <Ionicons name="remove" size={26} color={c.quantity === 1 ? '#d4d4d4' : '#000'} />
                                                            </TouchableOpacity>
                                                            <Text style={{ color: '#000', paddingHorizontal: 18, fontWeight: 'bold', borderRightColor: '#B3B3B3', borderLeftColor: '#B3B3B3', borderLeftWidth: 1, borderRightWidth: 1, paddingVertical: 8 }}>
                                                                {c.quantity}
                                                            </Text>
                                                            <TouchableOpacity onPress={() => handleQuantity('add', index)} style={{ paddingLeft: 5 }}>
                                                                <Ionicons name="add" size={26} color="#000" />
                                                            </TouchableOpacity>
                                                        </View>
                                                    </View>
                                                )}
                                            </View>

                                            {/* Cargo Type dropdown */}
                                            <View style={{ marginTop: 10 }}>
                                                <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#545454' }}>Cargo Type:</Text>
                                                <View style={{ borderColor: '#B3B3B3', borderWidth: 1, borderRadius: 5 }}>
                                                    <Dropdown
                                                        onChange={item =>
                                                            updateByIndex(index, {
                                                                cargoType: item.label,
                                                                cargoTypeID: item.value,
                                                                // Reset type-specific fields on change
                                                                cargoSpecification: undefined,
                                                                cargoPlateNo: undefined,
                                                                parcelCategory: undefined,
                                                            })
                                                        }
                                                        placeholderStyle={{ fontSize: 14, lineHeight: 35, fontWeight: '600', color: '#B3B3B3' }}
                                                        value={c.cargoTypeID}
                                                        data={cargoProperties?.data.cargo_types?.map((type: any) => ({ label: type.name, value: type.id })) ?? []}
                                                        labelField="label"
                                                        valueField="value"
                                                        placeholder="Select Cargo Type"
                                                        style={{ height: 50, width: '100%', paddingHorizontal: 10 }}
                                                        containerStyle={{ alignSelf: 'flex-start', width: '85%' }}
                                                        selectedTextStyle={{ fontSize: 15, lineHeight: 35, fontWeight: '600', color: '#000' }}
                                                        renderRightIcon={() => <Ionicons name="chevron-down" size={15} />}
                                                        dropdownPosition="bottom"
                                                        renderItem={item => (
                                                            <View style={{ width: '80%', padding: 8 }}>
                                                                <Text style={{ color: '#000' }}>{item.label}</Text>
                                                            </View>
                                                        )}
                                                    />
                                                </View>
                                            </View>

                                            {/* Rolling Cargo fields */}
                                            {c.cargoType === 'Rolling Cargo' && (
                                                <View style={{ marginTop: 10, flexDirection: 'row', justifyContent: 'space-between' }}>
                                                    <View style={{ width: '50%' }}>
                                                        <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#545454' }}>Specification (CC):</Text>
                                                        <View style={{ borderColor: '#B3B3B3', borderWidth: 1, borderRadius: 5, height: 45, justifyContent: 'center' }}>
                                                            <TextInput
                                                                placeholderTextColor="#B3B3B3"
                                                                value={c.cargoSpecification ?? ''}
                                                                onChangeText={text => updateByIndex(index, { cargoSpecification: text })}
                                                                placeholder="Enter CC"
                                                                keyboardType="numeric"
                                                                style={{ fontSize: 14, fontWeight: '600', color: '#000', paddingHorizontal: 8 }}
                                                            />
                                                        </View>
                                                    </View>

                                                    <View style={{ width: '48%' }}>
                                                        <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#545454' }}>Plate#:</Text>
                                                        <View style={{ borderColor: '#B3B3B3', borderWidth: 1, borderRadius: 5, height: 45, justifyContent: 'center' }}>
                                                            <TextInput
                                                                placeholderTextColor="#B3B3B3"
                                                                value={c.cargoPlateNo ?? ''}
                                                                onChangeText={text => updateByIndex(index, { cargoPlateNo: text })}
                                                                placeholder="Plate#"
                                                                style={{ fontSize: 14, fontWeight: '600', color: '#000', paddingHorizontal: 8 }}
                                                            />
                                                        </View>
                                                    </View>
                                                </View>
                                            )}

                                            {/* Parcel fields */}
                                            {c.cargoType === 'Parcel' && (
                                                <View style={{ marginTop: 10 }}>
                                                    <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#545454' }}>Description:</Text>
                                                    <View style={{ borderColor: '#B3B3B3', borderWidth: 1, borderRadius: 5, height: 45, justifyContent: 'center' }}>
                                                        <TextInput
                                                            placeholderTextColor="#B3B3B3"
                                                            value={c.parcelCategory ?? ''}
                                                            onChangeText={text => updateByIndex(index, { parcelCategory: text })}
                                                            placeholder="Enter Parcel Category"
                                                            style={{ fontSize: 14, fontWeight: '600', color: '#000', paddingHorizontal: 8 }}
                                                        />
                                                    </View>
                                                </View>
                                            )}
                                        </View>
                                    ))}

                                    {/* Proceed button */}
                                    <TouchableOpacity
                                        onPress={handleSaveCargo}
                                        disabled={saveCargoLoading}
                                        style={{ backgroundColor: '#cf2a3a', width: '100%', borderRadius: 8, paddingVertical: 15, marginTop: 30 }}
                                    >
                                        {saveCargoLoading ? (
                                            <ActivityIndicator size="small" color="#fff" />
                                        ) : (
                                            <Text style={{ fontSize: 16, fontWeight: 'bold', textAlign: 'center', color: '#fff' }}>Proceed</Text>
                                        )}
                                    </TouchableOpacity>
                                </ScrollView>
                            </KeyboardAvoidingView>
                        </View>
                    )}
                </Animated.View>
            )}
        </View>
    );
}