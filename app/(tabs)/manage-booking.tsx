import { FetchManageBookingList } from "@/api/manageBookingList";
import PreLoader from "@/components/preloader";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import { Alert, FlatList, Modal, RefreshControl, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Calendar } from "react-native-calendars";
import { GestureHandlerRootView } from 'react-native-gesture-handler';

type PaxBookingProps = {
    id: number;
    name: string;
    departureDate: string;
    departureTime: string;
    route: string;
    vessel: string;
    referenceNumber: string;
    bookingStatus?: number;
    bookingId?: number;
    paxType: string;
    station?: string;
}

export const bookingStatuses = [
    { id: 0, label: 'Pending', color: '#ffc107', bgColor: 'rgba(255, 193, 7, 0.15)', icon: 'clock-time-eight' },
    { id: 1, label: 'Confirmed', color: '#19B87E', bgColor: '#19b87e34', icon: 'check-decagram' },
    { id: 2, label: 'Onboard', color: '#19B87E', bgColor: '#19b87e34', icon: 'trending-up' },
    { id: 3, label: 'Completed', color: '#19B87E', bgColor: '#19b87e34', icon: 'sail-boat' },
    { id: 4, label: 'Expired' , color: '#ffc107', bgColor: 'rgba(255, 193, 7, 0.15)', icon: 'alert' },
    { id: 5, label: 'Refunded', color: '#0dcaf0', bgColor: 'rgba(13, 202, 240, 0.15)', icon: 'cash-check' },
    { id: 6, label: 'Cancelled', color: '#dc3545', bgColor: 'rgba(220, 53, 69, 0.15)', icon: 'book-cancel-outline' }
]



const PassengerItem = React.memo(({ paxDatas }: { paxDatas: PaxBookingProps }) => {
    return (
        <TouchableOpacity onPress={() => router.push( `/bookingInfo?bookingId=${paxDatas.bookingId}&paxId=${paxDatas.id}&refNum=${paxDatas.referenceNumber}` )} 
            style={{ minHeight: 90, maxHeight: 100, borderColor: '#dadadaff', elevation: 5, borderWidth: 1, backgroundColor: '#fff', borderRadius: 8, padding: 8, marginBottom: 10 }}>
            <View style={{ borderBottomColor: '#dadadaff', borderBottomWidth: 1, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 5, paddingBottom: 8 }}>
                <Text style={{ fontWeight: 'bold', fontSize: 17, width: '50%', color: '#000' }}>{paxDatas?.name}</Text>
                <View style={{ flexDirection: 'column', alignItems: 'flex-end' }}>
                    <Text style={{ alignSelf: 'flex-end', fontSize: 10, color: '#646464' }}>{paxDatas.departureDate}</Text>
                    <Text style={{ fontSize: 12, color: '#cf2a3a', fontWeight: 'bold' }}>{paxDatas.referenceNumber}</Text>
                </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 10, color: '#646464' }}>{`${paxDatas.vessel}  |  ${paxDatas.route}  |  ${paxDatas.departureTime} | ${paxDatas.station ?? ''}`}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, borderColor: bookingStatuses.find(p => p.id == paxDatas.bookingStatus).color ?? 'transparent', backgroundColor: bookingStatuses.find(s => s.id == paxDatas.bookingStatus).bgColor ?? 'transparent', borderWidth: 1, padding: 3, borderRadius: 5 }}>
                    <MaterialCommunityIcons name={bookingStatuses.find(p => p.id == paxDatas.bookingStatus).icon as any} size={14} color={bookingStatuses.find(p => p.id == paxDatas.bookingStatus).color} />
                    <Text style={{ color: bookingStatuses.find(p => p.id == paxDatas.bookingStatus).color ?? 'transparent', fontSize: 10, fontWeight: '800' }}>{bookingStatuses.find(p => p.id == paxDatas.bookingStatus).label ?? '--'}</Text>
                </View>
            </View>
        </TouchableOpacity>
    )
})


