import { FetchBookings } from '@/api/bookings';
import { usePassengers } from '@/context/passenger';
import { useTrip } from '@/context/trip';
import { seatSelection } from '@/utils/channel';
import { supabase } from '@/utils/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Dimensions, Text, TouchableOpacity, View } from 'react-native';

import { AccomsProps } from '@/app/seatPlan';
import L1BClassSeatPlan from './l1BClassSeatPlan';
import L1TouristSeatPlan from './L1TouristSeatPlan';
import PreLoader from './preloader';


const { height } = Dimensions.get('window');

const specialSeatList = ['BC1', 'BC2', 'BC3', 'BC4', 'BC5', 'P1', 'P2', 'P4', 'P3', 'P5', 'P6', 'P7', 'P8'];
const specialSeats = new Set(specialSeatList);
const bClassNames = ['Business Class', 'B Class', 'B-Class'];



interface SeatProps {
    start: number;
    limit: number;
    skipPattern?: boolean;
    skip?: number;
    count?: number;
    letter: string;
    type: string;
    accomm_id: number;
    bookedSeats?: BookedSeat[];
    onSeatSelect?: (seat: string | number, type: string, accomm_id: number) => void;
    passengerSeats: Set<number | string>;
    seatChannel?: Set<number | string>;
    seatAvailability?: (hasAvailable: boolean) => void;
}

