import { FetchPassengerType } from '@/api/passengerType';
import { PaxCargoProperties, useCargo } from '@/context/cargoProps';
import { usePassesType } from '@/context/passes';
import { useTrip } from '@/context/trip';
import { Ionicons } from '@expo/vector-icons';
import * as Crypto from 'expo-crypto';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Dimensions, Platform, Pressable, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { AutocompleteDropdown } from 'react-native-autocomplete-dropdown';
import { Dropdown } from 'react-native-element-dropdown';
import { Checkbox } from 'react-native-paper';
import { InfantProps, usePassengers } from '../context/passenger';
import PreLoader from './preloader';


const passGender = ['Male', 'Female'];

type FormProps = {
    errorForm: (string | number)[];
}

type PassTypeProps = {
    id?: number;
    name?: string;
    code?: string;
}

type PaxFareProps = {
    id: number;
    fare: number;
    routes_id: number;
    passenger_type_id?: number;
    vessel_id: number;
    accommodation_type_id: number;
}

type PaxListProps = {
    id: string;
    first_name: string;
    last_name: string;
    gender: string;
    age: number;
    address: string;
    nationality: string;
    contact_number: string;
    passenger_type: {
        id: number;
        name: string;
        passenger_types_code: string;
        fareId: number;
    }
}

