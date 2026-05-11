import Forms from "@/components/forms";
import { usePassengers } from "@/context/passenger";
import { useTrip } from "@/context/trip";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Dimensions, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';



const { height, width } = Dimensions.get('screen');

export default function BookingForm() {
    const { passengers, clearPassengers } = usePassengers();
    const { approvedBy, setTotalFare, setOriginalFare } = useTrip()
    const [saveloading, setSaveLoading] = useState(false);
    const [errorForm, setErrorForm] = useState<(string | number)[]>([]);
    const [year, setYear] = useState('');
    const insets = useSafeAreaInsets();
    

    useEffect(() =>{
        const date = new Date();
        setYear(date.getFullYear().toString().slice(-2));
    }, []);

    const handleClearPasses = () => {
        if(passengers.some(p => p.passType == 'Passes')) {
            clearPassengers()
        }
    }

    const handleSave = useCallback(() => {
        setSaveLoading(true);
        setErrorForm([]);

        setTimeout(() => {
            const hasEmpty = passengers.find((p) =>
                !p.name?.trim() || !p.passType?.trim() || !p.age || !p.gender?.trim() 
            )

            const passesType = passengers.some((p) => p.passType == 'Passes' || p.passTypeCode == 'P');

            const invalidNameFormat = passengers.find((p) => !p?.name?.includes(',') );

            if(passesType && !approvedBy.trim()) {
                Alert.alert('Invalid', 'Approved by is required.');
                setSaveLoading(false);
                return;
            }
            
            
            if(!passesType) {
                if (invalidNameFormat) {
                    setErrorForm([invalidNameFormat.seatNumber ?? '']);
                    Alert.alert('Invalid', `Invalid name format for seat number ${invalidNameFormat.seatNumber}`);
                    setSaveLoading(false);
                    return;
                }

                if (hasEmpty) {
                    setErrorForm([hasEmpty.seatNumber ?? '']);
                    Alert.alert('Invalid', `Seat number ${hasEmpty.seatNumber} still has some required fields missing.`);
                    setSaveLoading(false);
                    return;
                }
    
                const infantFieldError = passengers.find((p) =>
                    p.infant?.find((i) => !i?.name.trim() || !i.gender.trim() || !i.age)
                )
                if (infantFieldError) {
                    setErrorForm(prev => [...prev, infantFieldError!.seatNumber ?? '']);
                    Alert.alert('Invalid', `Seat number ${infantFieldError.seatNumber} has missing infant details.`);
                    setSaveLoading(false);
                    return;
                }
    
                const infantAgeError = passengers.find((p) =>
                    p.infant?.find((i) => i.age > 2)
                )
                if (infantAgeError) {
                    setErrorForm(prev => [...prev, infantAgeError!.seatNumber ?? '']);
                    Alert.alert('Check Infant Age', `Please provide a valid age for the infant in seat ${infantAgeError.seatNumber}.`);
                    setSaveLoading(false);
                    return;
                }
    
                const childAgeError = passengers.filter((p) => p.passType == 'Child' && (p.age! > 18 || p.age! < 3));
                if(childAgeError.length > 0) {
                    setErrorForm(prev => [...prev, ...childAgeError.map(p => p.seatNumber ?? '')]);
                    childAgeError.forEach((child: any) => {
                        Alert.alert(
                            "Invalid Age",
                            `Passenger in seat ${child.seatNumber} is marked as "Child" but age is ${child.age}.`
                        );
                    });
                    setSaveLoading(false);
                    return;
                }
                
                const adultAgeError = passengers.filter((p) => p.passType == 'Adult' && (p.age! < 19 || p.age! > 59));
                if(adultAgeError.length > 0) {
                    setErrorForm(prev => [...prev, ...adultAgeError.map(p => p.seatNumber ?? '')]);
                    adultAgeError.forEach((adult: any) => {
                        Alert.alert(
                            "Invalid Age",
                            `Passenger in seat ${adult.seatNumber} is marked as "Adult" but age is ${adult.age}.`
                        );
                    });
                    setSaveLoading(false);
                    return;
                }
    
                const seniorAgeError = passengers.filter((p) => p.passType == 'Senior' && p.age! < 60);
                if(seniorAgeError.length > 0) {
                    setErrorForm(prev => [...prev, ...seniorAgeError.map(p => p.seatNumber ?? '')]);
                    seniorAgeError.forEach((senior: any) => {
                        Alert.alert(
                            "Invalid Age",
                            `Passenger in seat ${senior.seatNumber} is marked as "Senior" but age is ${senior.age}.`
                        );
                    });
                    setSaveLoading(false);
                    return;
                }
            }

            if (invalidNameFormat) {
                Alert.alert('Invalid', `A passenger has an invalid name format`);
                setSaveLoading(false);
                return;
            }

            
            if(passengers.some((p) => p.hasCargo == true &&
                p.cargo.some(c => c.cargoType == 'Rolling Cargo' && !c.cargoSpecification?.trim()))) {

                Alert.alert('Invalid', 'Description is required.');
                setSaveLoading(false);
                return;
            }

            if(passengers.some((p) => p.hasCargo == true &&
                p.cargo.some(c => c.cargoType == 'Rolling Cargo' && !c.cargoPlateNo?.trim()))) {

                Alert.alert('Invalid', 'Plate number is required.');
                setSaveLoading(false);
                return;
            }

            if(passengers.some((p) => p.hasCargo == true &&
                p.cargo.some(c => c.cargoType == 'Parcel' && !c.parcelCategory?.trim()))) {

                Alert.alert('Invalid', 'Paracel category is required.');
                setSaveLoading(false);
                return;
            }

            const total = passengers.reduce((sum, p) => {
                const passengerFare = Number(p.fare || 0);
                const cargoTotal = (p.cargo ?? []).reduce((cargoSum, c) => {
                    return cargoSum + (Number.isFinite(c.cargoAmount) ? Number(c.cargoAmount) : 0);
                }, 0);
                return sum + passengerFare + cargoTotal;
            }, 0);

            setTotalFare(total);
            setOriginalFare(total)

            router.push('/summary');
            setSaveLoading(false);
        }, 300);
    }, [passengers, setTotalFare, setOriginalFare, approvedBy])


    return (
        <View style={{ height, backgroundColor: '#fdfdfd', paddingBottom: insets.bottom }}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => {handleClearPasses(), router.back()}}>
                    <Ionicons name={'arrow-back'} size={30} color={'#fff'} />
                </TouchableOpacity>
                <Text style={styles.title}>Booking Form</Text>
            </View>

            <View style={styles.body}>
                <KeyboardAvoidingView style={{ flex: 1, paddingBottom: 100 }} behavior={Platform.OS === 'android' ? 'padding' : 'height'}>
                    <ScrollView keyboardShouldPersistTaps="handled" style={{ paddingHorizontal: 10, paddingBottom: 20, marginBottom: 15 }}>
                        <Forms errorForm={errorForm} />
                    </ScrollView>

                    <TouchableOpacity onPress={() => handleSave()} style={{ backgroundColor: '#cf2a3a', width: '95%', alignSelf: 'center', borderRadius: 8, paddingVertical: 15 }}>
                        {saveloading == true ? (
                            <ActivityIndicator size='small' color={'#fff'} />
                        ) : (
                            <Text style={{ fontSize: 16, fontWeight: 'bold', textAlign: 'center', color: '#fff' }}>Proceed to Payment</Text>
                        )}
                    </TouchableOpacity>
                </KeyboardAvoidingView>
            </View>
        </View>
    );
}


const styles = StyleSheet.create({
    header: {
        height: 90,
        backgroundColor: '#cf2a3a',
        paddingTop: 40,
        paddingHorizontal: 20,
        flexDirection: 'row', 
        alignItems: 'center',
        gap: 10
    },
    title: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold'
    },
    body: {
        flex: 1,
    }
})