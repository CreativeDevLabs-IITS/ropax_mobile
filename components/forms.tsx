import { FetchPassengerType } from '@/api/passengerType';
import { PaxCargoProperties, useCargo } from '@/context/cargoProps';
import { usePassesType } from '@/context/passes';
import { useTrip } from '@/context/trip';
import { Ionicons } from '@expo/vector-icons';
import * as Crypto from 'expo-crypto';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Dimensions, Platform, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
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

type PassengerCardProps = {
    p: any;
    index: number;
    hasPasses: boolean;
    errorForm: (string | number)[];
    paxsengerTypes: PassTypeProps[];
    passengerType: PassTypeProps[] | null;
    paxFares: PaxFareProps[] | null;
    cargoProperties: any;
    isCargoable: number;
    routeID: number;
    vessel_id: number;
    isSpecialInf: boolean;
    suggestions: { [key: string]: any[] };
    infantSuggestions: { [key: string]: any[] };
    formattedPaxList: { id: string; title: string }[];
    formattedInfantList: { id: string; title: string }[];
    dropdownController: React.MutableRefObject<{ [key: string]: any }>;
    initializedRefs: React.MutableRefObject<{ [key: string]: boolean }>;
    InfantDropController: React.MutableRefObject<{ [key: string]: any }>;
    initializedInfantRefs: React.MutableRefObject<{ [key: string]: boolean }>;
    onPassesRemove: (id: string) => void;
    onPaxTypeSelect: (passengerId: string | number, accommodationId: number, typeID: number, paxType: string, paxTypeCode: string) => void;
    onFareChange: (id: string | number, value: number) => void;
    onSearch: (text: string, paxId: string | number) => void;
    onInfantSearch: (text: string, paxId: string | number) => void;
    onAutoComplete: (itemId: string, targetPaxId: string | number, targetAccomId: number) => void;
    onInfantAutoComplete: (itemId: string, targetPaxId: string | number, targetAccomId: number, infantIndex: number | string) => void;
    onClearAutoComplete: (paxId: string | number) => void;
    onInfantClearAutoComplete: (paxId: string | number, infantIndex: number) => void;
    onUpdatePassenger: (id: string | number, key: string, value: any) => void;
    onUpdateInfant: (id: string | number, index: number, key: string, value: any) => void;
    onUpdateCargoValue: (paxId: string | number, cargoIndex: number, key: string, value: any) => void;
    onHasInfantChecker: (paxId: string | number, typeId: number) => void;
    onHasCargoChecker: (paxId: string | number) => void;
    onAddInfant: (identifier: string | number, newInfant: InfantProps) => void;
    onAddPaxCargo: (identifier: string | number, newCargo: PaxCargoProperties) => void;
    onRemoveInfant: (seat: string | number, infantIndex: number) => void;
    onRemoveCargo: (seat: string | number | null, paxIndex: number, cargoIndex: number) => void;
    onCargoQuantity: (operation: 'add' | 'minus', cargoIndex: number, paxId: string | number) => void;
}

