import { PassengerProps } from "@/context/passenger";
import { TripContextProps } from "@/context/trip";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

export async function SaveBooking(trip: TripContextProps, passengers: PassengerProps[], stationID: number, discountId?: number, discountAmount?: number, tenderedAmount?: number) {
    const extras = Constants.expoConfig?.extra ?? {};
    const API_KEY = extras.API_KEY as string;
    const API_URL = extras.API_URL as string;
    const ORIGIN = extras.ORIGIN as string;

    try {
        const token = await AsyncStorage.getItem('token');

        if (!token) {
            throw new Error('No token found. Please login again.');
        }

        const res = await fetch(`${API_URL}booking/save`, {
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
                trip_schedule_id: trip.id,
                web_code: trip.webCode,
                discountId: discountId,
                discountAmount: discountAmount,
                tendered_amount: tenderedAmount,
                passengers: passengers.map((p) => ({
                    pax_id: Number(p.pax_id),
                    first_name: p.name?.split(',')[1],
                    last_name: p.name?.split(',')[0],
                    gender: p.gender,
                    age: p.age,
                    address: p.address ?? '',
                    nationality: p?.nationality,
                    accommodation_type_id: p.accommodationID ?? null,
                    passenger_type_id: p.passType_id,
                    passType: p.passType,
                    seat_no: String(p.seatNumber),
                    fare: p.fare,

                    infants: Array.isArray(p.infant) ? p.infant?.map((i) => ({
                        pax_id: Number(i.pax_id) ?? null,
                        first_name: i.name.split(',')[1],
                        last_name: i.name.split(',')[0],
                        age: i.age,
                        gender: i.gender,
                        address: p.address ?? '',
                        nationality: p.nationality ?? '',
                        accommodation_type_id: p.accommodationID,
                        passenger_type_id: i.passType_id,
                        seat_no: '',
                    })) : [],

                    cargos: Array.isArray(p.cargo) ? p.cargo?.map((c) => ({
                        category: c?.parcelCategory ?? '',
                        brand: c?.cargoBrand ?? '',
                        specification: c?.cargoSpecification ?? '',
                        plate_no: c?.cargoPlateNo ?? '',
                        cargo_type: c?.cargoType,
                        quantity: c.quantity,
                        amount: c.cargoAmount,
                        trip_id: trip.id,
                    })) : [],
                }))
            })
        });

        const response = await res.json();

        if (!res.ok) {
            throw new Error(response.message);
        }

        return response;

    } catch (error) {
        throw error;
    }
}