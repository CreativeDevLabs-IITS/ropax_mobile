import { PaxCargoProperties } from '@/context/cargoProps';
import { TripContextProps } from '@/context/trip';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';



export async function SaveCargo(trip: TripContextProps, cargoProps: PaxCargoProperties[], isCargoAdded: boolean, passenger_id: number) {
    const extras = Constants.expoConfig?.extra ?? {};
    const API_KEY = extras.API_KEY as string;
    const API_URL = extras.API_URL as string;
    const ORIGIN = extras.ORIGIN as string;

    try {
        const token = await AsyncStorage.getItem('token');
        const station_id = await AsyncStorage.getItem('stationID');
        
        if(!token) {
            throw new Error('No token found. Please login again.');
        }
        
        const res = await fetch(`${API_URL}cargo/save`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'x-api-key': `${API_KEY}`,
                'Origin': `${ORIGIN}`,
                'Authorization': `${token}`
            },
            body: JSON.stringify({
                isCargoAdded: isCargoAdded,
                passenger_id: passenger_id,
                station_id: Number(station_id),
                cargos: cargoProps.map(c => ({
                    cargo_option_id: c?.cargoOptionID,
                    category: c?.parcelCategory,
                    brand: c?.cargoBrand,
                    specification: c?.cargoSpecification,
                    cargo_type: c?.cargoType,
                    quantity: c.quantity,
                    amount: c.cargoAmount,
                    trip_id: trip.id
                })),
            })
        });
    
        const response = await res.json();
        
    
        if(!res.ok) {
            throw new Error(response.message);
        }

        return response;
    }catch(error) {
        throw error;
    }
}

