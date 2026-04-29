import { FetchBookings } from '@/api/bookings';
import { FetchDisabledSeats } from '@/api/disabledSeats';
import { usePassengers } from '@/context/passenger';
import { useTrip } from '@/context/trip';
import { seatSelection } from '@/utils/channel';
import { supabase } from '@/utils/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';


import { AccomsProps } from '@/app/seatPlan';
import PreLoader from './preloader';
import SRBClassSeatPlan from './srBClassSeatPlan';
import SrToursitSeatPlan from './srToursitSeatPlan';


const specialSeats = [1, 2, 3, 4, 5, 6, 7, 8, 57, 58, 59, 60, 61, 62, 63, 64];

export interface SeatProps { 
    passengerSeats: Set<number | string>;
    start: number; 
    limit: number;
    type: string;
    accomm_id: number;
    skipPattern?: boolean;
    bookedSeats?: BookedSeat[];
    seatChannel?:  Set<number | string>
    onSeatSelect?: (seat: number, type: string, accomm_id: number) => void;
    seatAvailability?: (hasAvailable: boolean) => void;
    disabledSeats?: string[];
    alignItemsOn: string
}

export const SeatPlan: React.FC<SeatProps> = React.memo(({ start, limit, passengerSeats, skipPattern = false, onSeatSelect, type, accomm_id, bookedSeats, seatChannel, seatAvailability, disabledSeats, alignItemsOn }) => {
    const { height, width } = useWindowDimensions();

    const items = useMemo(() => {
        const seats = [];

        if(!skipPattern) {
            for(let i = start; i <= limit; i++) {
                seats.push(i);
            }
        }else {
            for(let i = start; i <= limit;) {
                for (let j = 1; j <= 4; j++, i++) {
                    seats.push(i);
                }
                i += 4
            }
        }

        return seats;
    }, [start, limit, skipPattern])

    const bookedSeatMap = useMemo(() => {
        const map: Record<number | string, BookedSeat> = {};
        bookedSeats?.forEach((s) => {
            map[s.seat_no] = s
        });

        return map;
    }, [bookedSeats]);

    
    const disabledSeatsSet = new Set(disabledSeats ?? [])

    const hasSeatAvailable = useMemo(() => {
        return items.some(seat => {
            const booked = bookedSeatMap[seat];
            const isPassenger = passengerSeats.has(seat);
            const inChannel = seatChannel?.has(String(seat)) ?? false;
            const disabled = disabledSeatsSet?.has(String(seat)) ?? false

            return !booked && !isPassenger && !inChannel && !disabled;
        })
    }, [items, bookedSeatMap, passengerSeats, seatChannel])

    useEffect(() => {
        seatAvailability?.(hasSeatAvailable)
    }, [hasSeatAvailable])

    const isTablet = width >= 600;
    const seatSize = Math.min(Math.max(width * 0.09, 33), 80);
    const labelFontSize = isTablet ? 14 : 12;


    return (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, justifyContent: alignItemsOn == 'center' ? 'center' : 'flex-start' }}>
            {items.map((seat) => {
                const specialSeatSet = new Set(specialSeats);
                const isDisabled = disabledSeatsSet?.has(String(seat)) ?? false
                const booked = bookedSeatMap[seat];
                const isPassenger = passengerSeats.has(seat);
                const inChannel = seatChannel?.has(String(seat)) ?? false;
                
                return (
                    <TouchableOpacity disabled={!!booked || isPassenger || inChannel || isDisabled} 
                        onPress={() => onSeatSelect?.(seat, type, accomm_id)} key={seat}
                        style={{ justifyContent: 'center', paddingVertical: 2, width: seatSize, height: seatSize, borderColor: isDisabled ? '#e0e0e0' : '#A9A9B2', borderWidth: 1, borderRadius: 3, 
                        backgroundColor: 
                            booked ? booked?.station?.color
                            : isDisabled ? '#e9e9e9'
                            : isPassenger ? '#BA68C8'
                            : specialSeatSet.has(seat) && !inChannel ? '#E6E2C6' 
                            : inChannel ? '#e6d1e9ff' : 'transparent'
                        }}>
                        <Text style={{ fontSize: labelFontSize, textAlign: 'center', fontWeight: 'bold', 
                            color: booked || isPassenger || inChannel || isDisabled ? '#fff' : '#000' }}>
                                {booked?.passTypeCode ?? seat}
                        </Text>
                    </TouchableOpacity>
                );
            })}
                
        </View>
    )
})