const PassengerCard = memo(({
    p, index, hasPasses, errorForm, paxsengerTypes, passengerType,
    cargoProperties, isCargoable,
    suggestions, infantSuggestions, formattedPaxList, formattedInfantList,
    dropdownController, initializedRefs, InfantDropController, initializedInfantRefs, isSpecialInf,
    onPassesRemove, onPaxTypeSelect, onFareChange, onSearch, onInfantSearch,
    onAutoComplete, onInfantAutoComplete, onClearAutoComplete, onInfantClearAutoComplete,
    onUpdatePassenger, onUpdateInfant, onUpdateCargoValue,
    onHasInfantChecker, onHasCargoChecker, onAddInfant, onAddPaxCargo,
    onRemoveInfant, onRemoveCargo, onCargoQuantity,
}: PassengerCardProps) => {
    const infantTypeId = passengerType?.find(i => i.name === 'Infant')?.id ?? 0;
    const isError = errorForm.includes(p.seatNumber ?? '');

    return (
        <View style={[styles.card, isError ? styles.cardError : styles.cardNormal]}>
            {hasPasses && index !== 0 && (
                <TouchableOpacity onPress={() => onPassesRemove(p.id)} style={styles.removePassBtn}>
                    <Ionicons name={'close-circle'} size={40} color={'#cf2a3a'} />
                </TouchableOpacity>
            )}

            <View style={styles.rowBetween}>
                {p.passType !== 'Passes' && (
                    <View style={styles.colStart}>
                        <Text style={styles.seatLabel}>{p.accommodation} Seat#</Text>
                        <Text style={styles.seatNumber}>{p.seatNumber}</Text>
                    </View>
                )}
                <View style={styles.colStart}>
                    <Text style={styles.fareLabel}>Fare:</Text>
                    <View style={styles.fareBox}>
                        <Text style={styles.fareCurrency}>₱</Text>
                        <TextInput
                            onChangeText={(text) => onFareChange(p.id, Number(text.replace(/[^0-9.]/g, '')))}
                            value={String(p?.fare?.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? '')}
                            keyboardType={'numeric'}
                            placeholder='0.00'
                            style={styles.fareInput}
                            placeholderTextColor={'#b3b3b3'}
                        />
                    </View>
                </View>
            </View>

            {p.passType !== 'Passes' && (
                <View style={{ flexDirection: 'column', alignItems: 'flex-start', marginTop: 15, gap: 5 }}>
                    <View style={styles.typeRow}>
                        {paxsengerTypes.map((type) => (
                            <TouchableOpacity
                                key={type.id}
                                onPress={() => onPaxTypeSelect(p.id, p.accommodationID, type?.id, type?.name, type.code)}
                                style={[styles.typeButtonBase, p.passType === type?.name ? styles.typeButtonActive : styles.typeButtonInactive]}
                            >
                                <Text style={p.passType === type?.name ? styles.typeButtonTextActive : styles.typeButtonTextInactive}>
                                    {type?.name}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            )}

            <View style={{ marginTop: 20 }}>
                <Text style={styles.fieldLabel}>Full Name:</Text>
                <View style={styles.inputBorder}>
                    <AutocompleteDropdown
                        key={p.id}
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
                        onClear={() => onClearAutoComplete(p.id)}
                        dataSet={suggestions[p.id] ?? formattedPaxList}
                        closeOnBlur={true}
                        onSelectItem={item => { item && onAutoComplete(item.id, p.id, p.accommodationID); }}
                        onChangeText={(text) => {
                            onSearch(text.trim(), p.id);
                            onUpdatePassenger(p.id, 'name', text);
                        }}
                        debounce={300}
                        suggestionsListContainerStyle={{ backgroundColor: '#f0f0f0' }}
                        suggestionsListMaxHeight={Dimensions.get('window').height * 0.3}
                        useFilter={false}
                        textInputProps={{
                            placeholder: 'Last Name, First Name',
                            autoCorrect: false,
                            autoCapitalize: 'none',
                            style: styles.autocompleteTextInput,
                        }}
                        rightButtonsContainerStyle={styles.autocompleteRightButtons}
                        inputContainerStyle={styles.autocompleteInputContainer}
                        trimSearchText={true}
                        containerStyle={{ flexGrow: 1, flexShrink: 1 }}
                        showChevron={false}
                        renderItem={(item) => (
                            <Text style={styles.autocompleteItem}>{item.title}</Text>
                        )}
                    />
                </View>
            </View>

            <View style={{ width: '100%', marginTop: 10 }}>
                <Text style={styles.fieldLabel}>Gender:</Text>
                <View style={styles.genderRow}>
                    {passGender.map((gender, gIdx) => (
                        <TouchableOpacity
                            key={gIdx}
                            onPress={() => onUpdatePassenger(p.id, 'gender', gender)}
                            style={[styles.genderButtonBase, p.gender === gender ? styles.genderButtonActive : styles.genderButtonInactive]}
                        >
                            <Text style={p.gender === gender ? styles.genderTextActive : styles.genderTextInactive}>{gender}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            <View style={styles.ageContactRow}>
                <View style={styles.ageWrap}>
                    <Text style={styles.fieldLabel}>Age:</Text>
                    <View style={styles.inputBorderShort}>
                        <TextInput
                            value={String(p?.age ?? '')}
                            onChangeText={(text) => onUpdatePassenger(p.id, 'age', Number(text))}
                            keyboardType='numeric'
                            placeholder='Age'
                            style={styles.textInput}
                        />
                    </View>
                </View>
                <View style={styles.contactWrap}>
                    <Text style={styles.fieldLabel}>Contact#:</Text>
                    <View style={styles.inputBorderShort}>
                        <TextInput
                            value={p.contact ?? ''}
                            placeholder='+63'
                            keyboardType={'numeric'}
                            onChangeText={(text) => onUpdatePassenger(p.id, 'contact', text)}
                            style={styles.textInput}
                        />
                    </View>
                </View>
            </View>

            <View style={styles.nationalityRow}>
                <View style={styles.ageWrap}>
                    <Text style={styles.fieldLabel}>Nationality:</Text>
                    <View style={styles.inputBorderShort}>
                        <TextInput
                            value={p.nationality ?? 'Filipino'}
                            onChangeText={(text) => onUpdatePassenger(p.id, 'nationality', text)}
                            defaultValue='Filipino'
                            style={styles.textInput}
                        />
                    </View>
                </View>
                <View style={styles.contactWrap}>
                    <Text style={styles.fieldLabel}>Address:</Text>
                    <View style={styles.inputBorderShort}>
                        <TextInput
                            value={p.address ?? ''}
                            onChangeText={(text) => onUpdatePassenger(p.id, 'address', text)}
                            placeholder='Address'
                            style={styles.textInput}
                        />
                    </View>
                </View>
            </View>

            <View style={styles.checkboxRow}>
                <View style={styles.checkboxGroup}>
                    {isSpecialInf == false && (
                        <TouchableOpacity
                            disabled={p.passType === 'Child'}
                            onPress={() => onHasInfantChecker(p.id, infantTypeId)}
                            style={styles.checkboxItem}
                        >
                            <Checkbox status={p.hasInfant ? 'checked' : 'unchecked'} color='#cf2a3a' uncheckedColor="#999" />
                            <Text style={styles.checkboxLabel}>Infant</Text>
                        </TouchableOpacity>
                    )}
                    {isCargoable !== 0 && (
                        <TouchableOpacity onPress={() => onHasCargoChecker(p.id)} style={styles.checkboxItem}>
                            <Checkbox status={p.hasCargo ? 'checked' : 'unchecked'} color='#cf2a3a' uncheckedColor="#999" />
                            <Text style={styles.checkboxLabel}>Cargo</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {p.hasInfant && (
                <View style={styles.infantSection}>
                    <View style={styles.sectionHeaderRow}>
                        <Text style={styles.sectionTitle}>Infant Details</Text>
                        <TouchableOpacity
                            onPress={() => {
                                if (!hasPasses) {
                                    onAddInfant(p.seatNumber!, { name: '', gender: '', age: 0, passType_id: infantTypeId });
                                } else {
                                    onAddInfant(index, { name: '', gender: '', age: 0, passType_id: infantTypeId });
                                }
                            }}
                            style={styles.addButton}
                        >
                            <Ionicons name={'add'} size={20} color={'#fff'} />
                            <Text style={styles.addButtonText}>Add Infant</Text>
                        </TouchableOpacity>
                    </View>

                    {p.infant?.map((i: any, infantIdx: number) => (
                        <View key={`${p.id}-${infantIdx}`}>
                            <View style={{ marginTop: 30 }}>
                                <View style={styles.removeRow}>
                                    <Text style={styles.fieldLabel}>Full Name:</Text>
                                    {infantIdx !== 0 && (
                                        <TouchableOpacity
                                            onPress={() => onRemoveInfant(p.seatNumber!, infantIdx)}
                                            style={styles.removeButton}
                                        >
                                            <Ionicons name={'close'} size={20} color={'#cf2a3a'} />
                                            <Text style={styles.removeText}>Remove</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                                <View style={styles.inputBorder}>
                                    <AutocompleteDropdown
                                        key={`${p.id}-${infantIdx}`}
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
                                        onClear={() => onInfantClearAutoComplete(p.pax_id, infantIdx)}
                                        dataSet={infantSuggestions[`${p.id}-${infantIdx}`] ?? formattedInfantList}
                                        closeOnBlur={true}
                                        flatListProps={{ keyboardShouldPersistTaps: 'handled', nestedScrollEnabled: true }}
                                        onSelectItem={item => { item && onInfantAutoComplete(item.id, p.id, p.accommodationID, infantIdx); }}
                                        onChangeText={(text) => {
                                            onInfantSearch(text.trim(), p.id);
                                            onUpdateInfant(p.id, infantIdx, 'name', text);
                                        }}
                                        debounce={300}
                                        suggestionsListContainerStyle={{ backgroundColor: '#f0f0f0' }}
                                        suggestionsListMaxHeight={Dimensions.get('window').height * 0.18}
                                        useFilter={false}
                                        textInputProps={{
                                            placeholder: 'Last Name, First Name',
                                            autoCorrect: false,
                                            autoCapitalize: 'none',
                                            style: styles.autocompleteTextInput,
                                        }}
                                        rightButtonsContainerStyle={styles.autocompleteRightButtons}
                                        inputContainerStyle={styles.autocompleteInputContainer}
                                        trimSearchText={true}
                                        containerStyle={{ flexGrow: 1, flexShrink: 1 }}
                                        showChevron={false}
                                        renderItem={(item) => (
                                            <Text style={{ color: '#000', backgroundColor: '#f0f0f0', paddingVertical: 15, paddingHorizontal: 5, borderRadius: 5 }}>
                                                {item.title}
                                            </Text>
                                        )}
                                    />
                                </View>
                            </View>

                            <View style={styles.ageContactRow}>
                                <View style={styles.ageWrap}>
                                    <Text style={styles.fieldLabel}>Age:</Text>
                                    <View style={styles.inputBorderShort}>
                                        <TextInput
                                            value={String(i.age ?? '')}
                                            onChangeText={(text) => onUpdateInfant(p.id, infantIdx, 'age', Number(text))}
                                            keyboardType='numeric'
                                            placeholder='Age'
                                            style={styles.textInput}
                                        />
                                    </View>
                                </View>
                                <View style={{ width: '56%' }}>
                                    <Text style={styles.fieldLabel}>Gender:</Text>
                                    <View style={{ flexDirection: 'row', gap: 5 }}>
                                        {passGender.map((infntgender, infIndex) => (
                                            <TouchableOpacity
                                                key={infIndex}
                                                onPress={() => onUpdateInfant(p.id, infantIdx, 'gender', infntgender)}
                                                style={[
                                                    styles.infantGenderButtonBase,
                                                    p.infant?.[infantIdx]?.gender === infntgender
                                                        ? styles.genderButtonActive
                                                        : styles.genderButtonInactive
                                                ]}
                                            >
                                                <Text style={
                                                    p.infant?.[infantIdx]?.gender === infntgender
                                                        ? { textAlign: 'center', fontSize: 16, fontWeight: '600', color: '#fff' }
                                                        : { textAlign: 'center', fontSize: 16, fontWeight: '600', color: '#cf2a3a' }
                                                }>
                                                    {infntgender}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>
                            </View>
                        </View>
                    ))}
                </View>
            )}

            {p.hasCargo === true && (
                <View style={styles.cargoSection}>
                    <View style={styles.cargoHeaderRow}>
                        <Text style={styles.sectionTitle}>Cargo Details</Text>
                        <TouchableOpacity
                            onPress={() => onAddPaxCargo(p.seatNumber!, { cargoAmount: 0, quantity: 1 })}
                            style={styles.addButton}
                        >
                            <Ionicons name={'add'} size={20} color={'#fff'} />
                            <Text style={styles.addButtonText}>Add Cargo</Text>
                        </TouchableOpacity>
                    </View>

                    {(p.cargo ?? []).map((c: any, cargoIndex: number) => (
                        <View key={`${p.id}-${cargoIndex}`}>
                            {cargoIndex !== 0 && (
                                <TouchableOpacity
                                    onPress={() => onRemoveCargo(p.seatNumber, index, cargoIndex)}
                                    style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 10, alignSelf: 'flex-end' }}
                                >
                                    <Ionicons name={'close'} size={20} color={'#cf2a3a'} />
                                </TouchableOpacity>
                            )}

                            <View style={styles.rowBetween}>
                                <View style={styles.colStart}>
                                    <Text style={styles.cargoAmountLabel}>Amount:</Text>
                                    <View style={styles.cargoAmountBox}>
                                        <Text style={{ fontSize: 20, color: '#000' }}>₱ </Text>
                                        <TextInput
                                            value={c.cargoAmount != null ? String(c.cargoAmount) : ''}
                                            onChangeText={text => onUpdateCargoValue(p.id, cargoIndex, 'cargoAmount', Number(text) || 0)}
                                            keyboardType="numeric"
                                            placeholder="0.00"
                                            style={styles.cargoAmountText}
                                        />
                                    </View>
                                </View>

                                {c.cargoType && c.cargoType !== 'Rolling Cargo' && (
                                    <View style={styles.qtyRow}>
                                        <Text style={styles.fieldLabel}>Quantity:</Text>
                                        <View style={styles.qtyBox}>
                                            <TouchableOpacity
                                                disabled={c.quantity === 1}
                                                onPress={() => onCargoQuantity('minus', cargoIndex, p.id)}
                                                style={{ paddingRight: 5 }}
                                            >
                                                <Ionicons name={'remove'} size={25} color={c.quantity === 1 ? "#d4d4d4ff" : "#000"} />
                                            </TouchableOpacity>
                                            <Text style={styles.qtyText}>{c.quantity}</Text>
                                            <TouchableOpacity
                                                onPress={() => onCargoQuantity('add', cargoIndex, p.id)}
                                                style={{ paddingLeft: 5 }}
                                            >
                                                <Ionicons name={'add'}  size={25} color={"#000"} />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                )}
                            </View>

                            <View style={{ width: '100%' }}>
                                <Text style={styles.fieldLabel}>Cargo Type:</Text>
                                <View style={styles.dropdownWrap}>
                                    <Dropdown
                                        onChange={(item) => onUpdateCargoValue(p.id, cargoIndex, 'cargoType', item.label)}
                                        value={c.cargoType}
                                        data={cargoProperties?.data?.cargo_types?.map((type: any) => ({ label: type.name, value: type.id })) ?? []}
                                        labelField="label"
                                        placeholderStyle={{ fontSize: 16, lineHeight: 45, fontWeight: '600', color: '#b3b3b3' }}
                                        valueField="label"
                                        placeholder="Select Cargo Type"
                                        style={styles.dropdownStyle}
                                        containerStyle={{ alignSelf: 'flex-start', width: '85%', height: 65 }}
                                        selectedTextStyle={styles.dropdownSelectedText}
                                        renderRightIcon={() => <Ionicons name="chevron-down" size={18} color={'#b3b3b3'} />}
                                        dropdownPosition={'auto'}
                                        renderItem={(item) => (
                                            <View style={{ width: '80%', padding: 8 }}>
                                                <Text style={{ fontSize: 18, color: '#000', }}>{item.label}</Text>
                                            </View>
                                        )}
                                    />
                                </View>
                            </View>

                            {c.cargoType === 'Rolling Cargo' ? (
                                <View style={{ marginTop: 10, flexDirection: 'row', justifyContent: 'space-between' }}>
                                    <View style={{ width: '50%' }}>
                                        <Text style={styles.fieldLabel}>Specifications (CC):</Text>
                                        <View style={[styles.inputBorderShort, { height: 45, justifyContent: 'center' }]}>
                                            <TextInput
                                                value={c.cargoSpecification ?? ''}
                                                onChangeText={(text) => onUpdateCargoValue(p.id, cargoIndex, 'cargoSpecification', text)}
                                                placeholder="Enter CC"
                                                keyboardType="numeric"
                                                style={styles.textInput}
                                            />
                                        </View>
                                    </View>
                                    <View style={{ width: '48%' }}>
                                        <Text style={styles.fieldLabel}>Plate#:</Text>
                                        <View style={[styles.inputBorderShort, { height: 45, justifyContent: 'center' }]}>
                                            <TextInput
                                                value={c.cargoPlateNo ?? ''}
                                                onChangeText={(text) => onUpdateCargoValue(p.id, cargoIndex, 'cargoPlateNo', text)}
                                                placeholder='Plate#'
                                                style={styles.textInput}
                                            />
                                        </View>
                                    </View>
                                </View>
                            ) : c.cargoType === 'Parcel' ? (
                                <View style={{ marginTop: 5 }}>
                                    <Text style={styles.fieldLabel}>Parcel Category:</Text>
                                    <View style={styles.inputBorderShort}>
                                        <TextInput
                                            value={c.parcelCategory ?? ''}
                                            placeholderTextColor={'#b3b3b3'}
                                            onChangeText={(text) => onUpdateCargoValue(p.id, cargoIndex, 'parcelCategory', text)}
                                            placeholder="Enter Parcel Category"
                                            style={styles.textInput}
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
    );
});

export default function Forms({ errorForm }: FormProps) {
    const { passengers, setPassengers, updatePassenger, updateInfant, updateCargo } = usePassengers();
    const { vessel_id, routeID, isCargoable, approvedBy, setApprovedBy, setTotalFare } = useTrip();
    const { passesTypeID, passesTypeCode, passesTypeName } = usePassesType();
    const { cargoProperties } = useCargo();

    const [isLoading, setIsLoading] = useState(true);
    const [passengerType, setPassengerType] = useState<PassTypeProps[] | null>(null);
    const [paxFares, setPaxFares] = useState<PaxFareProps[] | null>(null);
    const [paxlists, setPaxLists] = useState<PaxListProps[]>([]);

    const [suggestions, setSuggestions] = useState<{ [key: string]: any[] }>({});
    const [infantSuggestions, setInfantSuggestions] = useState<{ [key: string]: any[] }>({});
    const prevFareRef = useRef<number>(0);

    const dropdownController = useRef<{ [key: string]: any }>({});
    const initializedRefs = useRef<{ [key: string]: boolean }>({});
    const InfantDropController = useRef<{ [key: string]: any }>({});
    const initializedInfantRefs = useRef<{ [key: string]: boolean }>({});

    useEffect(() => {
        const currentIds = new Set(passengers.map(p => p.id));
        for (const key of Object.keys(dropdownController.current)) {
            if (!currentIds.has(key)) {
                delete dropdownController.current[key];
                delete initializedRefs.current[key];
            }
        }
        for (const key of Object.keys(InfantDropController.current)) {
            const paxId = key.split('-')[0];
            if (!currentIds.has(paxId)) {
                delete InfantDropController.current[key];
                delete initializedInfantRefs.current[key];
            }
        }
    }, [passengers]);

    const nonInfantPax = useMemo(() =>
        passengers.filter(p => p.passType !== 'Infant'),
    [passengers]);

    const hasPasses = useMemo(() =>
        passengers.some(p => p.passType === 'Passes' || p.passTypeCode === 'P'),
    [passengers]);

    const specialInfantPax = useMemo(() =>
        passengers.filter(p => p.passType === 'Infant' && (p.hasScanned === true || p.forResched === true)),
    [passengers]);

    const formattedPaxList = useMemo(() =>
        paxlists
            .filter(p => p.passenger_type?.name != null && p.passenger_type?.name !== 'Infant')
            .slice(0, 100)
            .map(p => ({ id: p.id, title: `${p.last_name}, ${p.first_name}` })),
    [paxlists]);

    const formattedInfantList = useMemo(() =>
        paxlists
            .filter(p => p.passenger_type?.name === 'Infant')
            .map(p => ({ id: p.id, title: `${p.last_name}, ${p.first_name}` })),
    [paxlists]);

    const paxsengerTypes = useMemo(() =>
        passengerType?.filter(t => t?.name !== 'Infant' && t?.name !== 'Passes') ?? [],
    [passengerType]);

    const handleOnSearch = useCallback((text: string, paxId: string | number) => {
        const filtered = formattedPaxList.filter(p =>
            p.title.toLowerCase().includes(text.toLowerCase())
        );
        setSuggestions(prev => ({ ...prev, [paxId]: filtered }));
    }, [formattedPaxList]);

    const handleOnInfantSearch = useCallback((text: string, paxId: string | number) => {
        const filtered = formattedInfantList.filter(p =>
            p.title.toLowerCase().includes(text.toLowerCase())
        );
        setInfantSuggestions(prev => ({ ...prev, [paxId]: filtered }));
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
                    originalFare: paxFareOnList,
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
                if (p.id != targetPaxId || !p.hasInfant) return p;
                return {
                    ...p,
                    infant: p.infant?.map((inf: any, idx: number) => {
                        if (idx != infantIndex) return inf;
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
                            passType: paxOnList.passenger_type.name,
                            passType_id: paxOnList.passenger_type.id,
                            passTypeCode: paxOnList.passenger_type.passenger_types_code,
                            fare: paxFareOnList,
                            originalFare: paxFareOnList,
                        };
                    }),
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
                    pax_id: '', name: '', age: null, gender: '',
                    nationality: 'Filipino', address: '', contact_number: '',
                    ...(!isPasses && {
                        passType: '', passType_id: null, passTypeCode: '',
                        fare: null, originalFare: null,
                    }),
                };
            })
        );
    }, [setPassengers]);

    const handleInfantClearAutoComplete = useCallback((paxId: number | string, infantIndex: number) => {
        setPassengers(prev =>
            prev.map(p => {
                if (p.id != paxId && p.hasInfant != true) return p;
                const isPasses = p.passType === 'Passes';
                return {
                    ...p,
                    infant: p.infant?.map((inf: any, index: number) =>
                        index != infantIndex ? inf : {
                            ...inf,
                            pax_id: '', name: '', age: null, nationality: 'Filipino',
                            address: '', contact_number: '', fare: null, originalFare: null,
                            ...(!isPasses && { passType: '', passType_id: null, passTypeCode: '', gender: '' }),
                        }
                    ),
                };
            })
        );
    }, [setPassengers]);

    const computedFare = useMemo(() => {
        return passengers.reduce((sum, p) => {
            const passengerFare = Number(p.fare || 0);
            const cargoTotal = (p.cargo ?? []).reduce((cargoSum: number, c: any) => {
                return cargoSum + (Number.isFinite(Number(c.cargoAmount)) ? Number(c.cargoAmount) : 0);
            }, 0);
            return sum + passengerFare + cargoTotal;
        }, 0);
    }, [passengers]);

    useEffect(() => {
        if (prevFareRef.current !== computedFare) {
            prevFareRef.current = computedFare;
            setTotalFare(computedFare);
        }
    }, [computedFare]);

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
                return { ...p, hasCargo: isHasCargo, cargo: isHasCargo ? [{ cargoAmount: 0, quantity: 1 }] : [] };
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

    const removeInfant = useCallback((seat: string | number, infantIndex: number) => {
        setPassengers(prev =>
            prev.map(p => {
                if (p.seatNumber !== seat) return p;
                return { ...p, infant: p.infant?.filter((_: any, i: number) => i !== infantIndex) };
            })
        );
    }, [setPassengers]);

    const removeCargo = useCallback((seat: string | number | null, paxIndex: number, cargoIndex: number) => {
        setPassengers(prev =>
            prev.map((p, index) => {
                if (p.seatNumber != seat || index != paxIndex) return p;
                const updatedCargo = p.cargo.filter((_: any, i: number) => i !== cargoIndex);
                const cargoTotal = updatedCargo.reduce((sum: number, c: any) => sum + Number(c.cargoAmount ?? 0), 0);
                return {
                    ...p,
                    cargo: updatedCargo,
                    fare: (p.originalFare ?? 0) + cargoTotal,
                };
            })
        );
    }, [setPassengers]);

    const handleCargoQuantity = useCallback((
        operation: 'add' | 'minus',
        cargoIndex: number,
        paxId: string | number
    ) => {
        setPassengers(prev =>
            prev.map(p => {
                if (p.id != paxId) return p;
                const updatedCargo = p.cargo.map((c: any, index: number) => {
                    if (index != cargoIndex) return c;
                    const newQty = operation === 'add' ? c.quantity + 1 : Math.max(1, c.quantity - 1);
                    return { ...c, quantity: newQty };
                });
                const cargoTotal = updatedCargo.reduce((sum: number, c: any) => sum + Number(c.cargoAmount ?? 0), 0);
                return {
                    ...p,
                    cargo: updatedCargo,
                    fare: (p.originalFare ?? 0) + cargoTotal,
                };
            })
        );
    }, [setPassengers]);

    const handleAddPasses = useCallback(() => {
        const temp = Crypto.randomUUID();
        setPassengers(prev => [
            ...prev,
            { id: temp, passType_id: passesTypeID, passType: passesTypeName, passTypeCode: passesTypeCode },
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
            prev.map(p => p.id == passengerId
                ? { ...p, passType: paxType, passType_id: typeID, passTypeCode: paxTypeCode, fare: prop?.fare ?? 0, originalFare: prop?.fare ?? 0 }
                : p
            )
        );
    }, [paxFares, routeID, vessel_id, setPassengers]);

    const handleFareChange = useCallback((paxId: string | number, value: number) => {
        setPassengers(prev =>
            prev.map(p => p.id != paxId ? p : { ...p, fare: value, originalFare: value })
        );
    }, [setPassengers]);

    useEffect(() => {
        const paxTypeAndLists = async () => {
            try {
                const passTypesFaresAndLists = await FetchPassengerType();

                if (!passTypesFaresAndLists.error) {
                    const types: PassTypeProps[] = passTypesFaresAndLists.types.map((type: any) => ({
                        id: type.id,
                        name: type?.name == 'Senior Citizen' ? 'Senior' : type?.name,
                        code: type?.passenger_types_code,
                    }));
                    const fares: PaxFareProps[] = passTypesFaresAndLists.fares.map((fare: any) => ({
                        id: fare.id, fare: fare.fare, routes_id: fare.routes_id,
                        passenger_type_id: fare.passenger_type_id, vessel_id: fare.vessel_id,
                        accommodation_type_id: fare.accommodation_type_id,
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
            } finally {
                setIsLoading(false);
            }
        };

        paxTypeAndLists();
    }, []);


    useEffect(() => {
        const currentIds = new Set(passengers.map(p => String(p.id)));

        Object.keys(dropdownController.current).forEach(key => {
            if (!currentIds.has(key)) {
                delete dropdownController.current[key];
                delete initializedRefs.current[key];
            }
        });

        Object.keys(InfantDropController.current).forEach(key => {
            const paxId = key.split('-')[0];
            if (!currentIds.has(paxId)) {
                delete InfantDropController.current[key];
                delete initializedInfantRefs.current[key];
            }
        });

        setSuggestions(prev => {
            const next = { ...prev };
            Object.keys(next).forEach(k => { if (!currentIds.has(k)) delete next[k]; });
            return next;
        });
    }, [passengers]);


    return (
        <View>
            <View style={styles.outerWrap}>
                {isLoading ? (
                    <PreLoader loading={isLoading} />
                ) : (
                    <>
                        {(nonInfantPax ?? []).map((p, index) => (
                            <PassengerCard
                                key={p.id}
                                p={p}
                                index={index}
                                hasPasses={hasPasses}
                                errorForm={errorForm}
                                paxsengerTypes={paxsengerTypes}
                                passengerType={passengerType}
                                paxFares={paxFares}
                                cargoProperties={cargoProperties}
                                isCargoable={isCargoable}
                                routeID={routeID}
                                vessel_id={vessel_id}
                                suggestions={suggestions}
                                infantSuggestions={infantSuggestions}
                                formattedPaxList={formattedPaxList}
                                formattedInfantList={formattedInfantList}
                                dropdownController={dropdownController}
                                initializedRefs={initializedRefs}
                                InfantDropController={InfantDropController}
                                initializedInfantRefs={initializedInfantRefs}
                                onPassesRemove={handlePassesRemove}
                                onPaxTypeSelect={handleOnPaxTypeSelect}
                                onFareChange={handleFareChange}
                                onSearch={handleOnSearch}
                                onInfantSearch={handleOnInfantSearch}
                                onAutoComplete={handleOnAutoComplete}
                                onInfantAutoComplete={handleOnInfantAutoComplete}
                                onClearAutoComplete={handleClearAutoComplete}
                                onInfantClearAutoComplete={handleInfantClearAutoComplete}
                                onUpdatePassenger={updatePassenger}
                                onUpdateInfant={updateInfant}
                                onUpdateCargoValue={updateCargo}
                                onHasInfantChecker={hasInfantChecker}
                                onHasCargoChecker={hasCargoChecker}
                                onAddInfant={addInfant}
                                onAddPaxCargo={addPaxCargo}
                                onRemoveInfant={removeInfant}
                                onRemoveCargo={removeCargo}
                                onCargoQuantity={handleCargoQuantity}
                                isSpecialInf={specialInfantPax.some(inf => inf.id === p.id)}
                            />
                        ))}

                        {specialInfantPax.map(inf => (
                            <View style={styles.infantCardWrap} key={inf.id}>
                                <Text style={styles.sectionTitle}>Infant Details</Text>
                                <View style={{ marginTop: 20 }}>
                                    <Text style={styles.fieldLabel}>Full Name:</Text>
                                    <View style={styles.infantInputBorder}>
                                        <TextInput
                                            value={inf.name}
                                            onChangeText={(text) => updatePassenger(inf.id, 'name', text)}
                                            placeholder='Name'
                                            style={styles.infantTextInput}
                                        />
                                    </View>
                                </View>
                                <View style={[styles.ageContactRow, { marginTop: 5 }]}>
                                    <View style={styles.ageWrap}>
                                        <Text style={styles.fieldLabel}>Age:</Text>
                                        <View style={styles.infantInputBorder}>
                                            <TextInput
                                                value={String(inf.age ?? '')}
                                                onChangeText={(text) => updatePassenger(inf.id, 'age', Number(text))}
                                                keyboardType='numeric'
                                                placeholder='Age'
                                                style={styles.infantTextInput}
                                            />
                                        </View>
                                    </View>
                                    <View style={{ width: '56%' }}>
                                        <Text style={styles.fieldLabel}>Gender:</Text>
                                        <View style={{ flexDirection: 'row', gap: 5 }}>
                                            {passGender.map((infntgender) => (
                                                <TouchableOpacity
                                                    key={infntgender}
                                                    onPress={() => updatePassenger(inf.id, 'gender', infntgender)}
                                                    style={[
                                                        styles.infantGenderButtonBase,
                                                        inf.gender === infntgender ? styles.genderButtonActive : styles.genderButtonInactive,
                                                    ]}
                                                >
                                                    <Text style={
                                                        inf.gender === infntgender
                                                            ? { textAlign: 'center', fontSize: 17, fontWeight: '600', color: '#fff' }
                                                            : { textAlign: 'center', fontSize: 17, fontWeight: '600', color: '#cf2a3a' }
                                                    }>
                                                        {infntgender}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </View>
                                </View>
                            </View>
                        ))}

                        {hasPasses && (
                            <>
                                <View style={styles.approvedCard}>
                                    <Text style={styles.fieldLabel}>Approved by:</Text>
                                    <View style={styles.inputBorderShort}>
                                        <TextInput
                                            onChangeText={(text) => setApprovedBy(text)}
                                            value={approvedBy}
                                            placeholder='First Last'
                                            style={styles.infantTextInput}
                                        />
                                    </View>
                                </View>
                                <Pressable
                                    onPress={() => handleAddPasses()}
                                    style={styles.addPassesBtn}
                                >
                                    <Ionicons name={'add'} color={'#fff'} size={20} />
                                    <Text style={styles.addPassesText}>Add Passes</Text>
                                </Pressable>
                            </>
                        )}
                    </>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    outerWrap: {
        flex: 1,
        marginTop: 10,
        flexDirection: 'column',
        gap: 20,
    },
    card: {
        position: 'relative',
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 10,
        backgroundColor: '#fff',
        elevation: 5,
    },
    cardError: {
        borderColor: '#cf2a3a',
    },
    cardNormal: {
        borderColor: '#B3B3B3',
    },
    approvedCard: {
        padding: 10,
        backgroundColor: '#fff',
        elevation: 5,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#B3B3B3',
    },
    removePassBtn: {
        position: 'absolute',
        right: -5,
        top: -15,
    },
    rowBetween: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10
    },
    colStart: {
        flexDirection: 'column',
        alignItems: 'flex-start',
    },
    seatLabel: {
        color: '#cf2a3a',
        fontSize: 16,
        fontWeight: '900',
    },
    seatNumber: {
        textAlign: 'center',
        fontWeight: 'bold',
        fontSize: 20,
        color: '#cf2a3a',
        borderColor: '#cf2a3a',
        backgroundColor: '#cf2a3b1a',
        borderWidth: 1,
        paddingVertical: 8,
        paddingHorizontal: 25,
        borderRadius: 5,
    },
    fareLabel: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#545454',
    },
    fareBox: {
        borderColor: '#FFC107',
        backgroundColor: '#ffc10727',
        borderWidth: 2,
        borderRadius: 5,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        width: 150,
        justifyContent: 'space-between',
    },
    fareCurrency: {
        fontSize: 16,
        fontWeight: '900',
        color: '#000',
    },
    fareInput: {
        fontWeight: '900',
        textAlign: 'right',
        fontSize: 20,
        color: '#000',
    },
    typeRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 5,
    },
    typeButtonBase: {
        borderColor: '#cf2a3a',
        borderWidth: 1,
        paddingVertical: 9,
        justifyContent: 'center',
        width: '32%',
        borderRadius: 5,
    },
    typeButtonActive: {
        backgroundColor: '#cf2a3a',
    },
    typeButtonInactive: {
        backgroundColor: 'transparent',
    },
    typeButtonTextActive: {
        textAlign: 'center',
        fontSize: 20,
        color: '#fff',
        fontWeight: '600',
    },
    typeButtonTextInactive: {
        textAlign: 'center',
        fontSize: 20,
        color: '#cf2a3a',
        fontWeight: '600',
    },
    fieldLabel: {
        fontSize: 17,
        fontWeight: 'bold',
        color: '#545454',
    },
    inputBorder: {
        borderWidth: 1,
        borderColor: '#B3B3B3',
        borderRadius: 5,
        height: 55,
        justifyContent: 'center',
    },
    inputBorderShort: {
        borderWidth: 1,
        borderColor: '#B3B3B3',
        borderRadius: 5,
        height: 50,
        justifyContent: 'center',
        paddingHorizontal: 10,
    },
    genderRow: {
        flexDirection: 'row',
        gap: 5,
        justifyContent: 'center',
    },
    genderButtonBase: {
        borderColor: '#cf2a3a',
        borderWidth: 1,
        width: '49%',
        borderRadius: 5,
        justifyContent: 'center',
        paddingVertical: 11,
    },
    genderButtonActive: {
        backgroundColor: '#cf2a3a',
    },
    genderButtonInactive: {
        backgroundColor: 'transparent',
    },
    genderTextActive: {
        textAlign: 'center',
        fontSize: 18,
        fontWeight: '600',
        color: '#fff',
    },
    genderTextInactive: {
        textAlign: 'center',
        fontSize: 18,
        fontWeight: '600',
        color: '#cf2a3a',
    },
    ageContactRow: {
        marginTop: 10,
        flexDirection: 'row',
        gap: 8,
        alignItems: 'flex-end',
    },
    ageWrap: {
        width: '40%',
    },
    contactWrap: {
        width: '57.5%',
    },
    textInput: {
        fontSize: 19,
        fontWeight: '600',
        color: '#000',
    },
    nationalityRow: {
        marginTop: 10,
        flexDirection: 'row',
        gap: 8,
    },
    checkboxRow: {
        marginTop: 5,
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
    },
    checkboxGroup: {
        flexDirection: 'row',
        gap: 20,
    },
    checkboxItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 15,
    },
    checkboxLabel: {
        fontSize: 20,
        color: '#000',
    },
    infantSection: {
        marginTop: 30,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        borderTopWidth: 1,
        borderTopColor: '#949494',
        paddingTop: 8,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '900',
        color: '#cf2a3a',
        marginBottom: 5,
    },
    addButton: {
        backgroundColor: '#cf2a3a',
        borderColor: '#cf2a3a',
        borderWidth: 1,
        padding: 8,
        elevation: 3,
        borderRadius: 5,
        flexDirection: 'row',
        gap: 5,
        alignItems: 'center',
    },
    addButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 18,
    },
    removeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    removeButton: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    removeText: {
        color: '#cf2a3a',
        fontWeight: '600',
        fontSize: 19,
    },
    infantGenderButtonBase: {
        borderColor: '#cf2a3a',
        borderWidth: 1,
        width: '50%',
        borderRadius: 5,
        justifyContent: 'center',
        paddingVertical: 12,
    },
    cargoSection: {
        marginTop: 40,
    },
    cargoHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginBottom: 10,
        borderTopColor: '#949494',
        borderTopWidth: 1,
        paddingTop: 8,
    },
    cargoAmountLabel: {
        fontSize: 17,
        fontWeight: 'bold',
        color: '#494949',
    },
    cargoAmountBox: {
        borderColor: '#FFC107',
        backgroundColor: '#ffc10727',
        borderWidth: 2,
        borderRadius: 5,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        width: 150,
        justifyContent: 'space-between',
    },
    cargoAmountText: {
        fontWeight: 'bold',
        textAlign: 'right',
        fontSize: 20,
        color: '#000',
        minWidth: 80,
    },
    qtyRow: {
        flexDirection: 'column',
        alignItems: 'flex-end',
    },
    qtyBox: {
        flexDirection: 'row',
        alignItems: 'center',
        borderColor: '#B3B3B3',
        paddingHorizontal: 5,
        borderWidth: 1,
        borderRadius: 5,
    },
    qtyText: {
        paddingHorizontal: 14,
        fontSize: 20,
        fontWeight: 'bold',
        borderRightColor: '#B3B3B3',
        borderLeftColor: '#B3B3B3',
        borderLeftWidth: 1,
        borderRightWidth: 1,
        paddingVertical: 5,
        color: '#000'
    },
    dropdownWrap: {
        borderColor: '#B3B3B3',
        borderWidth: 1,
        borderRadius: 5,
    },
    dropdownStyle: {
        height: 50,
        width: '100%',
        paddingHorizontal: 10,
    },
    dropdownSelectedText: {
        fontSize: 18,
        lineHeight: 35,
        fontWeight: '600',
        color: '#000',
    },
    addPassesBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'center',
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 8,
        backgroundColor: '#cf2a3a',
        elevation: 2,
    },
    addPassesText: {
        color: '#fff',
        fontWeight: '600',
    },
    autocompleteContainer: {
        borderWidth: 1,
        borderColor: '#B3B3B3',
        borderRadius: 5,
        height: 55,
        justifyContent: 'center',
    },
    autocompleteTextInput: {
        backgroundColor: '#fff',
        color: '#000',
        borderWidth: 1,
        borderColor: 'transparent',
        borderRadius: 2,
        fontWeight: '600',
        fontSize: 20,
        paddingHorizontal: 5,
        height: 50,
    },
    autocompleteRightButtons: {
        right: 8,
        backgroundColor: '#fff',
        alignSelf: 'center',
    },
    autocompleteInputContainer: {
        borderRadius: 0,
        borderColor: '#B3B3B3',
    },
    autocompleteItem: {
        color: '#000',
        backgroundColor: '#f0f0f0',
        justifyContent: 'center',
        borderRadius: 5,
        fontSize: 16,
        paddingHorizontal: 5,
        paddingVertical: 15,
    },
    infantCardWrap: {
        padding: 10,
        backgroundColor: '#fff',
        elevation: 5,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#B3B3B3',
    },
    infantTextInput: {
        fontSize: 19,
        fontWeight: '600',
    },
    infantInputBorder: {
        borderColor: '#B3B3B3',
        borderWidth: 1,
        borderRadius: 5,
        height: 45,
        justifyContent: 'center',
    },
});