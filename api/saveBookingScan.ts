import { PassengerProps } from "@/context/passenger";
import { TripContextProps } from "@/context/trip";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";


export async function SaveBookingScan(trip: TripContextProps, passengers: PassengerProps[], stationID: number, bookingId: number, discountId?: number, discountAmount?: number, tenderedAmount?: number) {
    const extras = Constants.expoConfig?.extra ?? {};
    const API_KEY = extras.API_KEY as string;
    const API_URL = extras.API_URL as string;
    const ORIGIN = extras.ORIGIN as string;

    try {
        const token = await AsyncStorage.getItem('token');
        
        if(!token) {
            throw new Error('No token found. Please login again.');
        }

        const res = await fetch(`${API_URL}booking-scan/save`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'x-api-key': `${API_KEY}`,
                'Origin': `${ORIGIN}`,
                'Authorization': `${token}`
            },
            body: JSON.stringify({
                station_id: Number(stationID),
                booking_id: bookingId,
                trip_schedule_id: trip.id,
                web_code: trip.webCode,
                discountId: discountId,
                discountAmount: discountAmount,
                tendered_amount: tenderedAmount,
                passengers: passengers.map((p) => ({
                    passenger_id: Number(p.id),
                    accommodation_type_id: p.accommodationID ?? null,
                    seat_no: String(p.seatNumber),
                    fare: p.fare,

                    cargos: Array.isArray(p.cargo) ? p.cargo?.map((c) => ({
                        cargo_option_id: c.cargoOptionID,
                        quantity: c.quantity,
                        amount: c.cargoAmount,
                        trip_id: trip.id
                     })) : []
                }))
            })
        });
    
        const response = await res.json();
        
        if(!res.ok) {
            throw new Error(response.message);
        }

        return response;

    } catch(error) {
        throw error;
    }
}