import { FetchCargoVessel } from '@/api/cargoVessel';
import { useCargo } from '@/context/cargoProps';
import { useTrip } from '@/context/trip';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Dimensions, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
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
}

export default function CargoComponent({ dateChange }: { dateChange: string }) {
    const { totalFare, note, setNote, setTotalFare, setRouteID, setVessel, setID, setOrigin, setDestination, setVesselID, setCode, setWebCode, setDepartureTime, setMobileCode, clearTrip } = useTrip();
    const { cargoProperties, paxCargoProperty, setPaxCargoProperties, updatePaxCargoProperty } = useCargo();
    const [trips, setTrips] = useState<CargoTripProps[] | null>(null);
    const [cargoContentLoading, setCargoContentLoading] = useState(true);
    const [selectedVessel, setSelectedVessel] = useState('');
    const [timeWithRoute, setTimeWithRoute] = useState('');
    const [formId, setFormId] = useState(0);
    const [saveCargoLoading, setSaveCargoLoading] = useState(false);
    const [formLoading, setFormLoading] = useState(true);
    const tripsAnimation = useRef(new Animated.Value(width)).current;
    const formSheetAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (paxCargoProperty.length === 0) {
            setPaxCargoProperties([{ id: 1, quantity: 1 }]);
            setFormId(1);
        }
    }, [paxCargoProperty]);

    useEffect(() => {
        closeFormSheet();
        setCargoContentLoading(true);
        handleFetchTrips(dateChange);
    }, [dateChange]);

    useEffect(() => {
        if (trips && trips.length > 0) {
            const interval = setInterval(handleTimeChecker, 60 * 60 * 1000);
            return () => clearInterval(interval);
        }
    }, [trips]);

    const handleTimeChecker = () => {
        const dateTime = new Date(
            new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' })
        );
        const toISODate = dateTime.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });

        const updatedTrips = trips?.map(trip => {
            if (toISODate != trip.specific_days) return trip;

            const [time, modifier] = trip.departure_time.split(' ');
            const [hours, minutes] = time.split(':').map(Number);

            const tripTime = new Date(dateTime);
            tripTime.setHours(hours, minutes, 0, 0);

            if (dateTime > tripTime && trip.hasDeparted == false) {
                return { ...trip, hasDeparted: true };
            }

            return trip;
        });

        setTrips(updatedTrips as CargoTripProps[]);
    };

    const addCargo = () => {
        const next_id = formId + 1;
        setFormId(next_id);
        setPaxCargoProperties(prev => [...prev, { id: next_id, quantity: 1 }]);
    };

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
        toggleFormSheet();

        setTimeout(() => {
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
            setFormLoading(false);
        }, 500);
    };

    const handleFetchTrips = async (queryDate: string) => {
        try {
            const tripsFetch = await FetchCargoVessel(queryDate);
            let tripStatus = '';

            function verifyTime(timeString: string, specificDay: string) {
                tripStatus = '';
                const currentTime = new Date();
                const toISODate = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });

                if (toISODate != specificDay) return (tripStatus = 'scheduled');

                const [hours, minutes] = timeString.split(':').map(Number);
                const tripTime = new Date(currentTime);
                tripTime.setHours(hours, minutes, 0, 0);

                return (tripStatus = currentTime > tripTime ? 'departed' : 'scheduled');
            }

            if (tripsFetch) {
                const tripsData: CargoTripProps[] = tripsFetch.data.map((t: any) => ({
                    trip_id: t?.id,
                    vessel: t.trip?.vessel?.name,
                    specific_days: t.specific_days,
                    route_origin: t.trip?.route?.origin,
                    route_destination: t.trip?.route?.destination,
                    departure_time: t.trip?.departure_time,
                    vessel_id: t.trip?.vessel_id,
                    route_id: t.trip?.route_id,
                    mobile_code: t.trip?.route?.mobile_code,
                    web_code: t.trip?.route?.web_code,
                    code: t.trip?.vessel.code,
                    departure: new Date(`1970-01-01T${t.trip?.departure_time}`).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true,
                    }),
                    isCargoable: t.trip?.vessel.is_cargoable,
                    hasDeparted: (verifyTime(t.trip?.departure_time, t.specific_days), tripStatus == 'departed' ? true : false),
                }));

                setTrips(tripsData);
            }
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setCargoContentLoading(false);
        }
    };

    const toggleFormSheet = () => {
        Animated.timing(tripsAnimation, { toValue: 0, duration: 200, useNativeDriver: true }).start();
        Animated.timing(formSheetAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    };

    const closeFormSheet = () => {
        setPaxCargoProperties([]);
        setTotalFare(0);
        setNote('');
        setFormId(0);
        setFormLoading(true);
        Animated.timing(tripsAnimation, { toValue: width, duration: 200, useNativeDriver: true }).start();
        Animated.timing(formSheetAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start();
    };

    const handleSaveCargo = () => {
        setSaveCargoLoading(true);

        setTimeout(() => {
            if (paxCargoProperty.some(c => c.cargoType == 'Rolling Cargo') && !paxCargoProperty.some(c => c.cargoSpecification?.trim())) {
                Alert.alert('Invalid', 'CC is required.');
                setSaveCargoLoading(false);
                return;
            }
            if (paxCargoProperty.some(c => c.cargoType == 'Rolling Cargo') && !paxCargoProperty.some(c => c.cargoPlateNo?.trim())) {
                Alert.alert('Invalid', 'Plate number is required.');
                setSaveCargoLoading(false);
                return;
            }
            if (paxCargoProperty.some(c => c.cargoType == 'Parcel') && !paxCargoProperty.some(c => c.parcelCategory?.trim())) {
                Alert.alert('Invalid', 'Parcel category is required.');
                setSaveCargoLoading(false);
                return;
            }
            if (totalFare == null) {
                Alert.alert('Invalid', 'Cargo amount is missing.');
                setSaveCargoLoading(false);
                return;
            }

            setSaveCargoLoading(false);
            router.push('/summary');
        }, 500);
    };

    const handleCargoQuantity = (operation: 'add' | 'minus', id: number) => {
        setPaxCargoProperties(prev =>
            prev.map(c => {
                if (c.id != id) return c;
                return { ...c, quantity: operation == 'add' ? c.quantity + 1 : c.quantity - 1 };
            })
        );
    };

    const removeCargoForm = (id: number) => {
        setPaxCargoProperties(prev => prev.filter(c => c.id !== id));
    };

    const getTotalAmount = useMemo(() => {
        return paxCargoProperty.reduce((sum, c) => sum + Number(c.cargoAmount ?? 0), 0);
    }, [paxCargoProperty]);

    useEffect(() => {
        setTotalFare(getTotalAmount);
    }, [getTotalAmount]);

    return (
        <View style={{ height: height - 225 }}>
            <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 15, paddingTop: 20 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    {trips && trips.length > 0 && trips.some(t => t.hasDeparted == false) && (
                        <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#000' }}>Select Trip</Text>
                    )}
                </View>
            </View>

            <Animated.View style={{ opacity: tripsAnimation, flex: 1 }}>
                {cargoContentLoading == true ? (
                    <View style={{ height: height / 2, justifyContent: 'center' }}>
                        <ActivityIndicator size={'large'} color={'#cf2a3a'} />
                    </View>
                ) : trips?.length == 0 || !trips.some(t => t.hasDeparted == false) ? (
                    <View style={{ height: height / 2, justifyContent: 'center' }}>
                        <Text style={{ color: '#7A7A85', textAlign: 'center' }}>No Available Trips</Text>
                    </View>
                ) : (
                    <View style={{ paddingHorizontal: 20 }}>
                        {trips?.filter(t => t.hasDeparted == false).map(trip => (
                            <TouchableOpacity
                                onPress={() => handleTripSelect(trip.vessel, trip.trip_id, trip.route_id, trip.route_origin, trip.route_destination, trip.mobile_code, trip.code, trip.web_code, trip.departure_time, trip.vessel_id)}
                                key={trip.trip_id}
                                style={{ elevation: 5, backgroundColor: '#fff', borderRadius: 10, marginTop: 12, flexDirection: 'row', alignItems: 'center' }}
                            >
                                <View style={{ height: '100%', borderTopLeftRadius: 10, borderBottomLeftRadius: 10, width: 5, backgroundColor: '#cf2a3a' }} />
                                <View style={{ width: '78%', paddingHorizontal: 15, paddingVertical: 20 }}>
                                    <Text style={{ fontWeight: 'bold', fontSize: 13, color: '#cf2a3a' }}>{`${trip.departure}`}</Text>
                                    <Text style={{ fontWeight: 'bold', fontSize: 13, color: '#000' }}>{`${trip.route_origin}  >  ${trip.route_destination} [ ${trip.vessel} ]`}</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={18} style={{ marginLeft: 30, color: '#000' }} />
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
            </Animated.View>

            <Animated.View style={{ transform: [{ translateX: tripsAnimation }], position: 'absolute', flex: 1, width, paddingTop: 20, backgroundColor: '#fdfdfd' }}>
                {formLoading == true ? (
                    <View style={{ height: height - 300, justifyContent: 'center', alignSelf: 'center' }}>
                        <ActivityIndicator size={'large'} color={'#cf2a3a'} />
                    </View>
                ) : (
                    <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, width: '70%' }}>
                                <Ionicons name={'boat'} color={'#fff'} size={26} style={{ backgroundColor: '#cf2a3a', padding: 5, borderRadius: 50 }} />
                                <View style={{ flexDirection: 'column' }}>
                                    <Text style={{ color: '#747373ff', fontSize: 11 }}>{timeWithRoute}</Text>
                                    <Text style={{ color: '#cf2a3a', fontSize: 15, fontWeight: '900', marginTop: -5, width: '90%' }}>{selectedVessel}</Text>
                                </View>
                            </View>

                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <TouchableOpacity onPress={() => closeFormSheet()} style={{ paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#cf2a3a', borderRadius: 5 }}>
                                    <Ionicons name={'arrow-back'} color={'#fff'} size={18} />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => addCargo()} style={{ paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#cf2a3a', borderRadius: 5 }}>
                                    <Ionicons name={'add'} color={'#fff'} size={18} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {paxCargoProperty.length > 1 && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 18, gap: 8, alignSelf: 'flex-end', paddingHorizontal: 10 }}>
                                <Text style={{ fontWeight: 'bold', color: '#545454', fontSize: 14 }}>Total Amount:</Text>
                                <View style={{ borderBottomColor: '#cf2a3a', borderBottomWidth: 2, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15 }}>
                                    <Text style={{ fontSize: 17, color: '#cf2a3a', fontWeight: 'bold' }}>₱ </Text>
                                    <Text style={{ fontWeight: 'bold', textAlign: 'right', fontSize: 17, color: '#cf2a3a' }}>
                                        {getTotalAmount.toFixed ? getTotalAmount?.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                                    </Text>
                                </View>
                            </View>
                        )}

                        <KeyboardAvoidingView style={{ paddingBottom: 100 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 10, paddingBottom: 100 }} nestedScrollEnabled={true}>
                                {paxCargoProperty?.map((c: any) => (
                                    <View key={c.id} style={{ backgroundColor: '#fff', padding: 10, borderRadius: 8, marginTop: 10, elevation: 5 }}>
                                        {c.id > 1 && (
                                            <TouchableOpacity onPress={() => removeCargoForm(c.id)} style={{ alignSelf: 'flex-end' }}>
                                                <Ionicons color={'#cf2a3a'} name={'close'} size={20} />
                                            </TouchableOpacity>
                                        )}

                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <View style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                                                <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#545454' }}>Amount:</Text>
                                                <View style={{ borderColor: '#FFC107', backgroundColor: '#ffc10727', borderWidth: 2, borderRadius: 5, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 8 }}>
                                                    <Text style={{ fontSize: 16, color: '#000' }}>₱ </Text>
                                                    <TextInput
                                                        value={c.cargoAmount != null ? String(c.cargoAmount) : ''}
                                                        onChangeText={text => updatePaxCargoProperty(c.id, 'cargoAmount', Number(text) || 0)}
                                                        keyboardType="numeric"
                                                        placeholder="0.00"
                                                        style={{ fontWeight: 'bold', textAlign: 'right', fontSize: 16, color: '#000', minWidth: 80 }}
                                                    />
                                                </View>
                                            </View>

                                            {c.cargoType && c.cargoType != 'Rolling Cargo' && (
                                                <View style={{ flexDirection: 'column', alignItems: 'flex-end' }}>
                                                    <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#545454' }}>Quantity:</Text>
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', borderColor: '#B3B3B3', paddingHorizontal: 5, borderWidth: 1, borderRadius: 5 }}>
                                                        <TouchableOpacity disabled={c.quantity == 1} onPress={() => handleCargoQuantity('minus', c.id)} style={{ paddingRight: 5 }}>
                                                            <Ionicons name={'remove'} size={18} color={c.quantity == 1 ? '#d4d4d4ff' : undefined} />
                                                        </TouchableOpacity>
                                                        <Text style={{ color: '#000', paddingHorizontal: 14, fontWeight: 'bold', borderRightColor: '#B3B3B3', borderLeftColor: '#B3B3B3', borderLeftWidth: 1, borderRightWidth: 1, paddingVertical: 5 }}>
                                                            {c.quantity}
                                                        </Text>
                                                        <TouchableOpacity onPress={() => handleCargoQuantity('add', c.id)} style={{ paddingLeft: 5 }}>
                                                            <Ionicons name={'add'} size={18} />
                                                        </TouchableOpacity>
                                                    </View>
                                                </View>
                                            )}
                                        </View>

                                        <View style={{ marginTop: 10 }}>
                                            <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#545454' }}>Cargo Type:</Text>
                                            <View style={{ borderColor: '#B3B3B3', borderWidth: 1, borderRadius: 5 }}>
                                                <Dropdown
                                                    onChange={item => {
                                                        updatePaxCargoProperty(c.id, 'cargoType', item.label);
                                                        updatePaxCargoProperty(c.id, 'cargoTypeID', item.value);
                                                    }}
                                                    value={c.cargoTypeID}
                                                    data={cargoProperties?.data.cargo_types?.map((type: any) => ({ label: type.name, value: type.id }))}
                                                    labelField="label"
                                                    valueField="value"
                                                    placeholder="Select Cargo Type"
                                                    style={{ height: 40, width: '100%', paddingHorizontal: 10 }}
                                                    containerStyle={{ alignSelf: 'flex-start', width: '85%' }}
                                                    selectedTextStyle={{ fontSize: 14, lineHeight: 35, color: '#000' }}
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

                                        {c?.cargoType != null && (
                                            <>
                                                {c?.cargoType == 'Rolling Cargo' ? (
                                                    <View style={{ marginTop: 5, flexDirection: 'row', justifyContent: 'space-between' }}>
                                                        <View style={{ width: '48%' }}>
                                                            <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#545454' }}>Specification (CC):</Text>
                                                            <View style={{ borderColor: '#B3B3B3', borderWidth: 1, borderRadius: 5, paddingVertical: 1 }}>
                                                                <TextInput
                                                                    value={c.cargoSpecification ?? ''}
                                                                    onChangeText={text => updatePaxCargoProperty(c.id, 'cargoSpecification', text)}
                                                                    placeholder="Enter CC"
                                                                    keyboardType="numeric"
                                                                    style={{ height: 40, paddingHorizontal: 10, fontSize: 13, color: '#000' }}
                                                                />
                                                            </View>
                                                        </View>

                                                        <View style={{ width: '48%' }}>
                                                            <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#545454' }}>Plate#:</Text>
                                                            <View style={{ borderColor: '#B3B3B3', borderWidth: 1, borderRadius: 5, paddingVertical: 1 }}>
                                                                <TextInput
                                                                    value={c.cargoPlateNo ?? ''}
                                                                    onChangeText={text => updatePaxCargoProperty(c.id, 'cargoPlateNo', text)}
                                                                    placeholder="Plate#"
                                                                    style={{ height: 40, paddingHorizontal: 10, fontSize: 13, color: '#000' }}
                                                                />
                                                            </View>
                                                        </View>
                                                    </View>
                                                ) : c?.cargoType == 'Parcel' ? (
                                                    <View style={{ marginTop: 5 }}>
                                                        <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#545454' }}>Description:</Text>
                                                        <View style={{ borderColor: '#B3B3B3', borderWidth: 1, borderRadius: 5, paddingVertical: 1 }}>
                                                            <TextInput
                                                                value={c.parcelCategory ?? ''}
                                                                onChangeText={text => updatePaxCargoProperty(c.id, 'parcelCategory', text)}
                                                                placeholder="Enter Parcel Category"
                                                                style={{ height: 40, paddingHorizontal: 10, fontSize: 14, color: '#000' }}
                                                            />
                                                        </View>
                                                    </View>
                                                ) : (
                                                    <View />
                                                )}
                                            </>
                                        )}
                                    </View>
                                ))}

                                <View style={{ backgroundColor: '#fff', padding: 10, borderRadius: 8, marginTop: 10, elevation: 5 }}>
                                    <Text style={{ fontSize: 9, fontWeight: 'bold', color: '#545454' }}>Note:</Text>
                                    <View style={{ borderColor: '#B3B3B3', borderWidth: 1, borderRadius: 5, height: 60 }}>
                                        <TextInput onChangeText={text => setNote(text)} placeholder="e.g. Receiver" style={{ fontSize: 13, color: '#000' }} />
                                    </View>
                                </View>

                                <TouchableOpacity onPress={() => handleSaveCargo()} disabled={saveCargoLoading} style={{ backgroundColor: '#cf2a3a', width: '100%', alignSelf: 'center', borderRadius: 8, paddingVertical: 15, marginTop: 30 }}>
                                    {saveCargoLoading == true ? (
                                        <ActivityIndicator size="small" color={'#fff'} />
                                    ) : (
                                        <Text style={{ fontSize: 16, fontWeight: 'bold', textAlign: 'center', color: '#fff' }}>Proceed</Text>
                                    )}
                                </TouchableOpacity>
                            </ScrollView>
                        </KeyboardAvoidingView>
                    </View>
                )}
            </Animated.View>
        </View>
    );
}