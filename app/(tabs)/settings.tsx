import { SaveStation } from "@/api/saveStation";
import { FetchStation } from "@/api/station";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Dimensions, Image, Modal, Text, TouchableOpacity, View } from "react-native";

const { height, width } = Dimensions.get('window');
const defaultImg = require('@/assets/images/default.jpg');
const logo_text = require('@/assets/images/logo.png');
const logo_icon = require('@/assets/images/logo_icon.png');


type UserProp = {
    id: number;
    name?: string;
    image?: string;
    stationID?: number;
    station?: string;
    role?: string;
    stationColor: string;
}

export type StationProps = {
    id: number;
    name: string;
}

export default function GenSettings() {
    const [modal, setModal] = useState(false);
    const [stationModal, setStationModal] = useState(false);
    const [stationOptions, setStationOptions] = useState<StationProps[] | null>(null);
    const [selectedStation, setSelectedStation] = useState(0);
    const [stationSpinner, setStationSpinner] = useState(false);
    const [saveSpinner, setSaveSpinner] = useState(false);
    const [loading, setLoading] = useState(false);
    const [user, setUser] = useState<UserProp | null>(null);



    const stations = useMemo(() => {
        if(stationOptions && stationOptions.length > 0) {
            const userStations = stationOptions.filter(s => s.name.toLowerCase() != 'online booking');
            return userStations;
        }
    }, [stationOptions])

    useEffect(() => {
        const loadUserData = async () => {
            const userID = await AsyncStorage.getItem('userID');
            const userName = await AsyncStorage.getItem('name');
            const userImage = await AsyncStorage?.getItem('image');
            const userStationID = await AsyncStorage?.getItem('stationID');
            const userStation = await AsyncStorage?.getItem('station');
            const userRole = await AsyncStorage?.getItem('role');
            const station_color = await AsyncStorage?.getItem('stationColor');

            const userData: UserProp = {
                id: Number(userID),
                name: userName ?? '',
                image: userImage ?? '',
                stationID: Number(userStationID),
                station: userStation ?? '',
                role: userRole ?? '',
                stationColor: station_color ?? ''
            }
            setSelectedStation(Number(userStationID))
            
            setUser(userData);
        }

        loadUserData()
    }, []);

    const fetchStations = async () => {
        setStationModal(true);
        setStationSpinner(true);

        try {
            const response = await FetchStation();

            if(response) {
                const stations: StationProps[] = response.stations.map((station: any) => ({
                    id: station.id,
                    name: station.name
                }))

                setStationOptions(stations);
            }
        }catch(error: any) {
            Alert.alert('Error', error.message);
        }finally{
            setStationSpinner(false);
        }
        
    }

    const handleSaveStation = async () => {
        setSaveSpinner(true);

        try {
            const saveStation = await SaveStation(user!.id, selectedStation);
            if(saveStation) {
                AsyncStorage.setItem('station', saveStation.station.name);
                AsyncStorage.setItem('stationID', String(saveStation.station.id));
                AsyncStorage.setItem('stationColor', saveStation.station.color);
                
                const setSaveStation: UserProp = {
                    id: user?.id,
                    name: user?.name,
                    image: user?.image,
                    role: user?.role,
                    stationID: saveStation.station.id,
                    station: saveStation.station.name,
                    stationColor: saveStation.station.color
                }
                
                setUser(setSaveStation);

                Alert.alert('Success', saveStation.success, [{
                    text: 'OK',
                    onPress:() => setStationModal(false)
                }]);
            }
        }catch(error: any) {
            Alert.alert('Error', error.message);
        }finally{
            setSaveSpinner(false);
        }
        
    }

    const handleLogout = async () => {
        setLoading(true);

        await AsyncStorage.clear();
        setTimeout(() => {
            setLoading(false);
            router.replace('/');
        }, 800);

    }


    return (
        <View>
            <Modal visible={modal} transparent animationType="fade">
                <View style={{ backgroundColor: '#00000048', flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <View style={{ height: height / 6, width: width - 40, backgroundColor: '#fff', borderRadius: 10, justifyContent: 'space-between', padding: 15 }}>
                        <Text style={{ fontSize: 16, marginTop: 25, color: '#000' }}>Are you sure you want to logout?</Text>
                        <View style={{ alignSelf: 'flex-end', flexDirection: 'row', marginTop: 20, gap: 10 }}>
                            <TouchableOpacity onPress={() => setModal(false)}>
                                <Text style={{ color: '#505050' }}>Cancel</Text>
                            </TouchableOpacity>
                            {loading ? (
                                <ActivityIndicator size="small" color="#cf2a3a" style={{ marginRight: 10 }} />
                            ) : (
                                <TouchableOpacity onPress={handleLogout} disabled={loading}>
                                    <Text style={{ color: '#cf2a3a', fontWeight: 'bold' }}>Logout</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                </View>
            </Modal>

            {/* station modal */}
            <Modal visible={stationModal} transparent animationType="fade">
                <View style={{ backgroundColor: '#00000048', flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <View style={{ height: 'auto', width: width - 40, backgroundColor: '#fff', borderRadius: 10, justifyContent: 'space-between', padding: 15 }}>
                        {stationSpinner ? (
                            <View style={{ justifyContent: 'center' }}>
                                <ActivityIndicator size={'small'} color={'#cf2a3a'} />
                            </View>
                        ) : (
                            <>
                                <Text style={{ fontSize: 16, fontWeight:'bold', paddingBottom: 5, color: '#000' }}>Select Station</Text>
                                <View style={{ flexDirection: 'column', gap: 8, marginTop: 10 }}>
                                    {stations?.map((option) => (
                                        <TouchableOpacity onPress={() => setSelectedStation(option.id)} key={option.id} style={{ paddingHorizontal: 8, paddingVertical: 10, borderWidth: 1, 
                                        borderColor: '#cf2a3a', borderRadius: 5, backgroundColor: user.stationID == option.id || selectedStation == option.id ? '#cf2a3a' : 'transparent' }}>
                                            <Text style={{ fontWeight: 'bold', color: user.stationID == option.id || selectedStation == option.id ? '#fff' : '#cf2a3a' }}>{option.name}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, alignSelf: 'flex-end', marginTop: 20 }}>
                                    <TouchableOpacity onPress={() => {setStationModal(false), setSelectedStation(0)}}>
                                        <Text style={{ color: '#505050', fontWeight: 'bold' }}>Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={handleSaveStation} disabled={saveSpinner}>
                                        {saveSpinner ? (
                                            <ActivityIndicator size={'small'} color={'#cf2a3a'} />
                                        ) : (
                                            <Text style={{ fontWeight: 'bold', color: '#cf2a3a' }}>Save</Text>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </>
                        )}
                    </View>
                </View>
            </Modal>

            <View style={{ paddingTop: 30, height: 100, backgroundColor: '#cf2a3a', paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ color: '#fff', fontSize: 20, fontWeight: 'bold' }}>Settings</Text>
                <TouchableOpacity onPress={() => setModal(true)}>
                    < Ionicons name="log-out-outline" size={30} color={'#fff'} />
                </TouchableOpacity>
            </View>
            <View style={{ paddingVertical: 10, paddingHorizontal: 20 }}>
                <View style={{ paddingHorizontal: 15, paddingVertical: 20, backgroundColor: '#fff', borderColor: '#cf2a3a', borderWidth: 1, borderRadius: 10, marginTop: 5, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', width: '50%' }}>
                        {user?.image ? (
                            <Image source={{ uri: `https://lmbs-staging.creativedevlabs.com/storage/${user.image}` }} style={{ borderRadius: 60, height: 50, width: 50 }} />
                        ) : (
                            <Image source={defaultImg} style={{ borderRadius: 60, height: 50, width: 50 }} />
                        )}
                        <View>
                            <Text style={{ fontWeight: '900', fontSize: 14, color: '#cf2a3a' }}>{user?.name}</Text>
                            <Text style={{ fontSize: 12, color: '#cf2a3a' }}>{user?.role}</Text>
                        </View>
                    </View>
                    <View style={{ flexDirection: 'column', alignItems: 'flex-end', marginTop: 10 }}>
                        <Text style={{ fontSize: 10, color: '#A4ABBA' }}>Station</Text>
                        {user?.station ? (
                            <Text style={{ fontSize: 12, color: '#cf2a3a' }}>{user?.station}</Text>
                        ) : (
                            <Text style={{ fontSize: 12, color: '#A4ABBA' }}>No station selected yet</Text>
                        )}
                    </View>
                </View>
                <TouchableOpacity onPress={fetchStations} style={{ elevation: 5, paddingHorizontal: 15, paddingVertical: 20, borderRadius: 10, backgroundColor: '#fff', marginTop: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                        <MaterialCommunityIcons name="store" size={35} color={'#cf2a3a'} />
                        <View>
                            <Text style={{ fontWeight: 'bold', fontSize: 16, color: '#cf2a3a' }}>Station</Text>
                            <Text style={{ fontSize: 12, color: '#666' }}>Select ticketing station</Text>
                        </View>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={'#cf2a3a'} />
                </TouchableOpacity>
            </View>
        </View>
    )
} 