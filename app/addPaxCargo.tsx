import { useCargo } from '@/context/cargoProps';
import { useTrip } from '@/context/trip';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { Dropdown } from 'react-native-element-dropdown';

export default function AddPaxCargo() {
    const { vessel, origin, destination, setTotalFare } = useTrip();
    const { cargoProperties, paxCargoProperty, setPaxCargoProperties } = useCargo();
    const { departureTime } = useLocalSearchParams();
    const [loading, setLoading] = useState(false);

    const updateByIndex = useCallback((index: number, patch: Record<string, any>) => {
        setPaxCargoProperties(prev =>
            prev.map((c, i) => i === index ? { ...c, ...patch } : c)
        );
    }, [setPaxCargoProperties]);

    const handleAddCargo = useCallback(() => {
        const base = paxCargoProperty[0];
        setPaxCargoProperties(prev => [
            ...prev,
            { withPassenger: base?.withPassenger, passenger_id: base?.passenger_id, quantity: 1 },
        ]);
    }, [paxCargoProperty, setPaxCargoProperties]);

    const handleRemoveCargo = useCallback((index: number) => {
        setPaxCargoProperties(prev => prev.filter((_, i) => i !== index));
    }, [setPaxCargoProperties]);

    const handleQuantity = useCallback((op: 'add' | 'minus', index: number) => {
        const current = paxCargoProperty[index]?.quantity ?? 1;
        const next = op === 'add' ? current + 1 : Math.max(1, current - 1);
        updateByIndex(index, { quantity: next });
    }, [paxCargoProperty, updateByIndex]);

    const totalAmount = useMemo(() => {
        return paxCargoProperty.reduce((sum, c) => sum + Number(c.cargoAmount ?? 0), 0);
    }, [paxCargoProperty]);

    useEffect(() => {
        setTotalFare(totalAmount);
    }, [totalAmount]);

    const handleProceed = useCallback(() => {
        setLoading(true);

        setTimeout(() => {
            if (paxCargoProperty.some(c => c.cargoType == 'Rolling Cargo') && !paxCargoProperty.some(c => c.cargoSpecification?.trim())) {
                Alert.alert('Invalid', 'CC is required.');
                setLoading(false);
                return;
            }
            if (paxCargoProperty.some(c => c.cargoType == 'Rolling Cargo') && !paxCargoProperty.some(c => c.cargoPlateNo?.trim())) {
                Alert.alert('Invalid', 'Plate number is required.');
                setLoading(false);
                return;
            }
            if (paxCargoProperty.some(c => c.cargoType == 'Parcel') && !paxCargoProperty.some(c => c.parcelCategory?.trim())) {
                Alert.alert('Invalid', 'Parcel category is required.');
                setLoading(false);
                return;
            }
            if (totalAmount == 0) {
                Alert.alert('Invalid', 'Cargo does not have an amount.');
                setLoading(false);
                return;
            }

            setLoading(false);
            router.push('/summary');
        }, 500);
    }, [paxCargoProperty, totalAmount]);

    return (
        <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
            <View style={{ height: 100, backgroundColor: '#cf2a3a', paddingHorizontal: 20, paddingTop: 50 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Pressable onPress={() => { setPaxCargoProperties([]); router.back(); }}>
                        <Ionicons name={'arrow-back'} size={30} color={'#fff'} />
                    </Pressable>
                    <Text style={{ color: '#fff', fontSize: 20, fontWeight: 'bold' }}>Add Passenger Cargo</Text>
                </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 20, margin: 10, borderRadius: 8, elevation: 5, backgroundColor: '#fff' }}>
                <Ionicons
                    name={'boat'} color={'#fff'} size={28}
                    style={{ backgroundColor: '#cf2a3a', padding: 5, borderRadius: 50 }}
                />
                <View>
                    <Text style={{ color: '#747373ff', fontSize: 14 }}>
                        {`${origin} > ${destination} | ${departureTime}`}
                    </Text>
                    <Text style={{ color: '#cf2a3a', fontSize: 18, fontWeight: '900', marginTop: -5 }}>
                        {vessel}
                    </Text>
                </View>
            </View>

            {paxCargoProperty.length > 1 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-end', paddingHorizontal: 16, marginBottom: 4, marginTop: 10 }}>
                    <Text style={{ fontWeight: 'bold', color: '#545454', fontSize: 16 }}>Total Amount:</Text>
                    <View style={{ borderBottomColor: '#cf2a3a', borderBottomWidth: 2, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10 }}>
                        <Text style={{ fontSize: 18, color: '#cf2a3a', fontWeight: 'bold' }}>₱ </Text>
                        <Text style={{ fontWeight: 'bold', fontSize: 18, color: '#cf2a3a' }}>
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
                    nestedScrollEnabled={true}
                >
                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 }}>
                        <TouchableOpacity
                            onPress={handleAddCargo}
                            style={{ backgroundColor: '#cf2a3a', padding: 10, borderRadius: 5, flexDirection: 'row', gap: 5, alignItems: 'center' }}
                        >
                            <Ionicons name={'add'} size={20} color={'#fff'} />
                            <Text style={{ color: '#fff', fontWeight: '600', fontSize: 16 }}>Add Cargo</Text>
                        </TouchableOpacity>
                    </View>

                    {paxCargoProperty.map((c, index) => (
                        <View key={index} style={{ backgroundColor: '#fff', padding: 10, borderRadius: 8, marginTop: 10, elevation: 5 }}>
                            {index !== 0 && (
                                <TouchableOpacity
                                    onPress={() => handleRemoveCargo(index)}
                                    style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', marginBottom: 4 }}
                                >
                                    <Ionicons name={'close'} size={20} color={'#cf2a3a'} />
                                    <Text style={{ color: '#cf2a3a', fontWeight: '600', fontSize: 15 }}>Remove</Text>
                                </TouchableOpacity>
                            )}

                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <View style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                                    <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#545454' }}>Amount:</Text>
                                    <View style={{ borderColor: '#FFC107', backgroundColor: '#ffc10727', borderWidth: 2, borderRadius: 5, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 8 }}>
                                        <Text style={{ fontSize: 16, color: '#000' }}>₱ </Text>
                                        <TextInput
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
                                                <Ionicons name={'remove'} size={26} color={c.quantity === 1 ? '#d4d4d4' : '#000'} />
                                            </TouchableOpacity>
                                            <Text style={{ color: '#000', paddingHorizontal: 18, fontWeight: 'bold', borderRightColor: '#B3B3B3', borderLeftColor: '#B3B3B3', borderLeftWidth: 1, borderRightWidth: 1, paddingVertical: 8 }}>
                                                {c.quantity}
                                            </Text>
                                            <TouchableOpacity onPress={() => handleQuantity('add', index)} style={{ paddingLeft: 5 }}>
                                                <Ionicons name={'add'} size={26} color={'#000'} />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                )}
                            </View>

                            <View style={{ marginTop: 10 }}>
                                <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#545454' }}>Cargo Type:</Text>
                                <View style={{ borderColor: '#B3B3B3', borderWidth: 1, borderRadius: 5 }}>
                                    <Dropdown
                                        onChange={item =>
                                            updateByIndex(index, {
                                                cargoType: item.label,
                                                cargoTypeID: item.value,
                                                cargoSpecification: undefined,
                                                cargoSpecificationID: undefined,
                                                cargoPlateNo: undefined,
                                                parcelCategory: undefined,
                                                parcelCategoryID: undefined,
                                            })
                                        }
                                        value={c.cargoTypeID}
                                        data={cargoProperties?.data.cargo_types?.map(t => ({ label: t.name, value: t.id })) ?? []}
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

                            {c.cargoType === 'Rolling Cargo' && (
                                <>
                                    <View style={{ marginTop: 10, flexDirection: 'row', justifyContent: 'space-between' }}>
                                        <View style={{ width: '50%' }}>
                                            <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#545454' }}>Specification (CC):</Text>
                                            <View style={{ borderColor: '#B3B3B3', borderWidth: 1, borderRadius: 5, height: 45, justifyContent: 'center' }}>
                                                <TextInput
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
                                                    value={c.cargoPlateNo ?? ''}
                                                    onChangeText={text => updateByIndex(index, { cargoPlateNo: text })}
                                                    placeholder="Plate#"
                                                    style={{ fontSize: 14, fontWeight: '600', color: '#000', paddingHorizontal: 8 }}
                                                />
                                            </View>
                                        </View>
                                    </View>
                                </>
                            )}

                            {c.cargoType === 'Parcel' && (
                                <View style={{ marginTop: 10 }}>
                                    <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#545454' }}>Description:</Text>
                                    <View style={{ borderColor: '#B3B3B3', borderWidth: 1, borderRadius: 5, height: 45, justifyContent: 'center' }}>
                                        <TextInput
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

                    <TouchableOpacity
                        onPress={handleProceed}
                        style={{ backgroundColor: '#cf2a3a', width: '100%', borderRadius: 8, paddingVertical: 15, marginTop: 30 }}
                    >
                        {loading == true ? (
                            <ActivityIndicator size={'small'} color={'#fff'} style={{ alignSelf: 'center' }} />
                        ) : (
                            <Text style={{ fontSize: 16, fontWeight: 'bold', textAlign: 'center', color: '#fff' }}>Proceed</Text>
                        )}
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}