export default function Forms({ errorForm }: FormProps) {
    const { passengers, setPassengers, updatePassenger, updateInfant, updateCargo } = usePassengers();
    const { vessel_id, routeID, isCargoable, approvedBy, setApprovedBy } = useTrip();
    const { passesTypeID, passesTypeCode, passesTypeName } = usePassesType();
    const { cargoProperties } = useCargo();

    const [isLoading, setIsLoading] = useState(true)
    const [passengerType, setPassengerType] = useState<PassTypeProps[] | null>(null);
    const [paxFares, setPaxFares] = useState<PaxFareProps[] | null>(null);
    const [paxlists, setPaxLists] = useState<PaxListProps[]>([]);
    const [suggestions, setSuggestions] = useState<{ [key: string]: any[] }>({});
    const [infantSuggestions, setInfantSuggestions] = useState<{ [key: string]: any[] }>({});

    const dropdownController = useRef<{ [key: string]: any }>({});
    const initializedRefs = useRef<{ [key: string]: boolean }>({});
    const searchRefs = useRef<{ [key: string]: any }>({});
    const InfantDropController = useRef<{ [key: string]: any }>({});
    const initializedInfantRefs = useRef<{ [key: string]: boolean }>({});
    const infantSearchRefs = useRef<{ [key: string]: any }>({});

    const nonInfantPax = useMemo(() =>
        passengers.filter(p => p.passType !== 'Infant'),
    [passengers]);

    const hasPasses = useMemo(() =>
        passengers.some(p => p.passType == 'Passes' || p.passTypeCode == 'P'),
    [passengers]);

    const specialInfantPax = useMemo(() =>
        passengers.filter(p => p.passType == 'Infant' && (p.hasScanned == true || p.forResched == true)),
    [passengers]);

    const formattedPaxList = useMemo(() =>
        paxlists
            .filter(p => p.passenger_type?.name != null && p.passenger_type?.name != 'Infant')
            .map(p => ({ id: p.id, title: `${p.last_name}, ${p.first_name}` })),
    [paxlists]);

    const formattedInfantList = useMemo(() =>
        paxlists
            .filter(p => p.passenger_type?.name == 'Infant')
            .map(p => ({ id: p.id, title: `${p.last_name}, ${p.first_name}` })),
    [paxlists]);

    const paxsengerTypes = useMemo(() =>
        passengerType?.filter(t => t?.name !== 'Infant' && t?.name !== 'Passes') ?? [],
    [passengerType]);

    const ComputedCargoAmount = useCallback((cargo: PaxCargoProperties) => {
        if (!cargo || !cargoProperties) return { amount: 0, optionID: 0 };

        let prop;

        if (cargo.cargoType === 'Rolling Cargo') {
            if (!cargo.cargoBrandID || !cargo.cargoSpecificationID) return { amount: 0, optionID: 0 };
            prop = cargoProperties.data.cargo_options?.find(
                c => c.cargo_type_id == cargo.cargoTypeID &&
                    c.cargo_brand_id == cargo.cargoBrandID &&
                    c.specification == cargo.cargoSpecification &&
                    c.route_id == routeID
            );
            return { amount: prop ? Number(prop.price * cargo.quantity) : 0, optionID: prop?.id ?? 0 };
        }

        if (cargo.cargoType === 'Parcel') {
            if (!cargo.parcelCategoryID) return { amount: 0, optionID: 0 };
            prop = cargoProperties.data.cargo_options?.find(
                c => c.parcel_category_id == cargo.parcelCategoryID && c.route_id == routeID
            );
            return { amount: prop ? Number(prop.price * cargo.quantity) : 0, optionID: prop?.id ?? 0 };
        }

        if (cargo.cargoType === 'Animal/Pet') {
            const petType = cargoProperties.data.cargo_types?.find(t => t.name === 'Animal/Pet');
            prop = cargoProperties.data.cargo_options?.find(
                c => c.cargo_type_id == petType?.id && c.route_id == routeID
            );
            return { amount: prop ? Number(prop.price * cargo.quantity) : 0, optionID: prop?.id ?? 0 };
        }

        return { amount: 0, optionID: 0 };
    }, [cargoProperties, routeID]);

    const computedPassengerCargo = useMemo(() =>
        passengers.map(pax => {
            if (!pax.cargo || pax.cargo.length === 0) return pax;
            const updatedCargo = pax.cargo.map(cargoItem => {
                const { amount, optionID } = ComputedCargoAmount(cargoItem);
                return { ...cargoItem, cargoAmount: amount, cargoOptionID: optionID };
            });
            return { ...pax, cargo: updatedCargo };
        }),
    [passengers, cargoProperties, routeID]);


    const handleOnSearch = useCallback((text: string, paxId: string | number) => {
        const paxsSuggestions = formattedPaxList.filter(p =>
            p.title.toLowerCase().includes(text.toLowerCase())
        );
        setSuggestions(prev => ({ ...prev, [paxId]: paxsSuggestions }));
    }, [formattedPaxList]);

    const handleOnInfantSearch = useCallback((text: string, paxId: string | number) => {
        const paxsSuggestions = formattedInfantList.filter(p =>
            p.title.toLowerCase().includes(text.toLowerCase())
        );
        setInfantSuggestions(prev => ({ ...prev, [paxId]: paxsSuggestions }));
    }, [formattedInfantList]);

    const handleOnAutoComplete = useCallback((itemId: string, targetPaxId: string | number, targetAccomId: number) => {
        const paxOnList = paxlists.find(p => p.id == itemId);
        if (!paxOnList) return;

        const isPasses = paxOnList.passenger_type.name === 'Passes';

        const paxFareOnList = isPasses ? undefined : paxFares?.find(f =>
            f.accommodation_type_id == targetAccomId &&
            f.passenger_type_id == paxOnList.passenger_type.id &&
            f.vessel_id == vessel_id &&
            f.routes_id == routeID
        )?.fare;

        setPassengers(prev =>
            prev.map(p => p.id != targetPaxId ? p : {
                ...p,
                pax_id: paxOnList.id,
                name: `${paxOnList.last_name}, ${paxOnList.first_name}`,
                age: paxOnList.age,
                gender: paxOnList.gender,
                nationality: paxOnList.nationality ?? 'Filipino',
                address: paxOnList.address ?? '',
                contact_number: paxOnList.contact_number ?? '',
                ...(!isPasses && {
                    passType: paxOnList.passenger_type.name,
                    passType_id: paxOnList.passenger_type.id,
                    passTypeCode: paxOnList.passenger_type.passenger_types_code,
                    fare: paxFareOnList,
                    originalFare: paxFareOnList
                }),
            })
        );
    }, [paxFares, paxlists, routeID, vessel_id, setPassengers]);

    const handleOnInfantAutoComplete = useCallback((itemId: string, targetPaxId: string | number, targetAccomId: number, infantIndex: number | string) => {
        const paxOnList = paxlists.find(p => p.id == itemId);
        if (!paxOnList) return;

        const isPasses = paxOnList.passenger_type.name === 'Passes';

        const paxFareOnList = isPasses ? undefined : paxFares?.find(f =>
            f.accommodation_type_id == targetAccomId &&
            f.passenger_type_id == paxOnList.passenger_type.id &&
            f.vessel_id == vessel_id &&
            f.routes_id == routeID
        )?.fare;
        setPassengers(prev =>
            prev.map(p => {
                if (p.id != targetPaxId && p.hasInfant != true) return p;
                return {
                    ...p,
                    infant: p.infant?.map(inf => {
                        if (inf.pax_id != infantIndex) return inf;
                        return {
                            ...inf,
                            id: paxOnList.id,
                            pax_id: paxOnList.id,
                            name: `${paxOnList.last_name}, ${paxOnList.first_name}`,
                            age: paxOnList.age,
                            gender: paxOnList.gender,
                            nationality: paxOnList.nationality ?? 'Filipino',
                            address: paxOnList.address ?? '',
                            contact_number: paxOnList.contact_number ?? '',
                            ...(!isLoading && {
                                passType: paxOnList.passenger_type.name,
                                passType_id: paxOnList.passenger_type.id,
                                passTypeCode: paxOnList.passenger_type.passenger_types_code,
                                fare: paxFareOnList,
                                originalFare: paxFareOnList
                            })
                        };
                    })
                };
            })
        );
    }, [paxlists, paxFares, vessel_id, routeID, setPassengers]);

    const handleClearAutoComplete = useCallback((paxId: number | string) => {
        setPassengers(prev =>
            prev.map(p => {
            if (p.id !== paxId) return p;
                const isPasses = p.passType === 'Passes';

                return {
                    ...p,
                    pax_id: '', name: '', age: null,  gender: '',
                    nationality: 'Filipino', address: '', contact_number: '',
                    ...(!isPasses && {
                        passType: '',
                        passType_id: null, passTypeCode: '',
                        fare: null,
                        originalFare: null
                    })
                }
            })
        );
    }, [setPassengers]);

    const handleInfantClearAutoComplete = useCallback((paxId: number | string, infantIndex: number) => {
        setPassengers(prev =>
            prev.map(p => {
                if (p.id != paxId && p.hasInfant != true) return p;
                const isPasses = p.passType == 'Passes';

                return {
                    ...p,
                    infant: p.infant?.map((inf, index) =>
                        index != infantIndex ? inf : {
                            ...inf,
                            pax_id: '', name: '', age: null, nationality: 'Filipino', 
                            address: '', contact_number: '', fare: null, originalFare: null,
                            ...(!isPasses && {
                                passType: '',
                                passType_id: null, 
                                passTypeCode: '', 
                                gender: '',
                            })
                        }
                    )
                };
            })
        );
    }, [setPassengers]);

    const hasInfantChecker = useCallback((paxId: number | string, type_id: number) => {
        setPassengers(prev =>
            prev.map(p => {
                if (p.id != paxId) return p;
                const isHasInfant = !p.hasInfant;
                return { ...p, hasInfant: isHasInfant, infant: isHasInfant ? [{ name: '', gender: '', age: 0, passType_id: type_id }] : [] };
            })
        );
    }, [setPassengers]);

    const hasCargoChecker = useCallback((paxId: number | string) => {
        setPassengers(prev =>
            prev.map(p => {
                if (p.id != paxId) return p;
                const isHasCargo = !p.hasCargo;
                return { ...p, hasCargo: isHasCargo, cargo: isHasCargo ? [{ cargoAmount: 0.00, quantity: 1 }] : [] };
            })
        );
    }, [setPassengers]);

    const addInfant = useCallback((identifier: string | number, newInfant: InfantProps) => {
        setPassengers(prev =>
            prev.map((p, index) => {
                if (p.seatNumber !== identifier && index !== identifier) return p;
                return { ...p, infant: [...(p.infant || []), newInfant] };
            })
        );
    }, [setPassengers]);

    const addPaxCargo = useCallback((identifier: string | number, newCargo: PaxCargoProperties) => {
        setPassengers(prev =>
            prev.map((p, index) => {
                if (p.seatNumber !== identifier && index !== identifier) return p;
                return { ...p, cargo: [...(p.cargo || []), newCargo] };
            })
        );
    }, [setPassengers]);

    const handleOnUpdateCargo = useCallback((paxId: string | number, cargoIndex: number, keyName: string, keyValue: string, keyId: string, keyValueId: number) => {
        setPassengers(prev =>
            prev.map(p => {
                if (p.id != paxId) return p;
                return {
                    ...p,
                    cargo: p.cargo.map((c, index) =>
                        index != cargoIndex ? c : {
                            ...c, 
                            [keyName]: keyValue,
                            [keyId]: keyValueId 
                        }
                    )
                };
            })
        );
    }, [setPassengers]);

    const removeInfant = useCallback((seat: string | number, infantIndex: number) => {
        setPassengers(prev =>
            prev.map(p => {
                if (p.seatNumber !== seat) return p;
                return { ...p, infant: p.infant?.filter((_, i) => i !== infantIndex) };
            })
        );
    }, [setPassengers]);

    const removeCargo = useCallback((seat: string | number | null, paxIndex: number, cargoIndex: number) => {
        setPassengers(prev =>
            prev.map((p, index) => {
                if (p.seatNumber != seat || index != paxIndex) return p;
                return { ...p, cargo: p.cargo.filter((_, i) => i !== cargoIndex) };
            })
        );
    }, [setPassengers]);

    const handleCargoQuantity = useCallback((operation: 'add' | 'minus', cargoIndex: number, paxId: string | number) => {
        const passenger = passengers.find(p => p.id == paxId);
        if (!passenger) return;
        const paxCargo = passenger.cargo[cargoIndex];
        if (!paxCargo) return;
        
        const newQty = operation === 'add' ? paxCargo.quantity + 1 : paxCargo.quantity - 1;
        updateCargo(paxId, cargoIndex, 'quantity', newQty);
    }, [passengers, updateCargo]);

    const handleAddPasses = useCallback(() => {
        const temp = Crypto.randomUUID();
        setPassengers(prev => [
            ...prev, { id: temp, passType_id: passesTypeID, passType: passesTypeName, passTypeCode: passesTypeCode }
        ]);
    }, [setPassengers, passesTypeID, passesTypeName, passesTypeCode]);

    const handlePassesRemove = useCallback((passId: string) => {
        setPassengers(prev => prev.filter(p => p.id != passId));
    }, [setPassengers]);

    const handleOnPaxTypeSelect = useCallback((passengerId: number | string, accommodationId: number, typeID: number, paxType: string, paxTypeCode: string) => {
        const prop = paxFares?.find(p =>
            p.routes_id == routeID &&
            p.vessel_id == vessel_id &&
            p.accommodation_type_id == accommodationId &&
            p.passenger_type_id == typeID
        );
        setPassengers(prev =>
            prev.map(p => p.id == passengerId ? {
                ...p, passType: paxType, passType_id: typeID, passTypeCode: paxTypeCode, fare: prop?.fare ?? 0, originalFare: prop?.fare ?? 0
            } : p)
        );
    }, [paxFares, routeID, vessel_id, setPassengers]);

    useEffect(() => {
        const paxTypeAndLists = async () => {
            try {
                const passTypesFaresAndLists = await FetchPassengerType();
                if (!passTypesFaresAndLists.error) {
                    const types: PassTypeProps[] = passTypesFaresAndLists.types.map((type: any) => ({
                        id: type.id, name: type?.name, code: type?.passenger_types_code
                    }));
                    const fares: PaxFareProps[] = passTypesFaresAndLists.fares.map((fare: any) => ({
                        id: fare.id, fare: fare.fare, routes_id: fare.routes_id,
                        passenger_type_id: fare.passenger_type_id, vessel_id: fare.vessel_id,
                        accommodation_type_id: fare.accommodation_type_id
                    }));
                    const lists: PaxListProps[] = passTypesFaresAndLists.passengers.map((pax: any) => ({
                        id: pax.id, first_name: pax.first_name, last_name: pax.last_name,
                        gender: pax.gender, age: pax.age, address: pax.addresss,
                        nationality: pax.nationality, contact_number: pax.contact_number,
                        passenger_type: pax.passenger_type,
                    }));
                    setPaxLists(lists);
                    setPassengerType(types);
                    setPaxFares(fares);
                }
            } catch (error: any) {
                Alert.alert('Error', error.message);
            }finally {
                setIsLoading(false)
            }
        };
        paxTypeAndLists();
    }, []);

    useEffect(() => {
        setPassengers(prev => {
            let anyChanged = false;
            const updated = prev.map(p => {
                const computed = computedPassengerCargo.find(c => c.id === p.id);
                if (!computed?.cargo) return p;
                let passengerChanged = false;
                const updatedCargo = p.cargo?.map((c, index) => {
                    const computedItem = computed.cargo[index];
                    if (!computedItem) return c;
                    if (c.cargoAmount === computedItem.cargoAmount && c.cargoOptionID === computedItem.cargoOptionID) return c;
                    passengerChanged = true;
                    anyChanged = true;
                    return { ...c, cargoAmount: computedItem.cargoAmount, cargoOptionID: computedItem.cargoOptionID };
                });
                return passengerChanged ? { ...p, cargo: updatedCargo } : p;
            });
            return anyChanged ? updated : prev;
        });
    }, [computedPassengerCargo]);


    return (
        <View>
            <View style={{ height: '100%', marginTop: 10, flexDirection: 'column', gap: 20 }}>
                {isLoading == true ? (
                    <PreLoader loading={isLoading} />
                ) : (
                    <>
                        {(nonInfantPax ?? []).map((p, index) => (
                            <View key={p.id} style={{ position: 'relative', borderColor: errorForm.includes(p.seatNumber ?? '') ? '#cf2a3a' : '#B3B3B3', borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 10, backgroundColor: '#fff', elevation: 5 }}>
                                {hasPasses && index != 0 && (
                                    <TouchableOpacity onPress={() => handlePassesRemove(p.id)} style={{ position: 'absolute', right: -5, top: -15 }}>
                                        <Ionicons name={'close-circle'} size={40} color={'#cf2a3a'} />
                                    </TouchableOpacity>
                                )}
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                    {p.passType != 'Passes' && (
                                        <View style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                                            <Text style={{ color: '#cf2a3a', fontSize: 16, fontWeight: '900' }}>{p.accommodation} Seat#</Text>
                                            <Text style={{ textAlign: 'center', fontWeight: 'bold', fontSize: 20, color: '#cf2a3a', borderColor: '#cf2a3a', backgroundColor: '#cf2a3b1a', borderWidth: 1, paddingVertical: 8, paddingHorizontal: 25, borderRadius: 5 }}>
                                                {p.seatNumber}
                                            </Text>
                                        </View>
                                    )}
                                    <View style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                                        <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#545454' }}>Fare:</Text>
                                        <View style={{ borderColor: '#FFC107', backgroundColor: '#ffc10727', borderWidth: 2, borderRadius: 5, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15 }}>
                                            <Text style={{ fontSize: 16, fontWeight: '900', color: '#000' }}>₱</Text>
                                            <TextInput
                                                onChangeText={(text) => {updatePassenger(p.id, 'fare', Number(text.replace(/[^0-9.]/g, ''))); updatePassenger(p.id, 'originalFare', Number(text.replace(/[^0-9.]/g, ''))) }}
                                                value={String(p?.fare?.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? '')}
                                                keyboardType={'numeric'} placeholder='0.00'
                                                style={{ fontWeight: '900', textAlign: 'right', fontSize: 20, color: '#000' }}
                                            />
                                        </View>
                                    </View>
                                </View>
        
                                {p.passType != 'Passes' && (
                                    <View style={{ flexDirection: 'column', alignItems: 'flex-start', marginTop: 15, gap: 5 }}>
                                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>
                                            {paxsengerTypes.map((type) => (
                                                <TouchableOpacity
                                                    onPress={() => handleOnPaxTypeSelect(p.id, p.accommodationID, type?.id, type?.name, type.code)}
                                                    key={type.id}
                                                    style={{ backgroundColor: p.passType == type?.name ? '#cf2a3a' : 'transparent', borderColor: '#cf2a3a', borderWidth: 1, paddingVertical: 9, justifyContent: 'center', width: '32%', borderRadius: 5 }}>
                                                    <Text style={{ textAlign: 'center', fontSize: 20, color: p.passType == type?.name ? '#fff' : '#cf2a3a', fontWeight: '600' }}>{type?.name}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </View>
                                )}
        
                                <View style={{ marginTop: 20 }}>
                                    <Text style={{ fontSize: 17, fontWeight: 'bold', color: '#545454' }}>Full Name:</Text>
                                    <View style={{ borderWidth: 1, borderColor: '#B3B3B3', borderRadius: 5, height: 55, justifyContent: 'center' }}>
                                        <AutocompleteDropdown
                                            key={p.id}
                                            ref={ref => { if (ref) searchRefs.current[p.id] = ref; }}
                                            controller={controller => {
                                                if (controller) {
                                                    dropdownController.current[p.id] = controller;
                                                    if (p.name && !initializedRefs.current[p.id]) {
                                                        controller.setInputText(p.name);
                                                        initializedRefs.current[p.id] = true;
                                                    }
                                                }
                                            }}
                                            flatListProps={{ keyboardShouldPersistTaps: 'handled', nestedScrollEnabled: true }}
                                            direction={Platform.select({ android: 'down' })}
                                            onClear={() => handleClearAutoComplete(p.id)}
                                            dataSet={suggestions[p.id] ?? formattedPaxList}
                                            closeOnBlur={true}
                                            onSelectItem={item => { item && handleOnAutoComplete(item.id, p.id, p.accommodationID); }}
                                            onChangeText={(text) => {
                                                handleOnSearch(text.trim(), p.id);
                                                updatePassenger(p.id, 'name', text);
                                            }}
                                            debounce={300}
                                            suggestionsListContainerStyle={{ backgroundColor: '#f0f0f0' }}
                                            suggestionsListMaxHeight={Dimensions.get('window').height * 0.3}
                                            useFilter={false}
                                            textInputProps={{
                                                placeholder: 'Last Name, First Name',
                                                autoCorrect: false,
                                                autoCapitalize: 'none',
                                                style: { backgroundColor: '#fff', color: '#000', borderWidth: 1, borderColor: 'transparent', borderRadius: 2, fontWeight: '600', fontSize: 20, paddingHorizontal: 5, height: 50 }
                                            }}
                                            rightButtonsContainerStyle={{ right: 8, backgroundColor: '#fff', alignSelf: 'center' }}
                                            inputContainerStyle={{ borderRadius: 0, borderColor: '#B3B3B3' }}
                                            trimSearchText={true}
                                            containerStyle={{ flexGrow: 1, flexShrink: 1 }}
                                            showChevron={false}
                                            renderItem={(item) => <Text style={{ color: '#000', backgroundColor: '#f0f0f0', justifyContent: 'center', borderRadius: 5, fontSize: 16, paddingHorizontal: 5, paddingVertical: 15 }}>{item.title}</Text>}
                                        />
                                    </View>
                                </View>
        
                                <View style={{ width: '100%', marginTop: 10 }}>
                                    <Text style={{ fontSize: 17, fontWeight: 'bold', color: '#545454' }}>Gender:</Text>
                                    <View style={{ flexDirection: 'row', gap: 5, justifyContent: 'center' }}>
                                        {passGender.map((gender, index) => (
                                            <TouchableOpacity onPress={() => updatePassenger(p.id, 'gender', gender)} key={index}
                                                style={{ backgroundColor: p.gender == gender ? '#cf2a3a' : 'transparent', borderColor: '#cf2a3a', borderWidth: 1, width: '49%', borderRadius: 5, justifyContent: 'center', paddingVertical: 11 }}>
                                                <Text style={{ textAlign: 'center', fontSize: 18, fontWeight: '600', color: p.gender == gender ? '#fff' : '#cf2a3a' }}>{gender}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>
        
                                <View style={{ marginTop: 10, flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
                                    <View style={{ width: '40%' }}>
                                        <Text style={{ fontSize: 17, fontWeight: 'bold', color: '#545454' }}>Age:</Text>
                                        <View style={{ borderColor: '#B3B3B3', borderWidth: 1, borderRadius: 5, height: 50, justifyContent: 'center' }}>
                                            <TextInput value={String(p?.age ?? '')} onChangeText={(text) => updatePassenger(p.id, 'age', Number(text))} keyboardType='numeric' placeholder='Age' style={{ fontSize: 19, fontWeight: '600', color: '#000' }} />
                                        </View>
                                    </View>
                                    <View style={{ width: '57.5%' }}>
                                        <Text style={{ fontSize: 17, fontWeight: 'bold', color: '#545454' }}>Contact#:</Text>
                                        <View style={{ borderColor: '#B3B3B3', borderWidth: 1, borderRadius: 5, height: 50, justifyContent: 'center' }}>
                                            <TextInput value={p.contact ?? ''} placeholder='+63' keyboardType={'numeric'} onChangeText={(text) => updatePassenger(p.id, 'contact', text)} style={{ fontSize: 19, fontWeight: '600', color: '#000' }} />
                                        </View>
                                    </View>
                                </View>
        
                                <View style={{ marginTop: 10, flexDirection: 'row', gap: 8 }}>
                                    <View style={{ width: '40%' }}>
                                        <Text style={{ fontSize: 17, fontWeight: 'bold', color: '#545454' }}>Nationality:</Text>
                                        <View style={{ borderColor: '#B3B3B3', borderWidth: 1, borderRadius: 5, height: 50, justifyContent: 'center' }}>
                                            <TextInput value={p.nationality ?? 'Filipino'} onChangeText={(text) => updatePassenger(p.id, 'nationality', text)} defaultValue='Filipino' style={{ fontSize: 19, fontWeight: '600', color: '#000' }} />
                                        </View>
                                    </View>
                                    <View style={{ width: '57.5%' }}>
                                        <Text style={{ fontSize: 17, fontWeight: 'bold', color: '#545454' }}>Address:</Text>
                                        <View style={{ borderColor: '#B3B3B3', borderWidth: 1, borderRadius: 5, height: 50, justifyContent: 'center' }}>
                                            <TextInput value={p.address ?? ''} onChangeText={(text) => updatePassenger(p.id, 'address', text)} placeholder='Address' style={{ fontSize: 19, fontWeight: '600', color: '#000' }} />
                                        </View>
                                    </View>
                                </View>
        
                                <View style={{ marginTop: 5, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                                    <View style={{ flexDirection: 'row', gap: 20 }}>
                                        <TouchableOpacity
                                            disabled={p.passType == 'Child'}
                                            onPress={() => hasInfantChecker(p.id, passengerType?.find(i => i?.name == 'Infant')?.id ?? 0)}
                                            style={{ flexDirection: 'row', alignItems: 'center', marginTop: 15 }}>
                                            <Checkbox status={p.hasInfant ? 'checked' : 'unchecked'} color='#cf2a3a' uncheckedColor="#999" />
                                            <Text style={{ fontSize: 20, color: '#000' }}>Infant</Text>
                                        </TouchableOpacity>
                                        {isCargoable != 0 && (
                                            <TouchableOpacity onPress={() => hasCargoChecker(p.id)} style={{ flexDirection: 'row', alignItems: 'center', marginTop: 15 }}>
                                                <Checkbox status={p.hasCargo ? 'checked' : 'unchecked'} color='#cf2a3a' uncheckedColor="#999" />
                                                <Text style={{ fontSize: 20, color: '#000' }}>Cargo</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                </View>
        
                                {p.hasInfant && (
                                    <View style={{ marginTop: 30 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#949494', paddingTop: 8 }}>
                                            <Text style={{ fontSize: 20, fontWeight: '900', color: '#cf2a3a', marginBottom: 5 }}>Infant Details</Text>
                                            <TouchableOpacity
                                                onPress={() => {
                                                    const infantTypeId = passengerType?.find(i => i.name == 'Infant')?.id!;
                                                    if (!hasPasses) {
                                                        addInfant(p.seatNumber!, { name: '', gender: '', age: 0, passType_id: infantTypeId });
                                                    } else {
                                                        addInfant(index, { name: '', gender: '', age: 0, passType_id: infantTypeId });
                                                    }
                                                }}
                                                style={{ backgroundColor: '#cf2a3a', borderColor: '#cf2a3a', borderWidth: 1, padding: 8, elevation: 3, borderRadius: 5, flexDirection: 'row', gap: 5, alignItems: 'center' }}>
                                                <Ionicons name={'add'} size={20} color={'#fff'} />
                                                <Text style={{ color: '#fff', fontWeight: '600', fontSize: 18 }}>Add Infant</Text>
                                            </TouchableOpacity>
                                        </View>
                                        {p.infant?.map((i, infantIdx) => (
                                            <View key={`${p.id}-${infantIdx}`}>
                                                <View style={{ marginTop: 30 }}>
                                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <Text style={{ fontSize: 17, fontWeight: 'bold', color: '#545454' }}>Full Name:</Text>
                                                        {infantIdx != 0 && (
                                                            <TouchableOpacity onPress={() => removeInfant(p.seatNumber!, infantIdx)} style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                                <Ionicons name={'close'} size={20} color={'#cf2a3a'} />
                                                                <Text style={{ color: '#cf2a3a', fontWeight: '600', fontSize: 19 }}>Remove</Text>
                                                            </TouchableOpacity>
                                                        )}
                                                    </View>
                                                    <View style={{ borderColor: '#B3B3B3', borderWidth: 1, borderRadius: 5, height: 55, justifyContent: 'center' }}>
                                                        <AutocompleteDropdown
                                                            key={`${p.id}-${infantIdx}`}
                                                            ref={ref => { if (ref) infantSearchRefs.current[`${p.id}-${infantIdx}`] = ref; }}
                                                            controller={controller => {
                                                                if (controller) {
                                                                    InfantDropController.current[`${p.id}-${infantIdx}`] = controller;
                                                                    if (i.name && !initializedInfantRefs.current[`${p.id}-${infantIdx}`]) {
                                                                        controller.setInputText(i.name);
                                                                        initializedInfantRefs.current[`${p.id}-${infantIdx}`] = true;
                                                                    }
                                                                }
                                                            }}
                                                            direction={Platform.select({ android: 'down' })}
                                                            onClear={() => handleInfantClearAutoComplete(p.pax_id, infantIdx)}
                                                            dataSet={infantSuggestions[`${p.id}-${infantIdx}`] ?? formattedInfantList}
                                                            closeOnBlur={true}
                                                            flatListProps={{ keyboardShouldPersistTaps: 'handled', nestedScrollEnabled: true }}
                                                            onSelectItem={item => { item && handleOnInfantAutoComplete(item.id, p.id, p.accommodationID, infantIdx); }}
                                                            onChangeText={(text) => {
                                                                handleOnInfantSearch(text.trim(), p.id);
                                                                updateInfant(p.id, infantIdx, 'name', text);
                                                            }}
                                                            debounce={300}
                                                            suggestionsListContainerStyle={{ backgroundColor: '#f0f0f0' }}
                                                            suggestionsListMaxHeight={Dimensions.get('window').height * 0.18}
                                                            useFilter={false}
                                                            textInputProps={{
                                                                placeholder: 'Last Name, First Name',
                                                                autoCorrect: false,
                                                                autoCapitalize: 'none',
                                                                style: { backgroundColor: '#fff', color: '#000', borderWidth: 1, borderColor: 'transparent', borderRadius: 2, fontSize: 20, fontWeight: '600', paddingHorizontal: 5, height: 50 }
                                                            }}
                                                            rightButtonsContainerStyle={{ right: 8, backgroundColor: '#fff', alignSelf: 'center' }}
                                                            inputContainerStyle={{ borderRadius: 0, borderColor: '#B3B3B3' }}
                                                            trimSearchText={true}
                                                            containerStyle={{ flexGrow: 1, flexShrink: 1 }}
                                                            showChevron={false}
                                                            renderItem={(item) => <Text style={{ color: '#000', backgroundColor: '#f0f0f0', paddingVertical: 15, paddingHorizontal: 5, borderRadius: 5 }}>{item.title}</Text>}
                                                        />
                                                    </View>
                                                </View>
                                                <View style={{ marginTop: 10, flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
                                                    <View style={{ width: '40%' }}>
                                                        <Text style={{ fontSize: 17, fontWeight: 'bold', color: '#545454' }}>Age:</Text>
                                                        <View style={{ borderColor: '#B3B3B3', borderWidth: 1, borderRadius: 5, height: 50, justifyContent: 'center' }}>
                                                            <TextInput value={String(i.age ?? '')} onChangeText={(text) => updateInfant(p.id, infantIdx, 'age', Number(text))} keyboardType='numeric' placeholder='Age' style={{ fontSize: 19, fontWeight: '600', color: '#000' }} />
                                                        </View>
                                                    </View>
                                                    <View style={{ width: '56%' }}>
                                                        <Text style={{ fontSize: 17, fontWeight: 'bold', color: '#545454' }}>Gender:</Text>
                                                        <View style={{ flexDirection: 'row', gap: 5 }}>
                                                            {passGender.map((infntgender, infIndex) => (
                                                                <TouchableOpacity onPress={() => updateInfant(p.id, infantIdx, 'gender', infntgender)} key={infIndex}
                                                                    style={{ backgroundColor: p.infant?.[infantIdx]?.gender == infntgender ? '#cf2a3a' : 'transparent', borderColor: '#cf2a3a', borderWidth: 1, width: '50%', borderRadius: 5, justifyContent: 'center', paddingVertical: 12 }}>
                                                                    <Text style={{ textAlign: 'center', fontSize: 16, fontWeight: '600', color: p.infant?.[infantIdx]?.gender == infntgender ? '#fff' : '#cf2a3a' }}>{infntgender}</Text>
                                                                </TouchableOpacity>
                                                            ))}
                                                        </View>
                                                    </View>
                                                </View>
                                            </View>
                                        ))}
                                    </View>
                                )}
        
                                {p.hasCargo == true && (
                                    <View style={{ marginTop: 40 }}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 10, borderTopColor: '#949494', borderTopWidth: 1, paddingTop: 8 }}>
                                            <Text style={{ fontSize: 20, fontWeight: '900', color: '#cf2a3a', marginBottom: 5 }}>Cargo Details</Text>
                                            <TouchableOpacity onPress={() => addPaxCargo(p.seatNumber!, { cargoAmount: 0.00, quantity: 1 })}
                                                style={{ backgroundColor: '#cf2a3a', borderColor: '#cf2a3a', borderWidth: 1, padding: 8, borderRadius: 5, flexDirection: 'row', gap: 5, alignItems: 'center' }}>
                                                <Ionicons name={'add'} size={20} color={'#fff'} />
                                                <Text style={{ color: '#fff', fontWeight: '600', fontSize: 19 }}>Add Cargo</Text>
                                            </TouchableOpacity>
                                        </View>
                                        {(p.cargo ?? []).map((c, cargoIndex) => (
                                            <View key={`${p.id}-${cargoIndex}`}>
                                                {cargoIndex != 0 && (
                                                    <TouchableOpacity onPress={() => removeCargo(p.seatNumber, index, cargoIndex)} style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 10, alignSelf: 'flex-end' }}>
                                                        <Ionicons name={'close'} size={20} color={'#cf2a3a'} />
                                                    </TouchableOpacity>
                                                )}
                                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 5 }}>
                                                    <View style={{ flexDirection: 'column', alignSelf: 'flex-start' }}>
                                                        <Text style={{ fontSize: 17, fontWeight: 'bold', color: '#494949' }}>Amount:</Text>
                                                        <View style={{ borderColor: '#FFC107', backgroundColor: '#ffc10727', borderWidth: 2, borderRadius: 5, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 8 }}>
                                                            <Text style={{ fontSize: 20, color: '#000' }}>₱ </Text>
                                                            <Text style={{ fontWeight: 'bold', textAlign: 'right', fontSize: 20 }}>
                                                                {ComputedCargoAmount(c).amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                            </Text>
                                                        </View>
                                                    </View>
                                                    {c.cargoType && c.cargoType != 'Rolling Cargo' && (
                                                        <View style={{ flexDirection: 'column', alignItems: 'flex-end' }}>
                                                            <Text style={{ fontSize: 17, fontWeight: 'bold', color: '#545454' }}>Quantity:</Text>
                                                            <View style={{ flexDirection: 'row', alignItems: 'center', borderColor: '#B3B3B3', paddingHorizontal: 5, borderWidth: 1, borderRadius: 5 }}>
                                                                <TouchableOpacity disabled={c.quantity == 1} onPress={() => handleCargoQuantity('minus', cargoIndex, p.id)} style={{ paddingRight: 5 }}>
                                                                    <Ionicons name={'remove'} size={25} color={c.quantity == 1 ? "#d4d4d4ff" : undefined} />
                                                                </TouchableOpacity>
                                                                <Text style={{ paddingHorizontal: 14, fontSize: 20, fontWeight: 'bold', borderRightColor: '#B3B3B3', borderLeftColor: '#B3B3B3', borderLeftWidth: 1, borderRightWidth: 1, paddingVertical: 5 }}>
                                                                    {c.quantity}
                                                                </Text>
                                                                <TouchableOpacity onPress={() => handleCargoQuantity('add', cargoIndex, p.id)} style={{ paddingLeft: 5 }}>
                                                                    <Ionicons name={'add'} size={25} />
                                                                </TouchableOpacity>
                                                            </View>
                                                        </View>
                                                    )}
                                                </View>
                                                <View style={{ width: '100%' }}>
                                                    <Text style={{ fontSize: 17, fontWeight: 'bold', color: '#545454' }}>Cargo Type:</Text>
                                                    <View style={{ borderColor: '#B3B3B3', borderWidth: 1, borderRadius: 5 }}>
                                                        <Dropdown
                                                            onChange={(item) => handleOnUpdateCargo(p.id, cargoIndex, 'cargoType', item.label, 'cargoTypeID', item.value)}
                                                            value={c.cargoTypeID}
                                                            data={cargoProperties?.data?.cargo_types?.map((type: any) => ({ label: type.name, value: type.id })) ?? []}
                                                            labelField="label" valueField="value" placeholder="Select Cargo Type"
                                                            style={{ height: 50, width: '100%', paddingHorizontal: 10 }}
                                                            containerStyle={{ alignSelf: 'flex-start', width: '90%' }}
                                                            selectedTextStyle={{ fontSize: 18, lineHeight: 35, fontWeight: '600', color: '#000' }}
                                                            renderRightIcon={() => <Ionicons name="chevron-down" size={18} />}
                                                            dropdownPosition="bottom"
                                                            renderItem={(item) => <View style={{ width: '80%', padding: 8 }}><Text style={{ fontSize: 18, color: '#000' }}>{item.label}</Text></View>}
                                                        />
                                                    </View>
                                                </View>
                                                {c.cargoType == 'Rolling Cargo' ? (
                                                    <View>
                                                        <View style={{ width: '100%', marginTop: 10 }}>
                                                            <Text style={{ fontSize: 17, fontWeight: 'bold', color: '#545454' }}>Brand:</Text>
                                                            <View style={{ borderColor: '#B3B3B3', borderWidth: 1, borderRadius: 5 }}>
                                                                <Dropdown
                                                                    onChange={(item) => handleOnUpdateCargo(p.id, cargoIndex, 'cargoBrand', item.label, 'cargoBrandID', item.value)}
                                                                    value={c.cargoBrandID}
                                                                    data={cargoProperties?.data?.brands?.map((b: any) => ({ label: b.name, value: b.id })) ?? []}
                                                                    labelField="label" valueField="value" placeholder="Select Brand"
                                                                    style={{ height: 50, width: '100%', paddingHorizontal: 10 }}
                                                                    containerStyle={{ alignSelf: 'flex-start', width: '90%' }}
                                                                    selectedTextStyle={{ fontSize: 18, lineHeight: 35, fontWeight: '600', color: '#000' }}
                                                                    renderRightIcon={() => <Ionicons name="chevron-down" size={15} />}
                                                                    dropdownPosition="bottom"
                                                                    renderItem={(item) => <View style={{ width: '80%', padding: 8 }}><Text style={{ fontSize: 18, color: '#000' }}>{item.label}</Text></View>}
                                                                />
                                                            </View>
                                                        </View>
                                                        <View style={{ marginTop: 10, flexDirection: 'row', justifyContent: 'space-between' }}>
                                                            <View style={{ width: '50%' }}>
                                                                <Text style={{ fontSize: 17, fontWeight: 'bold', color: '#545454' }}>{'Specifications (CC):'}</Text>
                                                                <View style={{ borderColor: '#B3B3B3', borderWidth: 1, borderRadius: 5, height: 45, justifyContent: 'center' }}>
                                                                    <Dropdown
                                                                        onChange={(item) => handleOnUpdateCargo(p.id, cargoIndex, 'cargoSpecification', item.label, 'cargoSpecificationID', item.value)}
                                                                        value={c.cargoSpecificationID}
                                                                        data={cargoProperties?.data?.cargo_options?.filter((opt: any) => opt.specification).map((s: any) => ({ label: String(s.specification), value: s.id })) ?? []}
                                                                        labelField="label" valueField="value" placeholder="Select CC"
                                                                        style={{ height: 50, width: '100%', paddingHorizontal: 10 }}
                                                                        containerStyle={{ alignSelf: 'flex-start', width: '42%' }}
                                                                        selectedTextStyle={{ fontSize: 18, lineHeight: 35, fontWeight: '600', color: '#000' }}
                                                                        renderRightIcon={() => <Ionicons name="chevron-down" size={15} />}
                                                                        dropdownPosition="bottom"
                                                                        renderItem={(item) => <View style={{ width: '80%', padding: 8 }}><Text style={{ fontSize: 18, color: '#000' }}>{item.label}</Text></View>}
                                                                    />
                                                                </View>
                                                            </View>
                                                            <View style={{ width: '48%' }}>
                                                                <Text style={{ fontSize: 17, fontWeight: 'bold', color: '#545454' }}>Plate#:</Text>
                                                                <View style={{ borderColor: '#B3B3B3', borderWidth: 1, borderRadius: 5, height: 45, justifyContent: 'center' }}>
                                                                    <TextInput value={c.cargoPlateNo} onChangeText={(text) => updateCargo(p.id, cargoIndex, 'cargoPlateNo', text)} placeholder='Plate#' style={{ fontSize: 19, fontWeight: '600', color: '#000' }} />
                                                                </View>
                                                            </View>
                                                        </View>
                                                    </View>
                                                ) : c.cargoType == 'Parcel' ? (
                                                    <View style={{ marginTop: 5 }}>
                                                        <Text style={{ fontSize: 17, fontWeight: 'bold', color: '#545454' }}>Parcel Category:</Text>
                                                        <View style={{ borderColor: '#B3B3B3', borderWidth: 1, borderRadius: 5 }}>
                                                            <Dropdown
                                                                onChange={(item) => handleOnUpdateCargo(p.id, cargoIndex, 'parcelCategory', item.label, 'parcelCategoryID', item.value)}
                                                                value={c.parcelCategoryID}
                                                                data={cargoProperties?.data?.parcel_categories?.map((category: any) => ({ label: category.name.slice(1, -1), value: category.id })) ?? []}
                                                                labelField="label" valueField="value" placeholder="Select Category"
                                                                style={{ height: 50, width: '100%', paddingHorizontal: 10 }}
                                                                containerStyle={{ alignSelf: 'flex-start', width: '85%' }}
                                                                selectedTextStyle={{ fontSize: 19, lineHeight: 35, fontWeight: '600', color: '#000' }}
                                                                renderRightIcon={() => <Ionicons name="chevron-down" size={15} />}
                                                                dropdownPosition="bottom"
                                                                renderItem={(item) => <View style={{ width: '80%', padding: 8 }}><Text style={{ fontSize: 18, color: '#000' }}>{item.label}</Text></View>}
                                                            />
                                                        </View>
                                                    </View>
                                                ) : (
                                                    <View />
                                                )}
                                            </View>
                                        ))}
                                    </View>
                                )}
                            </View>
                        ))}
        
                        {specialInfantPax.map(inf => (
                            <View style={{ padding: 10, backgroundColor: '#fff', elevation: 5, borderRadius: 8, borderWidth: 1, borderColor: '#B3B3B3' }} key={inf.id}>
                                <Text style={{ fontSize: 20, fontWeight: '900', color: '#cf2a3a', marginBottom: 5 }}>Infant Details</Text>
                                <View style={{ marginTop: 20 }}>
                                    <Text style={{ fontSize: 17, fontWeight: 'bold', color: '#545454' }}>Full Name:</Text>
                                    <View style={{ borderColor: '#B3B3B3', borderWidth: 1, borderRadius: 5, height: 45, justifyContent: 'center' }}>
                                        <TextInput value={inf.name} onChangeText={(text) => updatePassenger(inf.id, 'name', text)} placeholder='Name' style={{ fontSize: 19, fontWeight: '600' }} />
                                    </View>
                                </View>
                                <View style={{ marginTop: 5, flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
                                    <View style={{ width: '40%' }}>
                                        <Text style={{ fontSize: 17, fontWeight: 'bold', color: '#545454' }}>Age:</Text>
                                        <View style={{ borderColor: '#B3B3B3', borderWidth: 1, borderRadius: 5, height: 45, justifyContent: 'center' }}>
                                            <TextInput value={String(inf.age ?? '')} onChangeText={(text) => updatePassenger(inf.id, 'age', Number(text))} keyboardType='numeric' placeholder='Age' style={{ fontSize: 19, fontWeight: '600' }} />
                                        </View>
                                    </View>
                                    <View style={{ width: '56%' }}>
                                        <Text style={{ fontSize: 17, fontWeight: 'bold', color: '#545454' }}>Gender:</Text>
                                        <View style={{ flexDirection: 'row', gap: 5 }}>
                                            {passGender.map((infntgender) => (
                                                <TouchableOpacity onPress={() => updatePassenger(inf.id, 'gender', infntgender)} key={infntgender}
                                                    style={{ backgroundColor: inf.gender == infntgender ? '#cf2a3a' : 'transparent', borderColor: '#cf2a3a', borderWidth: 1, width: '50%', borderRadius: 5, justifyContent: 'center', paddingVertical: 12 }}>
                                                    <Text style={{ textAlign: 'center', fontSize: 17, fontWeight: '600', color: inf.gender == infntgender ? '#fff' : '#cf2a3a' }}>{infntgender}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </View>
                                </View>
                            </View>
                        ))}
        
                        {hasPasses && (
                            <>
                                <View style={{ padding: 10, backgroundColor: '#fff', elevation: 5, borderRadius: 8, borderWidth: 1, borderColor: '#B3B3B3' }}>
                                    <Text style={{ fontSize: 17, fontWeight: 'bold', color: '#545454' }}>Approved by:</Text>
                                    <View style={{ borderColor: '#B3B3B3', borderWidth: 1, borderRadius: 5, height: 50, justifyContent: 'center' }}>
                                        <TextInput onChangeText={(text) => setApprovedBy(text)} value={approvedBy} placeholder='First Last' style={{ fontSize: 19, fontWeight: '600' }} />
                                    </View>
                                </View>
                                <Pressable onPress={() => handleAddPasses()} style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'center', paddingVertical: 10, paddingHorizontal: 15, borderRadius: 8, backgroundColor: '#cf2a3a', elevation: 2 }}>
                                    <Ionicons name={'add'} color={'#fff'} size={20} />
                                    <Text style={{ color: '#fff', fontWeight: '600' }}>Add Passes</Text>
                                </Pressable>
                            </>
                        )}
                    </>
                )}
            </View>
        </View>
    );
}