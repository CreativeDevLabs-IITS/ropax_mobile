import React, { createContext, ReactNode, useCallback, useContext, useMemo, useState } from "react";

type CargoTypeProps = {
    id?: number;
    name?: string;
}

type CargoPivotProps = {
    id?: number;
    cargo_type_id?: number;
    parcel_category_id?: number;
    price?: number;
    specification: string;
    route_id?: number;
}

type CargoParcelProps = {
    id?: number;
    name?: string;
}


export type PaxCargoProperties = {
    id?: number;
    withPassenger?: boolean;
    passenger_id?: number;
    cargoOptionID?: number;
    cargoType?: string;
    cargoTypeID?: number;
    cargoBrand?: string;       // free-text input
    cargoSpecification?: string; // free-text input
    cargoPlateNo?: string;
    parcelCategory?: string;   // free-text input
    cargoAmount?: number;
    quantity?: number;
    isCargoAdded?: boolean;
}

export type CargoProperties = {
    data: {
        cargo_types?: CargoTypeProps[];
        parcel_categories?: CargoParcelProps[];
        cargo_options?: CargoPivotProps[];
    };
}


type CargoContextType = {
    cargoProperties: CargoProperties | null;
    paxCargoProperty: PaxCargoProperties[];
    setCargoProperties: React.Dispatch<React.SetStateAction<CargoProperties | null>>;
    setPaxCargoProperties: React.Dispatch<React.SetStateAction<PaxCargoProperties[]>>;

    updatePaxCargoProperty: <K extends keyof PaxCargoProperties>(
        identifier: number,
        key: K,
        value: PaxCargoProperties[K]
    ) => void;
}

const CargoContext = createContext<CargoContextType | undefined>(undefined);

export const CargoProvider = ({ children }: { children: ReactNode }) => {
    const [cargoProperties, setCargoProperties] = useState<CargoProperties | null>(null);
    const [paxCargoProperty, setPaxCargoProperties] = useState<PaxCargoProperties[]>([]);

    const updatePaxCargoProperty = useCallback(<K extends keyof PaxCargoProperties>(
        identifier: number,
        key: K,
        value: PaxCargoProperties[K]
    ) => {
        setPaxCargoProperties(prev =>
            prev.map(c => c.id == identifier ? { ...c, [key]: value } : c)
        );
    }, []);

    const contextValue = useMemo(() => ({
        cargoProperties,
        paxCargoProperty,
        setCargoProperties,
        setPaxCargoProperties,
        updatePaxCargoProperty,
    }), [cargoProperties, paxCargoProperty, setCargoProperties, setPaxCargoProperties, updatePaxCargoProperty]);

    return (
        <CargoContext.Provider value={contextValue}>
            {children}
        </CargoContext.Provider>
    );
};

export const useCargo = () => {
    const context = useContext(CargoContext);
    if (!context) {
        throw new Error('useCargo must be used within a CargoProvider');
    }
    return context;
};