import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { SeatPlan } from './L1Vessel';

type L1TouristSeatPlanProps = {
    passengerSeats: Set<number | string>;
    seatChannel: Set<string>;
    bookedSeats: any[];
    assignseat: (seat: number | string, type: string, accomm_id: number) => void;
    TouristAccoms?: { 
        id: number; name?: string 
    };
    isDisabled?: boolean;
    seatAvailability?: (hasAvailable: boolean) => void;
}

const L1TouristSeatPlan = ({ passengerSeats, seatChannel, bookedSeats, assignseat, TouristAccoms, isDisabled, seatAvailability }: L1TouristSeatPlanProps) => {
    const [aHasSeats, setAHasSeats] = useState(true);
    const [bHasSeats, setBHasSeats] = useState(true);
    const [cHasSeats, setCHasSeats] = useState(true);
    const [dHasSeats, setDHasSeats] = useState(true);
    const [eHasSeats, setEHasSeats] = useState(true);
    const [fHasSeats, setFHasSeats] = useState(true);

    useEffect(() => {
        seatAvailability?.(
            aHasSeats || bHasSeats || cHasSeats || dHasSeats || eHasSeats || fHasSeats
        );
    }, [aHasSeats, bHasSeats, cHasSeats, dHasSeats, eHasSeats, fHasSeats]);

    return (
        <View pointerEvents={isDisabled ? 'none' : 'auto'} style={{ opacity: isDisabled ? 0.3 : 1 }}>
            <Text style={{ textAlign: 'center', fontWeight: '900', letterSpacing: 1, fontSize: 16, color: '#cf2a3a', marginTop: 30 }}>ECONOMY CLASS</Text>
            <View style={{ marginTop: 15, flexDirection: 'row', justifyContent: 'space-between', alignSelf: 'center' }}>
                <View style={{ width: '50%', flexDirection: 'row', justifyContent: 'center'}}>
                    <View style={{ width: '20%' }}>
                        <SeatPlan 
                            passengerSeats={passengerSeats} 
                            seatChannel={seatChannel} 
                            start={9} 
                            limit={15} 
                            letter='A' 
                            bookedSeats={bookedSeats} 
                            onSeatSelect={assignseat} 
                            type={TouristAccoms?.name} 
                            accomm_id={TouristAccoms?.id}
                            seatAvailability={setAHasSeats} 
                        />
                    </View>
                    <View style={{ width: '20%' }}>
                        <SeatPlan 
                            passengerSeats={passengerSeats} 
                            seatChannel={seatChannel} 
                            start={9} 
                            limit={15} 
                            letter='B' 
                            bookedSeats={bookedSeats} 
                            onSeatSelect={assignseat} 
                            type={TouristAccoms?.name} 
                            accomm_id={TouristAccoms?.id}
                            seatAvailability={setBHasSeats} 
                        />
                    </View>
                    <View style={{ width: '20%' }}>
                        <SeatPlan 
                            passengerSeats={passengerSeats} 
                            seatChannel={seatChannel} 
                            start={9} 
                            limit={15} 
                            letter='C' 
                            bookedSeats={bookedSeats} 
                            onSeatSelect={assignseat} 
                            type={TouristAccoms?.name} 
                            accomm_id={TouristAccoms?.id}
                            seatAvailability={setCHasSeats} 
                        />
                    </View>
                </View>

                <View style={{ width: '50%', flexDirection: 'row', justifyContent: 'center'}}>
                    <View style={{ width: '20%' }}>
                        <SeatPlan 
                            passengerSeats={passengerSeats} 
                            seatChannel={seatChannel} 
                            start={9} 
                            limit={15} 
                            letter='D' 
                            bookedSeats={bookedSeats} 
                            onSeatSelect={assignseat} 
                            type={TouristAccoms?.name} 
                            accomm_id={TouristAccoms?.id}
                            seatAvailability={setDHasSeats} 
                        />
                    </View>
                    <View style={{ width: '20%' }}>
                        <SeatPlan 
                            passengerSeats={passengerSeats} 
                            seatChannel={seatChannel} 
                            start={9} 
                            limit={15} 
                            letter='E' 
                            bookedSeats={bookedSeats} 
                            onSeatSelect={assignseat} 
                            type={TouristAccoms?.name} 
                            accomm_id={TouristAccoms?.id}
                            seatAvailability={setEHasSeats} 
                        />
                    </View>
                    <View style={{ width: '20%' }}>
                        <SeatPlan 
                            passengerSeats={passengerSeats} 
                            seatChannel={seatChannel} 
                            start={9} 
                            limit={15} 
                            letter='F' 
                            bookedSeats={bookedSeats} 
                            onSeatSelect={assignseat} 
                            type={TouristAccoms?.name} 
                            accomm_id={TouristAccoms?.id}
                            seatAvailability={setFHasSeats} 
                        />
                    </View>
                </View>
            </View>
        </View>
    )
}

export default React.memo(L1TouristSeatPlan)