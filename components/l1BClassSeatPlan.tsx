import React, { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { SeatPlan } from "./L1Vessel";

type L1BClassSeatPlanProps = {
    passengerSeats: Set<number | string>;
    seatChannel: Set<string>;
    bookedSeats: any[];
    assignseat: (seat: number | string, type: string, accomm_id: number) => void;
    BClassAccomms?: { 
        id: number; name?: string 
    };
    isDisabled?: boolean;
    seatAvailability?: (hasAvailable: boolean) => void;
}

const L1BClassSeatPlan = ({ passengerSeats, seatChannel, bookedSeats, assignseat, BClassAccomms, isDisabled, seatAvailability }: L1BClassSeatPlanProps) => {
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
    }, [aHasSeats, bHasSeats, cHasSeats, dHasSeats, eHasSeats, fHasSeats])

    return (
        <View pointerEvents={isDisabled ? 'none' : 'auto'} style={{ opacity: isDisabled ? 0.3 : 1 }}>
            <Text style={{ textAlign: 'center', fontWeight: '900', letterSpacing: 1, fontSize: 16, color: '#cf2a3a' }}>DELUXE CLASS</Text>
            <View style={{ marginTop: 15, flexDirection: 'row', justifyContent: 'space-between', alignSelf: 'center' }}>
                <View style={{ width: '50%', flexDirection: 'row', justifyContent: 'center' }}>
                    <View style={{ width: '20%' }}>
                        <SeatPlan 
                            passengerSeats={passengerSeats} 
                            seatChannel={seatChannel} 
                            start={1} 
                            limit={8} 
                            skipPattern={false} 
                            bookedSeats={bookedSeats} 
                            letter='A' 
                            onSeatSelect={assignseat} 
                            type={BClassAccomms?.name} 
                            accomm_id={BClassAccomms?.id}
                            seatAvailability={setAHasSeats}
                        />
                    </View>
                    <View style={{ width: '20%' }}>
                        <SeatPlan 
                            passengerSeats={passengerSeats} 
                            seatChannel={seatChannel} 
                            count={1} 
                            start={1} 
                            limit={8} 
                            bookedSeats={bookedSeats}
                            skipPattern={false} 
                            letter='B'
                            onSeatSelect={assignseat} 
                            type={BClassAccomms?.name} 
                            accomm_id={BClassAccomms?.id}
                            seatAvailability={setBHasSeats}
                        />
                    </View>
                    <View style={{ width: '20%' }}>
                        <SeatPlan 
                            passengerSeats={passengerSeats} 
                            seatChannel={seatChannel} 
                            count={1} 
                            start={1} 
                            limit={8} 
                            bookedSeats={bookedSeats}
                            skipPattern={false} 
                            letter='C'
                            onSeatSelect={assignseat} 
                            type={BClassAccomms?.name} 
                            accomm_id={BClassAccomms?.id}
                            seatAvailability={setCHasSeats}
                        />
                    </View>
                </View>
                <View style={{ width: '50%', flexDirection: 'row', justifyContent: 'center' }}>
                    <View style={{ width: '20%' }}>
                        <SeatPlan 
                            passengerSeats={passengerSeats} 
                            seatChannel={seatChannel} 
                            start={1} 
                            limit={8} 
                            skipPattern={false} 
                            bookedSeats={bookedSeats} 
                            letter='D' 
                            onSeatSelect={assignseat} 
                            type={BClassAccomms?.name} 
                            accomm_id={BClassAccomms?.id}
                            seatAvailability={setDHasSeats}
                        />
                    </View>
                    <View style={{ width: '20%' }}>
                        <SeatPlan 
                            passengerSeats={passengerSeats} 
                            seatChannel={seatChannel} 
                            count={1} 
                            start={1} 
                            limit={8} 
                            bookedSeats={bookedSeats}
                            skipPattern={false} 
                            letter='E'
                            onSeatSelect={assignseat} 
                            type={BClassAccomms?.name} 
                            accomm_id={BClassAccomms?.id}
                            seatAvailability={setEHasSeats}
                        />
                    </View>
                    <View style={{ width: '20%' }}>
                        <SeatPlan 
                            passengerSeats={passengerSeats} 
                            seatChannel={seatChannel} 
                            count={1} 
                            start={1} 
                            limit={8} 
                            bookedSeats={bookedSeats}
                            skipPattern={false} 
                            letter='F'
                            onSeatSelect={assignseat} 
                            type={BClassAccomms?.name} 
                            accomm_id={BClassAccomms?.id}
                            seatAvailability={setFHasSeats}
                        />
                    </View>
                </View>
            </View>
        </View>
    )
}

export default React.memo(L1BClassSeatPlan)