export default function ManageBooking() {
    const [passengers, setPassengers] = useState<PaxBookingProps[] | []>([])
    const [loading, setLoading] = useState(true);
    const [calendarVisible, setCalendarVisible] = useState(false);
    const [date, setDate] = useState('');
    const [formattedDate, setFormattedDate] = useState('');
    const [searchValue, setSearchValue] = useState('');
    
    const PassengerLists = passengers.filter((p: any) => p.paxType != 'Infant');

    useFocusEffect(
        useCallback(() => {
            const today = new Date();
            const options: Intl.DateTimeFormatOptions = {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                timeZone: 'Asia/Manila'
            }
            
            const PHTimezoneToday = today.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' })
    
            setDate(PHTimezoneToday);
            setLoading(true)
            fetchBooking(PHTimezoneToday, null);
            setFormattedDate(today.toLocaleDateString('en-US', options));
            setSearchValue('')
        }, [])
    )

    useFocusEffect(
        useCallback(() => {
            const currentDate = new Date();
            const today = currentDate.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' })
    
            if(today == date && searchValue.length == 0) {
                setLoading(true)
                const requestInterval = setInterval(() => fetchBooking(today, null), 3000);
                return () => clearInterval(requestInterval);
            }
    
        }, [date, searchValue])
    )

    
    const fetchBooking = async (dateString: string, search: string | null) => {
        try {
            const response = await FetchManageBookingList(dateString, search)
            
            if(!response.error) {
                const paxData: PaxBookingProps[] = response.data.map((passenger: any) => ({
                    id: passenger.id,
                    name: `${passenger.first_name} ${passenger.last_name}`,
                    departureDate: new Date(passenger.bookings.find((c: any) => c.trip_schedule).trip_schedule.specific_days).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    }),
                    departureTime: new Date(`1970-01-01T${passenger.bookings.find((t: any) => 
                        t.trip_schedule)?.trip_schedule.trip.departure_time}`).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                    }),
                    route: passenger.bookings.find((t: any) => t.trip_schedule)?.trip_schedule.trip.route.mobile_code,
                    vessel: passenger.bookings.find((t: any) => t.trip_schedule)?.trip_schedule.trip.vessel?.code,
                    referenceNumber: passenger.bookings.find((r: any) => r.reference_no).reference_no,
                    bookingStatus: passenger.bookings.find((s: any) => s.status_id)?.status_id ?? 0,
                    bookingId: passenger.bookings.find((booking: any) => booking.id)?.id,
                    paxType: passenger.passenger_type?.name,
                    station: passenger.bookings.find((s: any) => s.station)?.station.name,
                }))
                setPassengers(paxData)
            }
        }catch (error: any) {
            Alert.alert('Error', error.message || 'Network Error')
        }finally {
            setTimeout(() => {
                setLoading(false);
            }, 500);
        }
    }

    const handleDateSelect = (date: string) => {
        const selectedDate = new Date(date);
        const options: Intl.DateTimeFormatOptions = {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            timeZone: 'Asia/Manila'
        }

        setFormattedDate(selectedDate.toLocaleDateString('en-US', options))
        fetchBooking(selectedDate.toISOString().split('T')[0], null),
        setLoading(true);
    }

    const handleFilter = (search: string) => {
        if (searchValue.length == 0) return;
        setTimeout(() => {
            fetchBooking(date, search);
        }, 400);
    }

    const handleRefresh = () => {
        const today = new Date();
        const options: Intl.DateTimeFormatOptions = {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            timeZone: 'Asia/Manila'
        }

        const PHTimezone = today.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' })

        setLoading(true)
        fetchBooking(PHTimezone, null)
        setDate(PHTimezone),
        setFormattedDate(today.toLocaleDateString('en-US', options))
    }

    return (
        <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#fdfdfd' }}>
            {calendarVisible && (
                <Modal transparent animationType="slide" onRequestClose={() => setCalendarVisible(false)} >
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
                        <View style={{ width: '80%', backgroundColor: '#fff', padding: 20, borderRadius: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4 }}>
                            <Text style={{ fontSize: 18, fontWeight: 'bold' }}>Select Date</Text>
                            <Calendar
                            onDayPress={(day) => {
                                setDate(day.dateString),
                                setCalendarVisible(false),
                                handleDateSelect(day.dateString)
                            }}
                            markedDates={{ [date]: {selected: true, selectedColor: '#CF2A3A'} }} 
                            />
                            <TouchableOpacity onPress={() => setCalendarVisible(false)} style={{ marginTop: 20, padding: 10, backgroundColor: '#CF2A3A', borderRadius: 5 }}>
                                <Text style={{ color: '#fff', textAlign: 'center' }}>Close Calendar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>
            )}

            <View style={{ paddingTop: 50, height: 150, backgroundColor: '#cf2a3a', paddingHorizontal: 20, gap: 15 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={{ color: '#fff', fontSize: 20, fontWeight: 'bold' }}>Manage Bookings</Text>
                    <TouchableOpacity onPress={() => setCalendarVisible(true)}>
                        <Ionicons name="calendar" size={25} color={'#fff'} />
                    </TouchableOpacity>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={{ position: 'relative', borderColor: '#cfcfcf73', backgroundColor: '#d4abab73', borderWidth: 1, borderRadius: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10 }}>
                        <TextInput onChangeText={(text) => {handleFilter(text), setSearchValue(text)}} value={searchValue} placeholder='Search' placeholderTextColor='#fff' style={{ fontSize: 15, fontWeight: '600', width: '90%', color: '#fff' }} />
                        <TouchableOpacity disabled={searchValue.length == 0} onPress={() => {setSearchValue(''), fetchBooking(date, null)}} style={{ borderLeftWidth: 1, borderLeftColor: '#cfcfcfd0', paddingLeft: 10 }}>
                            {searchValue.length > 0 ? (
                                <Ionicons name={'close'} size={20} color={'#fff'} />
                            ) : (
                                <Ionicons name={'search'} size={20} color={'#fff'} />
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            <View style={{ justifyContent: 'center', paddingTop: 20, paddingHorizontal: 20, flex: 1 }}>
                {loading == true ? (
                    <PreLoader loading={loading} />
                ) : (
                    <>
                        {passengers.length > 0 ? (
                            <>
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                                    <Text style={{ fontWeight: 'bold', fontSize: 18, color: '#000' }}>Bookings</Text>
                                    <Text style={{ fontSize: 15, fontWeight: 'bold', color: '#000' }}>{formattedDate}</Text>
                                </View>
                                <FlatList data={[...PassengerLists].reverse()} keyExtractor={(passengers) => String(passengers.id)} showsVerticalScrollIndicator={false}
                                    refreshControl={<RefreshControl refreshing={loading} onRefresh={() => handleRefresh()} colors={['#cf2a3a']} />}
                                    renderItem={({ item: passengerDatas }) => <PassengerItem paxDatas={passengerDatas}/>}
                                    getItemLayout={(passengerDatas, index) => ({
                                        length: 90,
                                        offset: 90 * index,
                                        index
                                    })}
                                />
                            </>
                        ) : (
                            <>
                                <Text style={{ textAlign: 'center', color: '#7A7A85', top: -50 }}>No bookings found</Text>
                            </>
                        )}
                    </>
                )}
            </View>
        </GestureHandlerRootView>
    )
}