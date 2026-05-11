import { AddCategory } from '@/api/addCategory';
import { FetchCategories } from '@/api/fetchCategories';
import { SaveExpenses } from '@/api/saveExpenses';
import { FetchTrips } from '@/api/trips';
import PreLoader from '@/components/preloader';
import { useExpense } from '@/context/expense';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CameraType, CameraView, useCameraPermissions } from 'expo-camera';
import * as FileSystem from 'expo-file-system';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Image, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Dropdown } from 'react-native-element-dropdown';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';


const { height, width } = Dimensions.get('window');
const TEMP_DIR = FileSystem.cacheDirectory + 'expensesImages/';

type TripProps = {
    trip_id: number;
    vessel: string;
    route_origin: string;
    route_destination: string;
    departure: string;
    route_id: number;
    code: string;
    web_code: string;
}

type CategoryProps = {
    categoryID: number;
    name: string;
}


export default function AddExpenses() {
    const [permission, requestPermission] = useCameraPermissions();
    const { expenses, setExpenses, updateExpense } = useExpense();
    const [trips, setTrips] = useState<TripProps[] | null>(null);
    const [categories, setCategories] = useState<CategoryProps[]>([])
    const [date, setDate] = useState('');
    const [screenLoading, setScreenLoading] = useState(true);
    const [saveExpenseSpinner, setSaveExpenseSpinner] = useState(false);
    const [selectedTrip, setSelectedTrip] = useState(0);
    const [modal, setModal] = useState(false);
    const [addedCategory, setAddedCategory] = useState('');
    const [saveCategotySpinner, setCategorySpinner] = useState(false);
    const [cameraType, setCameraType] = useState<CameraType>('back');
    const [capturedImage, setCapturedImage] = useState<string | null>(null)
    const cameraRef = useRef<CameraView>(null)
    const [onCapture, setOnCapture] = useState(false)
    const [expenseID, setExpenseID] = useState(0);
    const insets = useSafeAreaInsets();



    const handleOnCapture = async (expenseId: number) => {
        if(!permission.granted) {
            permissionView()
        }

        setExpenseID(expenseId)
        setOnCapture(true);
    }
    
    const permissionView = () => {
        return (
            <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC', padding: 20 }}>
                <Text>
                    We need access to your camera.
                </Text>
                <TouchableOpacity style={{ backgroundColor: '#3B82F6',
                    paddingHorizontal: 32,
                    paddingVertical: 16,
                    borderRadius: 12,
                    shadowColor: '#3B82F6',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                    elevation: 4, }} onPress={requestPermission}>
                    <Text style={{ color: '#FFFFFF',
                        fontSize: 16,
                        fontWeight: '600', }}>Grant Permission</Text>
                </TouchableOpacity>
            </SafeAreaView>
        )
    }

    const renderCameraCaptureView = () => {
        if(!onCapture) return null;

        return (
            <View style={{ flex: 1, position: 'relative' }}>
                {capturedImage != null ? (
                    <View>
                        <Image source={{ uri: capturedImage }} style={{ height: '100%', width: '100%' }} />
                    </View>
                ) : (
                    <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing='back' />
                )}
                <TouchableOpacity style={{ position: 'absolute', top: 50, left: 20, zIndex: 5, backgroundColor: '#fff', padding: 8, borderRadius: 50 }} onPress={() => setOnCapture(false)}>
                    <Ionicons name={'arrow-back'} size={25} color="#cf2a3a" />
                </TouchableOpacity>
                
                <View style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)', height: 160, width: '100%', position: 'absolute', bottom: 0, zIndex: 5, justifyContent: 'center' }}>
                    {capturedImage != null ? (
                        <View style={{ flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' }}>
                            <TouchableOpacity onPress={() => setCapturedImage(null)} style={{ backgroundColor: '#cf2a3a', padding: 12, borderRadius: 50 }}>
                                <Ionicons name={'trash'} size={28} color={'#fff'} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => {handleOnSaveImage(), setOnCapture(false)}} style={{ backgroundColor: '#fff', padding: 12, borderRadius: 50 }}>
                                <Ionicons name={'checkmark'} size={28} />
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <TouchableOpacity onPress={() => handleCaptureImage()} style={{ alignSelf: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 50 }}>
                            <Ionicons name={'camera'} color={'#cf2a3a'} size={40} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        )
    }

    const handleCaptureImage = async () => {
        if(cameraRef.current) {
            try {
                const photo = await cameraRef.current.takePictureAsync({
                    quality: 0.8,
                    skipProcessing: true,
                    base64: false
                });

                setCapturedImage(photo.uri)
            }catch (error) {
                Alert.alert('Error', 'Failed to capture image.');
            }
        }
    }

    const handleOnSaveImage = async () => {
        if (!capturedImage) return;

        const filename = `expense_${expenseID}-${Date.now()}.jpg`;
        const path = TEMP_DIR + filename;

        await FileSystem.moveAsync({
            from: capturedImage,
            to: path
        });

        updateExpense(expenseID, 'image_uri', path);
        setCapturedImage(null)
    }

    const expenseImgTempDir = async () => {
        const dir = await FileSystem.getInfoAsync(TEMP_DIR);

        if(!dir.exists) {
            await FileSystem.makeDirectoryAsync(TEMP_DIR, { intermediates: true })
        }
    }

    useEffect(() => {
        expenseImgTempDir();

        const getDate = new Date();
        const today = getDate.toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
        const date = new Date(today);
        const options: Intl.DateTimeFormatOptions = {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            timeZone: 'Asia/Manila'
        }

        const formattedDate = date.toLocaleDateString('en-US', options);
        handleFetchDependencies(today)
        setDate(formattedDate);
    }, []);

    const handleFetchDependencies = useCallback(async(queryDate: string) => {
        try {
            const [tripsFetched, fetchedCategories] = await Promise.all([
                FetchTrips(queryDate),
                FetchCategories()
            ]);
    
            if(!tripsFetched.error) {
                const tripsData: TripProps[] = tripsFetched.data.map((t: any) => ({
                    trip_id: t.id,
                    vessel: t.trip.vessel.code,
                    route_origin: t.trip.route.origin,
                    route_destination: t.trip.route.destination,
                    vessel_id: t.trip.vessel_id,
                    route_id: t.trip.route_id,
                    code: t.trip.route.mobile_code,
                    web_code: t.trip.route.web_code,
                    departure: new Date(`1970-01-01T${t.trip.departure_time}`).toLocaleTimeString(
                        'en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true
                        }
                    )
                }))
    
                setTrips(tripsData);
            }
    
            if(!fetchedCategories.error) {
                const categories: CategoryProps[] = fetchedCategories.categories.map((c: any) => ({
                    categoryID: c.id,
                    name: c.name
                }))
    
                setCategories(categories);
            }
        }catch(error: any) {
            Alert.alert('Error', error.message)   
        }finally {
            setScreenLoading(false)
        }
    }, [])

    const dropdownCategory = useMemo(() => {
        return (categories || []).map((c) => ({
            label: c.name,
            id: c.categoryID
        }));
    }, [categories]);

    const tripDropdown = useMemo(() => {
        if(!trips) return [];

        if(trips && trips.length > 0) {
            return trips.map(t => ({
                label: `${t.departure} ${t.code} [${t.vessel.toUpperCase()}]`,
                id: t.trip_id
            }))
        }
    }, [trips])

    const handleAddCategory = async () => {
        setCategorySpinner(true);

        if(!addedCategory){
            Alert.alert('Error', 'No category added');
            setCategorySpinner(false);
            return;
        }
        
        try {
            const addCategory = await AddCategory(addedCategory);
            
            if(!addCategory.error) {
                setCategories(prev => [...prev, { categoryID: addCategory.id, name: addedCategory } ])
                Alert.alert('Succuss', addCategory.success);
            }
        }catch(error: any) {
            Alert.alert('Error', error.message);
        }finally {
            setCategorySpinner(false);
            setModal(false);
        }
    }

    const handleTripChange = useCallback((item: { id: number; label: string }) => {
        if (item.id === selectedTrip) return;

        setSelectedTrip(item.id);
        setExpenses(prev => prev.map(exp => ({ ...exp, trip_schedule_id: item.id })));
    }, [selectedTrip, setExpenses]);

    const addExpenseForm = () => {
        setExpenses(prev => {
            const lastId = prev[prev.length - 1].id;
            return [...prev, { 
                id: lastId + 1, 
                trip_schedule_id: selectedTrip,  // ← inherit current selection
                description: '', 
                amount: 0, 
                expense_category_id: 0 
            }];
        });
    };

    const removeExpenseForm = (formID: number) => {
        const remainingForm = expenses.filter((e) => e.id != formID);
        setExpenses(remainingForm);
    }

    const handleSaveExpense = async () => {
        const station_id = await AsyncStorage.getItem('stationID');

        if(!station_id) {
            Alert.alert('Error', 'Please set station and try again.');
            return;
        }

        setSaveExpenseSpinner(true);
        
        if (!expenses || expenses.length === 0) {
            setSaveExpenseSpinner(false);
            Alert.alert('Invalid', 'Please add at least one expense.');
            return;
        }

        const hasEmpty = expenses.find((e) => 
            !e.amount || !e.description.trim() || !e.expense_category_id || !e.trip_schedule_id
        );

        if(hasEmpty) {
            setSaveExpenseSpinner(false);
            Alert.alert('Invalid', 'Failed to save expense. Please fill out all required fields.');
            return;
        }

        try {
            const response = await SaveExpenses(expenses, station_id);
            if(response.success) {
                Alert.alert('Success', response.message, [{
                    text: 'OK',
                    onPress:() => {setExpenses([]), router.back()}
                }]);
            }
        }catch(error: any) {
            Alert.alert('Error', error.message);
            console.log(error)
        }finally{
            setSaveExpenseSpinner(false);
        }
    }


    if(onCapture == true) {
        return renderCameraCaptureView();
    }

    return (
        <View style={{ backgroundColor: '##fdfdfd', position: 'relative', flex: 1, paddingBottom: insets.bottom }}>
            <Modal visible={modal} transparent animationType="fade">
                <View style={{ backgroundColor: '#00000048', flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <View style={{ height: height / 5, width: width - 40, backgroundColor: '#fff', borderRadius: 10, justifyContent: 'space-between', padding: 15 }}>
                        <Text style={{ fontSize: 16, fontWeight: 'bold' }}>Add Category</Text>
                        <View style={{ borderColor: '#B3B3B3', borderWidth: 1, borderRadius: 5 }}>
                            <TextInput onChangeText={(text) => setAddedCategory(text)} placeholder='e.g. Consumable' style={{ fontSize: 13 }} />
                        </View>
                        <View style={{ alignSelf: 'flex-end', flexDirection: 'row', alignItems: 'center', marginTop: 20, gap: 10 }}>
                            <TouchableOpacity onPress={() => setModal(false)}>
                                <Text>Cancel</Text>
                            </TouchableOpacity>
                            {saveCategotySpinner ? (
                                <ActivityIndicator size="small" color="#fff" style={{ marginRight: 10 }} />
                            ) : (
                                <TouchableOpacity style={{ paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#cf2a3a', borderRadius: 5 }} onPress={handleAddCategory} disabled={saveCategotySpinner}>
                                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>Save</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                </View>
            </Modal>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#cf2a3a', paddingTop: 50, paddingBottom: 20, paddingHorizontal: 20 }}>
                <TouchableOpacity onPress={() => [ setExpenses([]), router.back() ]} style={{ }}>
                    <Ionicons name='arrow-back' size={30} color={'#fff'} />
                </TouchableOpacity>
                <Text style={{ fontSize: 20, color: '#fff', fontWeight: 'bold', textAlign: 'center' }}>Add Daily Expense</Text>
            </View>

            {screenLoading == true ? (
                <PreLoader loading={screenLoading} />
            ) : (
                <View style={{ flex: 1, marginTop: 20 }}>
                    <View style={{ paddingHorizontal: 20 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 }}>
                            <View style={{ flexDirection: 'column' }}>
                                <Text style={{ fontSize: 12, color: '#000' }}>Date:</Text>
                                <Text style={{ color: '#CF2A3A', fontSize: 15, fontWeight: '900' }}>{date}</Text>
                            </View>
                            <TouchableOpacity disabled={trips && trips.length == 0} onPress={() => addExpenseForm()} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 8, backgroundColor: trips?.length == 0 ? '#d8727c' : '#cf2a3a', justifyContent: 'center', borderRadius: 5 }}>
                                <Ionicons name='add' size={20} color={'#fff'} />
                                <Text style={{ fontWeight: 'bold', color: '#fff' }}>Add Expense</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {trips && trips.length == 0 ? (
                        <View style={{ height: height / 2, justifyContent: 'center' }}>
                            <Text style={{ color: '#7A7A85', textAlign: 'center' }}>No Trip Available  To Add Expense</Text>
                        </View>
                    ) : (
                        <View style={{ flex: 1 }}>
                            <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
                                <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#545454' }}>Trip Schedules:</Text>
                                <View style={{ borderRadius: 5, flexDirection: 'row', elevation: 5, justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff' }}>
                                    <Dropdown onChange={handleTripChange} 
                                        value={selectedTrip || undefined} 
                                        data={tripDropdown} 
                                        labelField="label" 
                                        valueField="id" 
                                        placeholder="Select Trip Schedule" 
                                        placeholderStyle={{ color: '#B3B3B3', fontSize: 14 }}
                                        style={{ height: 50, width: '100%', paddingHorizontal: 10 }}
                                        containerStyle={{
                                            alignSelf: 'flex-start',
                                            width: '88%',
                                        }}
                                        selectedTextStyle={{ fontWeight: '700', fontSize: 14, color: '#cf2a3a', lineHeight: 35, }}
                                        renderRightIcon={() => (
                                            <Ionicons name="chevron-down" size={15} />
                                        )}
                                        dropdownPosition="bottom"
                                        renderItem={(item) => (
                                            <View style={{ width: '100%', padding: 8, backgroundColor: '#fff' }}>
                                                <Text style={{ color: '#cf2a3a', fontWeight: '600' }}>{item.label}</Text>
                                            </View>
                                        )}
                                    />
                                </View>
                            </View>
                            <KeyboardAvoidingView style={{ flex: 1, marginTop: 10, paddingBottom: 300 }} behavior={Platform.OS === 'android' ? 'padding' : 'height'}>
                                <ScrollView keyboardShouldPersistTaps="handled" style={{ flex: 1 }}>
                                    <View style={{ paddingHorizontal: 20, paddingBottom: 80, flex: 1 }}>
                                        {expenses.map((e) => (
                                            <View key={e.id} style={{ padding: 10, borderRadius: 8, backgroundColor: '#fff', elevation: 5, marginBottom: 10 }}>
                                                {e.id !== 1 && (
                                                    <TouchableOpacity onPress={() => removeExpenseForm(e.id)}  style={{ alignSelf: 'flex-end' }} >
                                                        <Ionicons name={'close'} size={25} color={'#cf2a3a'}/>
                                                    </TouchableOpacity>
                                                )}
                                                <View>
                                                    <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#545454' }}>Description</Text>
                                                    <View style={{ borderColor: '#B3B3B3', borderWidth: 1, borderRadius: 5 }}>
                                                        <TextInput value={e.description} onChangeText={(text) => updateExpense(e.id, 'description', text)} placeholderTextColor={'#B3B3B3'} placeholder='e.g. Vessel Oil' style={{ fontSize: 13, color: '#000' }} />
                                                    </View>
                                                </View>
                                                <View style={{ marginTop: 5, flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
                                                    <View style={{ width: '25%' }}>
                                                        <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#545454' }}>Amount:</Text>
                                                        <View style={{ borderColor: '#B3B3B3', borderWidth: 1, borderRadius: 5, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 5 }}>
                                                            <Text style={{ fontWeight: 'bold', fontSize: 16, marginTop: -5, color: '#000' }}>₱</Text>
                                                            <TextInput onChangeText={(text) => updateExpense(e.id, 'amount', Number(text))} keyboardType='numeric' placeholder='0.00' placeholderTextColor={'#B3B3B3'} style={{ fontSize: 14, textAlign: 'right', fontWeight: '600', width: '80%', color: '#000' }} />
                                                        </View>
                                                    </View>
                                                    <View style={{ width: '72.5%' }}>
                                                        <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#545454' }}>Category</Text>
                                                        <View style={{ borderColor: '#B3B3B3', borderWidth: 1, borderRadius: 5, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                                            <Dropdown onChange={item => updateExpense(e.id, 'expense_category_id', item.id)} value={e.expense_category_id || undefined} data={dropdownCategory} labelField="label" valueField="id" placeholder="Select Category" 
                                                                style={{ height: 40, width: '80%', paddingHorizontal: 10 }}
                                                                containerStyle={{
                                                                    alignSelf: 'flex-start',
                                                                    width: '50%',
                                                                }}
                                                                placeholderStyle={{ color: '#B3B3B3', fontSize: 14 }}
                                                                selectedTextStyle={{ fontWeight: '500', fontSize: 16, lineHeight: 35, color: '#000' }}
                                                                renderRightIcon={() => (
                                                                    <Ionicons name="chevron-down" size={15} />
                                                                )}
                                                                dropdownPosition="bottom"
                                                                renderItem={(item) => (
                                                                    <View style={{ width: '80%', padding: 10 }}>
                                                                    <Text style={{ fontSize: 16, color: '#000' }}>{item.label}</Text>
                                                                    </View>
                                                                )}
                                                            />
                                                            <TouchableOpacity onPress={() => setModal(true)} style={{ borderLeftColor: '#B3B3B3', borderLeftWidth: 1, height: '100%', padding: 8 }} >
                                                                <Ionicons name='add' size={20} color={'#000'}/>
                                                            </TouchableOpacity>
                                                        </View>
                                                    </View>
                                                </View>
                                                {/* <View style={{ marginTop: 5 }}>
                                                    <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#545454' }}>Image</Text>
                                                    <TouchableOpacity disabled={e.image_uri != null} onPress={() => handleOnCapture(e.id)} style={{ borderColor: '#b3b3b3', borderWidth: 1, borderRadius: 5, height: 90, justifyContent: 'center', position: 'relative' }}>
                                                        {e.image_uri == null ? (
                                                            <View style={{ backgroundColor: '#f8f8f8', borderRadius: 5, height: '100%', justifyContent: 'center' }}>
                                                                <Text style={{ textAlign: 'center', color: '#a3a3a3' }}>Tap to capture image.</Text>
                                                            </View>
                                                        ) : (
                                                            <>
                                                                <Image source={{ uri: e.image_uri }} resizeMode={'cover'} style={{ width: '95%', height: '90%', alignSelf: 'center' }} />
                                                                <View style={{ position: 'absolute', bottom: 0, width: '100%', height: 10 }} />
                                                                <View style={{ position: 'absolute', alignSelf: 'center', backgroundColor: '#2e2e2e48', height: '100%', width: '100%', justifyContent: 'center', alignItems: 'center', borderRadius: 3 }}>
                                                                    <TouchableOpacity onPress={() => updateExpense(e.id, 'image_uri', null)} style={{ flexDirection: 'row', alignItems: 'center', borderColor: '#fff', borderWidth: 1, padding: 5 }}>
                                                                        <Ionicons name={'close'} color={'#fff'} size={18} />
                                                                        <Text style={{ color: '#fff' }}>Remove</Text>
                                                                    </TouchableOpacity>
                                                                </View>
                                                                <LinearGradient
                                                                    colors={[
                                                                    'rgba(0, 200, 83, 0)',
                                                                    'rgba(2, 224, 95, 0.15)',
                                                                    'rgba(1, 226, 95, 0.4)',
                                                                    'rgba(3, 226, 96, 0.8)',
                                                                    ]}
                                                                    style={{ flex: 1, height: 40, position: 'absolute', width: '100%', bottom: 0, zIndex: 2 }}
                                                                />
                                                            </>
                                                        )}
                                                    </TouchableOpacity>
                                                </View> */}
                                            </View>
                                        ))}
                                    </View>
                                </ScrollView>
                                <View style={{ paddingVertical: 20, backgroundColor: '#fff', paddingHorizontal: 20, }}>
                                    <TouchableOpacity disabled={saveExpenseSpinner || trips?.length == 0} onPress={handleSaveExpense} style={{ width: '100%', paddingVertical: 13, borderRadius: 8   , alignSelf: 'center', backgroundColor: trips?.length == 0 ? '#d8727c' : '#cf2a3a' }}>
                                        {saveExpenseSpinner == true ? (
                                            <ActivityIndicator size="small" color="#fff" style={{ marginRight: 10 }} />
                                        ) : (
                                            <Text style={{ fontWeight: 'bold', color: '#fff', textAlign: 'center', fontSize: 18 }}>Save</Text>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </KeyboardAvoidingView>
                        </View>
                    )}
                </View>
            )}
        </View>
    )
}