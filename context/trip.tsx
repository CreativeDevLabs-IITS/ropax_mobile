import React, { createContext, ReactNode, SetStateAction, useContext, useState } from "react";

export type TripContextProps = {
    id: number;
    vessel: string;
    routeID: number | null;
    origin: string;
    destination: string;
    vessel_id: number;
    totalFare: number;
    originalFare: number;
    note?: string;
    departure_date: string;
    departure_time: string;
    fareChange: number | null;
    cashTendered: number;
    webCode: string;
    code: string;
    mobileCode: string;
    refNumber: string;
    isCargoable: number;
    approvedBy?: string;
    hasScanned?: boolean;
    tripAccom?: string;
    bookingId?: number | null;
    forReschedule?: boolean;
    reSchedAll?: boolean;
    discountId?:number;
    isDiscounted?: boolean;
    couponCode?: string;
    discountType?: string;
    discountValue?: number;
    setVessel: React.Dispatch<React.SetStateAction<string>>;
    setRouteID: React.Dispatch<React.SetStateAction<number>>;
    setOrigin: React.Dispatch<React.SetStateAction<string>>;
    setDestination: React.Dispatch<React.SetStateAction<string>>;
    setID: React.Dispatch<React.SetStateAction<number>>;
    setVesselID: React.Dispatch<React.SetStateAction<number>>;
    setTotalFare: React.Dispatch<React.SetStateAction<number>>;
    setOriginalFare: React.Dispatch<React.SetStateAction<number>>;
    setNote: React.Dispatch<React.SetStateAction<string>>;
    setDepartureDate: React.Dispatch<SetStateAction<string>>;
    setDepartureTime: React.Dispatch<React.SetStateAction<string>>;
    setFareChange: React.Dispatch<React.SetStateAction<number | null>>;
    setWebCode: React.Dispatch<React.SetStateAction<string>>;
    setCode: React.Dispatch<React.SetStateAction<string>>;
    setMobileCode: React.Dispatch<React.SetStateAction<string>>;
    setCashTendered: React.Dispatch<React.SetStateAction<number>>;
    setRefNumber: React.Dispatch<React.SetStateAction<string>>;
    setIsCargoable: React.Dispatch<React.SetStateAction<number>>;
    setApprovedBy: React.Dispatch<React.SetStateAction<string>>;
    setHasScanned: React.Dispatch<React.SetStateAction<boolean>>;
    setTripAccom: React.Dispatch<React.SetStateAction<string>>;
    setBookingId: React.Dispatch<React.SetStateAction<number | null>>;
    setForReschedule: React.Dispatch<React.SetStateAction<boolean>>;
    setReschedAll: React.Dispatch<React.SetStateAction<boolean>>;
    setDiscountId: React.Dispatch<React.SetStateAction<number>>;
    setIsDiscounted: React.Dispatch<React.SetStateAction<boolean>>;
    setCouponCode: React.Dispatch<React.SetStateAction<string>>;
    setDiscountType: React.Dispatch<React.SetStateAction<string>>;
    setDiscountValue: React.Dispatch<React.SetStateAction<number | null>>;
    clearTrip: () => void;
}

const TripContext = createContext<TripContextProps | undefined>(undefined);

type TripProviderProps = {
    children: ReactNode;
}


export const TripProvider = ({ children }: TripProviderProps) => {
    const [vessel, setVessel] = useState<string>('');
    const [routeID, setRouteID] = useState<number | null>(null);
    const [origin, setOrigin] = useState<string>('');
    const [destination, setDestination] = useState<string>('');
    const [refNumber, setRefNumber] = useState<string>('');
    const [webCode, setWebCode] = useState('');
    const [code, setCode] = useState('');
    const [mobileCode, setMobileCode] = useState('');
    const [totalFare, setTotalFare] = useState<number>(0);
    const [originalFare, setOriginalFare] = useState<number | null>(null)
    const [id, setID] = useState<number>(0);
    const [vessel_id, setVesselID] = useState<number>(0);
    const [fareChange, setFareChange] = useState<number | null>(null);
    const [cashTendered, setCashTendered] = useState<number>(0);
    const [departure_date, setDepartureDate] = useState<string>('');
    const [departure_time, setDepartureTime] = useState<string>('');
    const [note, setNote] = useState<string>('');
    const [isCargoable, setIsCargoable] = useState<number>(0);
    const [approvedBy, setApprovedBy] = useState('');
    const [hasScanned, setHasScanned] = useState<boolean>(false);
    const [tripAccom, setTripAccom] = useState('');
    const [bookingId, setBookingId] = useState<number | null>(null)
    const [forReschedule, setForReschedule] = useState<boolean>(false);
    const [reSchedAll, setReschedAll] = useState<boolean>(true);
    const [discountId, setDiscountId] =useState<number | null>(null);
    const [isDiscounted, setIsDiscounted] = useState(false);
    const [couponCode, setCouponCode] = useState('');
    const [discountType, setDiscountType] = useState('');
    const [discountValue, setDiscountValue] = useState(null);

    const clearTrip = () => {
        setID(0);
        setVessel("");
        setRouteID(null);
        setOrigin("");
        setDestination("");
        setVesselID(0);
        setTotalFare(0);
        setOriginalFare(null)
        setFareChange(null);
        setCashTendered(0);
        setWebCode("");
        setMobileCode("");
        setCode("");
        setRefNumber("");
        setDepartureDate('');
        setDepartureTime("");
        setIsCargoable(0);
        setTripAccom('');
        setBookingId(null);
        setHasScanned(false);
        setApprovedBy('');
        setNote('');
        setForReschedule(false);
        setReschedAll(true);
        setIsDiscounted(false);
        setCouponCode('');
        setDiscountType('');
        setDiscountValue(null);
        setDiscountId(null);
    };

    return (
        <TripContext.Provider value={{ id, vessel, routeID, origin, destination, vessel_id, totalFare, originalFare, note, departure_date, departure_time, tripAccom, bookingId, discountId, isDiscounted, couponCode, discountType, discountValue,
                                    fareChange, code, webCode, mobileCode, cashTendered, refNumber, isCargoable, approvedBy, hasScanned, forReschedule, reSchedAll, setDiscountId, setCouponCode, setDiscountType, setDiscountValue,
                                    setVessel, setID, setRouteID, setOrigin, setDestination, setVesselID, setTotalFare, setOriginalFare, setNote, setDepartureDate,setDepartureTime, setHasScanned, setBookingId, setIsDiscounted,
                                    setFareChange, setCode, setWebCode, setMobileCode, setCashTendered, setRefNumber, setIsCargoable, clearTrip, setApprovedBy, setTripAccom, setForReschedule, setReschedAll }}>
            {children}
        </TripContext.Provider>
    );
};

export const useTrip = () => {
    const context = useContext(TripContext);
    if(!context) {
        throw new Error('useTrip must be used within a TripProvider');
    }

    return context;
}