type SRVesselProps = {
    onSeatSelect?: (seat: number | string) => void;
    accommodations: AccomsProps[];
    seatAvailability?: (hasAvailable: boolean) => void;
    setParentLoading?: React.Dispatch<React.SetStateAction<boolean>>
};

export type BookedSeat = {
    seat_no: string | number;
    passTypeCode?: string;
    station?: {
        id: number;
        name?: string;
        created_at?: string;
        updated_at?: string;
        code?: string;
        color?: string;
    }
}

const SRVessel = ({ onSeatSelect, accommodations, seatAvailability, setParentLoading }: SRVesselProps) => {
    const { id, hasScanned, tripAccom } = useTrip();
    const [bookedSeats, setBookedSeats] = useState<BookedSeat[]>([]);
    const { passengers, setPassengers } = usePassengers();
    const [seatSelectionChannel, setSeatSelectionChannel] = useState<string[]>([]);
    const [bclassHasSeats, setBClassHasSeat] = useState<boolean>(true);
    const [touristHasSeats, setTouristHasSeat] = useState<boolean>(true)
    const stationRef = useRef<{ id: string; color: string } | null>(null);
    const tripIdRef = useRef(id);
    const [disabledSeats, setDisabledSeats] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { height, width } = useWindowDimensions();
    
    
    useEffect(() => { tripIdRef.current = id; }, [id]);
    
    useEffect(() => {
        if (isLoading) return;

        if (hasScanned) {
            const accom = tripAccom.toLowerCase() == 'tourist' ? touristHasSeats : bclassHasSeats;
            seatAvailability?.(accom);
        } else {
            seatAvailability?.(bclassHasSeats || touristHasSeats);
        }

    }, [isLoading, bclassHasSeats, touristHasSeats, passengers])

    useEffect(() => {
        const loadStation = async () => {
            const id = await AsyncStorage.getItem('stationID');
            const color = await AsyncStorage.getItem('stationColor');
            stationRef.current = { id: id ?? '', color: color ?? '' };
        };
        loadStation();
    }, [])

    const assignseat = useCallback(async (seat: number | string, type: string, accomm_id: number) => {
        const { id: stationId, color: stationColor } = stationRef.current ?? {};

        try {
            const { error } = await seatSelection(seat, tripIdRef.current, Number(stationId), stationColor);
            
            if(error) {
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
        }catch(error: any) {
            Alert.alert('Error', error.message);
        }
    }, [setPassengers, onSeatSelect])

    useEffect(() => {
        const fetchBookingsAndDisabledSeats = async () => {
            try {
                const [bookings, disabledSeats] = await Promise.all([
                    FetchBookings(id),
                    FetchDisabledSeats()
                ]);
    
                if(!bookings.error) {
                    const bookedSeats = bookings.data.filter((b: any) => b.station_id != null)
                        .flatMap((t: any) =>
                        t.passengers.map((p: any) => ({
                            passTypeCode: p?.passenger_type?.passenger_types_code,
                            seat_no: p?.pivot.seat_no,
                            station: t?.station
                        }))
                    )
                    setBookedSeats(bookedSeats);
                }
    
                if(!disabledSeats.error) {
                    setDisabledSeats(disabledSeats?.vessel?.disabled_seats)
                }
            }catch(error: any) {
                Alert.alert('Error', error.message);
            }finally {
                setParentLoading(false)
                setIsLoading(false);
            }
        }

        fetchBookingsAndDisabledSeats();
    }, [])
    
    useEffect(() => {
        const channel = async () => {
            const { data } = await supabase.from('seats_selections').select('*').eq('trip_id', id);
            const selectedSeats = data?.map((d: any) => d.seat_number);
            
            setSeatSelectionChannel(selectedSeats || []);
    
            const listen = supabase.channel('custom-insert-channel').on('postgres_changes', { 
                event: '*', 
                schema: 'public', 
                table: 'seats_selections' 
            }, (payload) => {
    
                if(payload.eventType == "INSERT") {
                    const newData: any = payload.new;
                    const { seat_number, trip_id } = newData;
        
                    setSeatSelectionChannel(prev => trip_id == id ? [...prev, seat_number] : prev );
                }
    
                if(payload.eventType == 'DELETE') {
                    const oldData: any = payload.old;
                    const { seat_number, trip_id } = oldData;
    
                    setSeatSelectionChannel(prev => trip_id == id ? prev.filter((seat) => 
                        seat != seat_number) : prev
                    )
                }
            });
    
            listen.subscribe();
            return listen;
        }

        let channelInstance: any;
        channel().then(ch => (channelInstance = ch));

        return () => {
            channelInstance?.unsubscribe();
        };
    }, [id])
    

    const bookedSeatMap = useMemo(() => {
        const map: Record<number | string, BookedSeat> = {};
        bookedSeats?.forEach((s) => {
            map[s.seat_no] = s
        });

        return map;
    }, [bookedSeats]);

    const BClassAccomsOptions = ['b class','b-class', 'business class', 'deluxe'];
    const touristAccoms = ['tourist', 'economy'];

    const TouristAccoms = useMemo(() => accommodations?.find((accom) => touristAccoms.includes(accom?.name.toLowerCase())), [accommodations]);
    const BClassAccomms = useMemo(() => accommodations?.find((accom) => BClassAccomsOptions.includes(accom?.name.toLowerCase())), [accommodations]);
    const passengerSeats = useMemo(() => new Set(passengers.map(p => p.seatNumber)), [passengers]);
    const seatChannel = useMemo(() => new Set(seatSelectionChannel.map(String)), [seatSelectionChannel]);

    return (
        <View style={{ width: '100%', height: height + 290, backgroundColor: '#f0f0f0', marginTop: 20, paddingTop: 10, borderRadius: 50, position: 'relative' }}>
            {isLoading == true ? (
                <PreLoader loading={isLoading} />
            ) : (
                <>
                    {hasScanned != true ? (
                        <>
                            <SRBClassSeatPlan
                                passengerSeats={passengerSeats}
                                seatChannel={seatChannel}
                                bookedSeatMap={bookedSeatMap}
                                assignseat={assignseat}
                                BClassAccomms={BClassAccomms}
                                seatAvailability={setBClassHasSeat}
                            />
                            
                            <SrToursitSeatPlan
                                passengerSeats={passengerSeats}
                                seatChannel={seatChannel}
                                bookedSeats={bookedSeats} 
                                assignseat={assignseat}
                                TouristAccoms={TouristAccoms}
                                seatAvailability={setTouristHasSeat}
                                disabledSeats={disabledSeats}
                            />
                        </>
                    ) : (
                        <>
                            <SRBClassSeatPlan
                                passengerSeats={passengerSeats}
                                seatChannel={seatChannel}
                                bookedSeatMap={bookedSeatMap}
                                assignseat={assignseat}
                                BClassAccomms={BClassAccomms}
                                isDisabled={tripAccom == 'Tourist'}
                                seatAvailability={setBClassHasSeat}
                            />
                            
                            <SrToursitSeatPlan
                                passengerSeats={passengerSeats}
                                seatChannel={seatChannel}
                                bookedSeats={bookedSeats} 
                                assignseat={assignseat}
                                TouristAccoms={TouristAccoms}
                                isDisabled={tripAccom != 'Tourist'}
                                seatAvailability={setTouristHasSeat}
                                disabledSeats={disabledSeats}
                            />
                        </>
                    )}
                </>
            )}


        </View>
    )
} 

export default React.memo(SRVessel)