export const SeatPlan: React.FC<SeatProps> = React.memo(({ start, limit, skipPattern = false, letter, skip = 0, count = 0, onSeatSelect, type, accomm_id, bookedSeats, seatChannel, passengerSeats, seatAvailability }) => {
    const items = useMemo(() => {
        const seats = [];

        if (!skipPattern) {
            for (let i = start; i <= limit; i++) {
                seats.push(i);
            }
        } else {
            for (let i = start; i <= limit;) {
                for (let j = 1; j <= count; j++, i++) {
                    seats.push(i);
                }
                i += skip;
            }
        }

        return seats;
    }, [start, limit, skipPattern, count, skip]);

    const bookedSeatsMap = useMemo(() => {
        const map: Record<number | string, BookedSeat> = {};
        bookedSeats?.forEach((s) => {
            map[s.seat_no] = s;
        });
        return map;
    }, [bookedSeats]);

    const hasSeatAvailable = useMemo(() => {
        return items.some(seat => {
            const booked = bookedSeatsMap[`${letter}${seat}`]
            const isPassenger = passengerSeats?.has(`${letter}${seat}`);
            const inChannel = seatChannel?.has(`${letter}${seat}`) ?? false;

            return !booked && !isPassenger && !inChannel;
        })
    }, [items, bookedSeatsMap, passengerSeats, seatChannel]);

    useEffect(() => {
        seatAvailability?.(hasSeatAvailable)
    }, [hasSeatAvailable])



    return (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 2, justifyContent: 'center' }}>
            {items.map((seat) => {
                const seatKey = `${letter}${seat}`;
                const booked = bookedSeatsMap[seatKey];
                const isPassenger = passengerSeats?.has(seatKey);
                const inChannel = seatChannel?.has(seatKey) ?? false;

                return (
                    <TouchableOpacity
                        key={seat}
                        disabled={!!booked || isPassenger || inChannel}
                        onPress={() => onSeatSelect?.(seatKey, type, accomm_id)}
                        style={{
                            width: 34, height: 34, borderColor: '#A9A9B2',
                            borderWidth: 1, borderRadius: 3, alignItems: 'center',
                            justifyContent: 'center', margin: 2,
                            backgroundColor:
                                booked ? booked?.station.color
                                : isPassenger ? '#BA68C8'
                                : specialSeats.has(seatKey) && !inChannel ? '#E6E2C6'
                                : inChannel ? '#e6d1e9ff'
                                : 'transparent'
                        }}>
                        <Text style={{
                            fontSize: 10.3, fontWeight: '900',
                            color: booked || isPassenger || inChannel ? '#fff' : '#000'
                        }}>
                            {booked?.passTypeCode ?? seatKey}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
});

type L1VesselProps = {
    onSeatSelect?: (seat: string | number) => void;
    accommodations: AccomsProps[];
    seatAvailability?: (hasAvailable: boolean) => void;
    setParentLoading?: React.Dispatch<React.SetStateAction<boolean>>;
}

type BookedSeat = {
    seat_no: string | number;
    passTypeCode?: string;
    station: {
        id: number;
        name: string;
        created_at?: string;
        updated_at?: string;
        code: string;
        color: string;
    }
}

const L1Vessel = ({ onSeatSelect, accommodations, seatAvailability, setParentLoading }: L1VesselProps) => {
    const { id, hasScanned, tripAccom } = useTrip();
    const [bookedSeats, setBookedSeats] = useState<BookedSeat[]>([]);
    const { passengers, setPassengers } = usePassengers();
    const [seatSelectionChannel, setSeatSelectionChannel] = useState<string[]>([]);
    const [bclassHasSeats, setBClassHasSeats] = useState(true);
    const [touristHasSeats, setTouristHasSeats] = useState(true);
    const [isLoading, setIsLoading] = useState(true);

    const stationRef = useRef<{ id: string; color: string } | null>(null);

    const isTouristPaxAccom = useMemo(() =>
        passengers.some(p => p.hasScanned === true && p.accommodation === 'Tourist')
    , [passengers]);

    useEffect(() => {
        if(hasScanned) {
            if(isTouristPaxAccom) {
                seatAvailability?.(touristHasSeats)
            }else {
                seatAvailability?.(bclassHasSeats)
            }
        }else {
            seatAvailability?.(bclassHasSeats || touristHasSeats)
        }
    }, [bclassHasSeats, touristHasSeats])

    useEffect(() => {
        const loadStation = async () => {
            const stationId = await AsyncStorage.getItem('stationID');
            const stationColor = await AsyncStorage.getItem('stationColor');
            stationRef.current = { id: stationId ?? '', color: stationColor ?? '' };
        };
        loadStation();
    }, []);

    const assignseat = useCallback(async (seat: string | number, type: string, accomm_id: number) => {
        const { id: stationId, color: stationColor } = stationRef.current ?? {};
        try {
            const { error } = await seatSelection(seat, id, Number(stationId), stationColor);

            if (error) {
                Alert.alert('Error', 'Seat selection failed. Please try again later.');
            }

            const tempId = Crypto.randomUUID();
            let broadcastSeat = false;

            setPassengers(prev => {
                const specialPax = prev.filter(p => p.hasScanned || p.forResched);
                const specialPaxWithNoSeat = specialPax.find(p => !p.seatNumber || p.seatNumber === '');

                if (specialPax.length > 0 && !specialPaxWithNoSeat) {
                    broadcastSeat = false;
                    Alert.alert('Opps!', 'All passengers already have seats assigned.');
                    return prev;  
                }

                if(!specialPaxWithNoSeat) {
                    broadcastSeat = true;
                    return [
                        ...prev,
                        { id: tempId, seatNumber: seat, accommodation: type, accommodationID: accomm_id }
                    ]
                }

                broadcastSeat = true;
                return prev.map(p =>
                    (p.hasScanned === true || p.forResched === true) && p.id === specialPaxWithNoSeat.id
                        ? { ...p, seatNumber: seat, accommodation: type, accommodationID: accomm_id }
                        : p
                );
            });

            if(broadcastSeat) {
                onSeatSelect?.(seat);
            }
        } catch (error: any) {
            Alert.alert('Error', error.message);
        }
    }, [id, onSeatSelect, setPassengers]);

    useEffect(() => {
        const fetchBookings = async () => {
            try {
                const seats = await FetchBookings(id);

                if (!seats.error) {
                    const bookings = seats.data.flatMap((t: any) =>
                        t.passengers.map((p: any) => ({
                            passTypeCode: p.passenger_type?.passenger_types_code,
                            seat_no: p.pivot.seat_no,
                            station: t.station
                        }))
                    );
                    setBookedSeats(bookings);
                }
            } catch (error: any) {
                Alert.alert('Error', error.message);
            }finally {
                setParentLoading(false);
                setIsLoading(false);
            }
        };

        fetchBookings();
    }, []);

    useEffect(() => {
        const channel = async () => {
            const { data } = await supabase.from('seats_selections').select('*').eq('trip_id', id);
            const selectedSeats = data?.map((d: any) => d.seat_number);
            setSeatSelectionChannel(selectedSeats || []);

            const listen = supabase.channel('custom-insert-channel').on('postgres_changes', { event: '*', schema: 'public', table: 'seats_selections' }, (payload) => {
                if (payload.eventType == 'INSERT') {
                    const newData: any = payload.new;
                    const { seat_number, trip_id } = newData;
                    setSeatSelectionChannel(prev => trip_id == id ? [...prev, seat_number] : prev);
                }

                if (payload.eventType == 'DELETE') {
                    const oldData: any = payload.old;
                    const { seat_number, trip_id } = oldData;
                    setSeatSelectionChannel(prev => trip_id == id ? prev.filter((seat) => seat != seat_number) : prev);
                }
            });

            listen.subscribe();
            return listen;
        };

        let channelInstance: any;
        channel().then(ch => (channelInstance = ch));

        return () => {
            channelInstance?.unsubscribe();
        };
    }, [id]);

    const BClassAccomsOptions = ['b class','b-class', 'business class', 'deluxe'];
    const touristAccoms = ['tourist', 'economy'];

    const passengerSeats = useMemo(() => new Set(passengers.map((p) => p.seatNumber)), [passengers]);
    const TouristAccoms = useMemo(() => accommodations?.find((accom) => touristAccoms.includes(accom?.name.toLowerCase())), [accommodations]);
    const BClassAccomms = useMemo(() => accommodations?.find((accom) => BClassAccomsOptions.includes(accom?.name.toLocaleLowerCase())), [accommodations]);

    const seatChannel = useMemo(() => new Set(seatSelectionChannel), [seatSelectionChannel]);
    console.log('trip accom', tripAccom)

    return (
        <View style={{ width: '100%', height: height + 290, backgroundColor: '#FAFAFA', marginTop: 20, paddingTop: 10, borderRadius: 50 }}>
            
            {isLoading == true ? (
                <PreLoader loading={isLoading} />
            ) : (
                <>
                    {hasScanned != true ? (
                        <>
                            <L1BClassSeatPlan 
                                passengerSeats={passengerSeats}
                                seatChannel={seatChannel}
                                bookedSeats={bookedSeats}
                                assignseat={assignseat}
                                BClassAccomms={BClassAccomms}
                                seatAvailability={setBClassHasSeats}
                            />

                            <L1TouristSeatPlan 
                                passengerSeats={passengerSeats}
                                seatChannel={seatChannel}
                                bookedSeats={bookedSeats}
                                assignseat={assignseat}
                                TouristAccoms={TouristAccoms}
                                seatAvailability={setTouristHasSeats}
                            />
                        </>
                    ) : (
                        <>
                            <L1BClassSeatPlan 
                                passengerSeats={passengerSeats}
                                seatChannel={seatChannel}
                                bookedSeats={bookedSeats}
                                assignseat={assignseat}
                                BClassAccomms={BClassAccomms}
                                isDisabled={tripAccom == 'Tourist'}
                                seatAvailability={setBClassHasSeats}
                            />
                
                            <L1TouristSeatPlan 
                                passengerSeats={passengerSeats}
                                seatChannel={seatChannel}
                                bookedSeats={bookedSeats}
                                assignseat={assignseat}
                                TouristAccoms={TouristAccoms}
                                isDisabled={tripAccom != 'Tourist'}
                                seatAvailability={setTouristHasSeats}
                            />
                        </>
                    )}
                </>
            )}

            
        </View>
    );
};

export default React.memo(L1Vessel);