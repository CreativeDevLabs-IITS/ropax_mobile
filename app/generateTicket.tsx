import PreLoader from '@/components/preloader';
import { useBleManager } from '@/context/BLEManager';
import { useCargo } from '@/context/cargoProps';
import { usePassengers } from '@/context/passenger';
import { useTrip } from '@/context/trip';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Dimensions, Image, Modal, PermissionsAndroid, Platform, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Device } from 'react-native-ble-plx';
import QRCode from 'react-native-qrcode-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';


const logo_text = require('@/assets/images/logo.png');
const logo_icon = require('@/assets/images/logo_icon.png');
const { height, width } = Dimensions.get('window');

export default function TicketGenerator() {
    const { vessel, mobileCode, origin, destination, cashTendered, fareChange, totalFare, note, departure_date, departure_time, refNumber, forReprint, clearTrip } = useTrip();
    const { paxCargoProperty, setPaxCargoProperties } = useCargo();
    const { passengers, clearPassengers } = usePassengers();
    const {connectedDevice, connectedDeviceId, bleManager, setConnectedDevice, setConnectedDeviceId} = useBleManager();
    const [tripDate, setTripDate] = useState('');
    const [time, setTime] = useState('');
    const [loading, setLoading] = useState(false);
    const insets = useSafeAreaInsets();

    const scanTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isMountedRef = useRef(true);
    
    const [bleDevices, setBleDevices] = useState<Device[]>([]);
    const [bleModalVisible, setBleModalVisible] = useState(false);
    const [scanning, setScanning] = useState(false);
    const [bleLoading, setBleLoading] = useState(false);
    const [showDisconnect, setShowDisconnect] = useState(false);


    const totalpax = useMemo(() => {
        return passengers.filter(p => 
            p.passType.toLowerCase() != 'infant' && p.passType.toLowerCase() != 'passes'
        );
    }, [passengers]);

    const handleDisconnect = useCallback(() => {
        setConnectedDevice(null);
        setConnectedDeviceId(null);
        setShowDisconnect(false);
    }, [connectedDevice, showDisconnect])

    useEffect(() => {
        isMountedRef.current = true;

        return () => {
            isMountedRef.current = false;
            if (scanTimeoutRef.current) {
                clearTimeout(scanTimeoutRef.current);
                scanTimeoutRef.current = null;
            }

            bleManager?.stopDeviceScan();
        }
    }, []);

    useEffect(() => {
        if (!departure_date || typeof departure_date !== 'string' || departure_date.trim() === '') return;

        const [year, month, day] = departure_date.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        setTripDate(date.toLocaleDateString('en-US', { 
            month: '2-digit', 
            day: '2-digit', 
            year: 'numeric' 
        }));

        if (!departure_time) return;

        let [hour, minute] = departure_time.split(':').map(Number);
        const suffix = hour >= 12 ? 'PM' : 'AM';
        hour = hour % 12 || 12;
        setTime(`${hour}:${minute.toString().padStart(2, '0')} ${suffix}`);
    }, [departure_date, departure_time]);

    useEffect(() => {
        const reConnect = async () => {
            if(!connectedDeviceId || connectedDevice) return;

            try {
                connectToADevice(connectedDeviceId)
            }catch {
                setConnectedDevice(null);
            }finally {
                setBleLoading(false);
            }
        }

        reConnect();
    }, [connectedDeviceId]);

    useEffect(() => {
        return () => {
            if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);
            bleManager?.stopDeviceScan();
        };
    }, []);

    const requestBlePermissions = async (): Promise<boolean> => {
        if (Platform.OS === 'android') {
            const granted = await PermissionsAndroid.requestMultiple([
                PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
                PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
                PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            ]);

            return Object.values(granted).every(
                status => status === PermissionsAndroid.RESULTS.GRANTED
            );
        }
        return true;
    };

    const startScan = async () => {
        const hasPermission = await requestBlePermissions();
        if (!hasPermission) {
            Alert.alert('Permission denied', 'Bluetooth permissions are required to print.');
            return;
        }

        setBleDevices([]);
        setScanning(true);
        setBleModalVisible(true);

        bleManager.startDeviceScan(null, null, (error, device) => {
            if (error) {
                setScanning(false);
                return;
            }

            if (device && device.name) {
                setBleDevices(prev => {
                    const exists = prev.some(d => d.id === device.id);
                    return exists ? prev : [...prev, device];
                });
            }
        });

        scanTimeoutRef.current = setTimeout(() => {
          bleManager.stopDeviceScan();
          setScanning(false);  
        }, 10000);
    };

    const connectToADevice = async (deviceId: string) => {
        try {
            setBleLoading(true);
            bleManager.stopDeviceScan();

            const connected = await bleManager.connectToDevice(deviceId);
            await connected.discoverAllServicesAndCharacteristics();

            setConnectedDevice(connected);
            setConnectedDeviceId(deviceId)
            setBleModalVisible(false);
            Alert.alert('Connected', `Connected to a device`);
        } catch (error: any) {
            Alert.alert('Connection failed', error.message);
        } finally {
            setBleLoading(false);
        }
    };

    const buildPrintBytes = useCallback((asCopy: boolean): Uint8Array => {
        const ESC = 0x1B;
        const GS  = 0x1D;
        const LF  = 0x0A;

        const bytes: number[] = [];
        const push = (...b: number[]) => bytes.push(...b);

        const pushStr = (str: string) => {
            for (let i = 0; i < str?.length; i++) {
                bytes.push(str.charCodeAt(i) & 0xFF);
            }
        };

        const padLeft = (text, width) => {
            const str = text == null ? '' : String(text);
            return str.length >= width
                ? str  // ← don't truncate, just return as-is
                : ' '.repeat(width - str.length) + str;
        };

        const padRight = (text, width) => {
            const str = text == null ? '' : String(text);
            return str.length >= width
                ? str  // ← same here
                : str + ' '.repeat(width - str.length);
        };


        const println = (str: string) => { pushStr(str); push(LF); };

        const alignCenter = () => push(ESC, 0x61, 0x01);
        const alignLeft   = () => push(ESC, 0x61, 0x00);

        const boldOn  = () => push(ESC, 0x45, 0x01);
        const boldOff = () => push(ESC, 0x45, 0x00);

        const fontNormal = () => push(GS, 0x21, 0x00);
        const fontTall = () => push(GS, 0x21, 0x01);

        let vesselTextPad = 0;

        if(vessel.length > 11) {
            vesselTextPad = 6;
        }else {
            vesselTextPad = 14;
        }


        push(ESC, 0x40);

        alignCenter();
        boldOn();
        println('LEOPARDS');
        println('MOTORBOAT SERVICE');
        push(LF)
        boldOff();

        if(asCopy == false) {
            println('TICKET - NOT AN OFFICIAL RECEIPT');
        }else {
            boldOn();
            println('TICKET - STATION COPY');
            boldOff();
        }
        println('--------------------------------');

        boldOn();
        fontTall();
        const routeFrom = mobileCode.split('-')[0] ?? '';
        const routeTo   = mobileCode.split('-')[1] ?? '';
        println(`${routeFrom}  >  ${routeTo}`);

        boldOff();
        fontNormal();
        println(`${origin}      ${destination}`);
        push(LF)

        alignLeft();

        println(
            padRight('Vessel:', 14) +
            padLeft(`${vessel}`, vesselTextPad)
        )
        println(
            padRight('Trip Date:', 16) +
            padLeft(`${tripDate}`, 16)
        )
        println(
            padRight('Depart Time:', 16) +
            padLeft(`${time}`, 16)
        )
        println('--------------------------------');

        if (refNumber && asCopy == false) {
            alignCenter();
            boldOn();
            println(`${refNumber}`)
            boldOff();

            const qrData = refNumber;
            const qrLen = qrData?.length + 3;
            const pL = qrLen % 256;
            const pH = Math.floor(qrLen / 256);

            push(GS, 0x28, 0x6B, pL, pH, 0x31, 0x50, 0x30);
            pushStr(qrData);
            push(GS, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x45, 0x31);
            push(GS, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x43, 0x07);
            push(GS, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x51, 0x30);

            push(LF);

            println('--------------------------------');
        }

        
        alignLeft();
        if (passengers?.length > 0) {
            const bClass = passengers.filter(p =>
                p?.accommodation == 'Business Class' ||
                p?.accommodation == 'B-Class' ||
                p?.accommodation == 'B Class' ||
                p?.accommodation == 'Deluxe' ||
                p?.accommodation == 'Deluxe Class'
            );
            if (bClass?.length > 0) {
                boldOn(); println('B-Class:'); boldOff();

                bClass.forEach(p => {
                    const nameParts = p.name?.split(',') ?? [];
                    const lastName  = nameParts[0]?.trim() ?? '';
                    const firstInit = nameParts[1]?.trim() ?? '';
                    const fullFirst = firstInit ? `${firstInit} ` : '';
                    println(`Name: ${fullFirst}${lastName}`);
                    println(
                        padRight(`Type: ${p.passTypeCode}`, 11) +
                        padRight(`Seat#: ${p.seatNumber || 'N/A'}`, 12) +
                        padLeft(`P${Number(p.fare).toFixed(2)}`, 9)
                    );
                    push(LF);
                });
            }

            const tourist = passengers.filter(p => p?.accommodation == 'Tourist');
            if (tourist?.length > 0) {
                boldOn(); println('Tourist:'); boldOff();

                tourist.forEach(p => {
                    const nameParts = p.name?.split(',') ?? [];
                    const lastName  = nameParts[0]?.trim() ?? '';
                    const firstInit = nameParts[1]?.trim() ?? '';
                    const fullFirst = firstInit ? `${firstInit} ` : '';
                    println(`Name: ${fullFirst}${lastName}`);
                    println(
                        padRight(`Type: ${p.passTypeCode}`, 11) +
                        padRight(`Seat#: ${p.seatNumber || 'N/A'}`, 12) +
                        padLeft(`P${Number(p.fare).toFixed(2)}`, 9)
                    );
                    push(LF);
                });
            }

            const passes = passengers.filter(p => p?.accommodation == null);
            if (passes?.length > 0) {
                boldOn(); println('Passes:'); boldOff();

                passes.forEach(p => {
                    const nameParts = p.name?.split(',') ?? [];
                    const lastName  = nameParts[0]?.trim() ?? '';
                    const firstInit = nameParts[1]?.trim() ?? '';
                    const fullFirst = firstInit ? `${firstInit} ` : '';
                    println(`Name: ${fullFirst}${lastName}`);
                    println(
                        padRight(`Type: ${p.passTypeCode}`, 11) +
                        padRight(`Seat#: N/A`, 12) +
                        padLeft(`P${Number(p.fare).toFixed(2)}`, 9)
                    );
                    push(LF);
                });
            }

            const hasInfants = passengers.some(p => p.hasInfant && p.infant?.length > 0);
            if (hasInfants) {
                boldOn(); println('Infants:'); boldOff();

                passengers.forEach(p => {
                    p.hasInfant && p.infant?.forEach(i => {
                        const nameParts = i.name?.split(',') ?? [];
                        const lastName  = nameParts[0]?.trim() ?? '';
                        const firstInit = nameParts[1]?.trim() ?? '';
                        const fullFirst = firstInit ? `${firstInit} ` : '';
                        println(`Name: ${fullFirst}${lastName}`);
                        println(
                            padRight(`Type: I`, 11) +
                            padRight(`Seat#: N/A`, 12) +
                            padLeft(`P0.00`, 9)
                        );
                        push(LF);
                    });
                });
            }

            println('--------------------------------');
        }

        if(passengers.some(p => p.address != '')) {
            const paxAddress = passengers?.filter(p => p?.address != null);

            println(
                padRight('Address:', 10) +
                padLeft(paxAddress[0]?.address, 8)
            )
            println('--------------------------------');
        }

        boldOn();
        println(
            padRight('TOTAL PAYING PAX:', 16) +
            padLeft(`${totalpax.length}`, 16)
        )
        boldOff();
        
        println('--------------------------------');

        const cargos = passengers.flatMap(p => p?.hasCargo ? p?.cargo : []);
        if (cargos?.length > 0) {
            boldOn(); println('CARGO:'); boldOff();
            cargos.forEach(c => {
                const desc = c.cargoType === 'Rolling Cargo'
                    ? ` ${c.cargoSpecification}CC`
                    : c.parcelCategory;
                println(`${c.quantity}x ${desc} - P${Number(c.cargoAmount).toFixed(2)}`);
            });
            println('--------------------------------');
        }

        println(
            padRight('Total:', 16) +
            padLeft(`P${Number(totalFare).toFixed(2)}`, 16)
        )
        println(
            padRight('Tendered:', 16) +
            padLeft(`P${Number(cashTendered).toFixed(2)}`, 16)
        )
        println(
            padRight('Change:', 16) +
            padLeft(`P${Number(fareChange).toFixed(2)}`, 16)
        )

        println('--------------------------------');

        if (note) {
            alignCenter();
            println(note);
            println('--------------------------------');
        }

        if(asCopy == false) {
            alignLeft();
            println('TERMS AND CONDITIONS');
            println('- Boarding closes 30 mins before');
            println('  departure.');
            println('- Present valid ID w/ matching');
            println('  name.');
            println('- Service fee is non-refundable.');
            println('- Pre-Departure Refund: 10%');
            println('  charge.');
            println('- Post-Departure Refund: 20%');
            println('  charge.');
            println('- REFUND VALID WITHIN 7 DAYS');
            println('  OF DEPARTURE ONLY.');
    
            fontNormal();
        }
        push(LF, LF, LF, LF, LF, LF);
        push(GS, 0x56, 0x41, 0x00);

        return new Uint8Array(bytes);
    }, [vessel, mobileCode, origin, destination, tripDate, time, 
    refNumber, passengers, totalFare, cashTendered, fareChange, note]);

    const printViaBluetooth = async (asCopy: boolean) => {
        if (!connectedDevice) {
            Alert.alert('No printer connected', 'Please connect to a Bluetooth printer first.');
            startScan();
            return;
        }

        try {
            setBleLoading(true);

            const services = await connectedDevice.services();
            let printCharacteristic = null;

            for (const service of services) {
                const characteristics = await service.characteristics();
                for (const char of characteristics) {
                    if (char.isWritableWithResponse || char.isWritableWithoutResponse) {
                        printCharacteristic = char;
                        break;
                    }
                }
                if (printCharacteristic) break;
            }

            if (!printCharacteristic) {
                Alert.alert('Error', 'No writable characteristic found on this printer.');
                return;
            }   

            const printData = buildPrintBytes(asCopy);

            const toBase64 = (chunk: Uint8Array): string => {
                let binary = '';
                chunk.forEach(b => binary += String.fromCharCode(b));
                return btoa(binary);
            };

            const chunkSize = 200;
            for (let i = 0; i < printData.length; i += chunkSize) {
            const chunk = printData.slice(i, i + chunkSize);
            const base64Chunk = toBase64(chunk);

                if (printCharacteristic.isWritableWithResponse) {
                    await printCharacteristic.writeWithResponse(base64Chunk);
                } else {
                    await printCharacteristic.writeWithoutResponse(base64Chunk);
                }

                await new Promise(resolve => setTimeout(resolve, 50));
            }
        } catch (error: any) {
            Alert.alert('Print failed', error.message);
        } finally {
            setBleLoading(false);
        }
    };

    const clearAll = useCallback(() => {
        if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);
        setLoading(true);
        clearPassengers();
        setPaxCargoProperties([]);

        scanTimeoutRef.current = setTimeout(() => {
            if(forReprint == true) {
                clearTrip();
                if (!isMountedRef.current) return;
                setLoading(false);
                router.replace('/(tabs)/manual-booking');
            }else {
                if (!isMountedRef.current) return;
                setLoading(false);
                router.replace('/seatPlan');
            }
        }, 400);

    }, [clearTrip, clearPassengers, setPaxCargoProperties])
    

    return (
        <View style={{ flexDirection: 'column', justifyContent: 'space-between', backgroundColor: '#f1f1f1', position: 'relative', flex: 1, paddingBottom: insets.bottom }}>
            <PreLoader loading={loading || bleLoading} />
            <Modal transparent animationType="slide" visible={bleModalVisible}>
                <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: height * 0.6 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#000' }}>Select Printer</Text>
                            <TouchableOpacity onPress={() => { bleManager?.stopDeviceScan(); setBleModalVisible(false); }}>
                                <Ionicons name="close" size={24} color="#cf2a3a" />
                            </TouchableOpacity>
                        </View>
                        {scanning && (
                            <Text style={{ color: '#cf2a3a', textAlign: 'center', marginBottom: 10 }}>Scanning for devices...</Text>
                        )}
                        <ScrollView>
                            {bleDevices.length === 0 && !scanning ? (
                                <Text style={{ color: '#999', textAlign: 'center', marginTop: 20 }}>No devices found. Try scanning again.</Text>
                            ) : (
                                bleDevices.map((device) => (
                                    <TouchableOpacity
                                        key={device?.id}
                                        onPress={() => connectToADevice(device.id)}
                                        style={{ padding: 15, borderBottomColor: '#dadada', borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                        <Ionicons name="print" size={20} color="#cf2a3a" />
                                        <View>
                                            <Text style={{ fontWeight: 'bold' }}>{device.name}</Text>
                                            <Text style={{ fontSize: 12, color: '#999' }}>{device?.id}</Text>
                                        </View>
                                    </TouchableOpacity>
                                ))
                            )}
                        </ScrollView>
                        <TouchableOpacity
                            onPress={startScan}
                            style={{ backgroundColor: '#cf2a3a', padding: 12, borderRadius: 8, marginTop: 15 }}>
                            <Text style={{ color: '#fff', textAlign: 'center', fontWeight: 'bold', fontSize: 17 }}>
                                {scanning ? 'Scanning...' : 'Scan Again'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
            
            {showDisconnect == true && (
                <View style={{ backgroundColor: '#fff', width: 180, height: 50, padding: 10, justifyContent: 'center', borderRadius: 8, elevation: 5, position: 'absolute', zIndex: 50, right: 20, top: 70 }}>
                    <TouchableOpacity onPress={() => handleDisconnect()} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                        <MaterialCommunityIcons name={'printer-off-outline'} color={'#000'} size={18} />
                        <Text style={{ color: '#000' }}>Disconnect Printer</Text>
                    </TouchableOpacity>
                </View>
            )}

            <View>
                <View style={{ height: 160, backgroundColor: '#cf2a3a', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 45, paddingHorizontal: 20}}>
                    <Text style={{ fontSize: 20, color: '#fff', fontWeight: 'bold' }}>Generate Ticket</Text>
                    
                    {connectedDevice && (
                        <TouchableOpacity onPress={() => setShowDisconnect(!showDisconnect)} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                            <Text style={{ color: '#fff' }}>{connectedDevice?.name}</Text>
                            <Ionicons name={'chevron-down'} color={'#fff'} size={22} />
                        </TouchableOpacity>
                    )}
                </View>

                <View style={{ position: 'relative', height: '75%', top: -70 }}>
                    <ScrollView style={{ flex: 1 }}>
                        <View style={{ backgroundColor: '#fff', alignSelf: 'center', width: '90%', borderRadius: 10, padding: 10 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5, borderBottomWidth: 1, borderBlockColor: '#9B9B9B' }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                                    <Image source={logo_icon} style={{ width: 38, height: 37 }} />
                                    <Image source={logo_text} style={{ width: 105, height: 25 }} />
                                </View>
                                <View style={{ flexDirection: 'column', alignItems: 'flex-end' }}>
                                    <Text style={{ color: '#cf2a3a', fontSize: 17, fontWeight: '900' }}>TICKET</Text>
                                    <Text style={{ fontSize: 8, marginTop: -3, fontWeight: 'bold',color: '#000' }}>This is NOT an official receipt.</Text>
                                </View>
                            </View>
                            <View style={{ borderBottomWidth: 1, borderBlockColor: '#9B9B9B', paddingVertical: 5, gap: 5 }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 10 }}>
                                    <View style={{ flexDirection: 'column', alignItems: 'center' }}>
                                        <Text style={{ fontSize: 30, fontWeight: '900', color: '#cf2a3a' }}>{`${mobileCode.split('-')[0]}`}</Text>
                                        <Text style={{ fontSize: 10, color: '#cf2a3a', marginTop: -5 }}>{origin}</Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Text style={{ color: '#cf2a3a' }}>---</Text>
                                        <MaterialCommunityIcons name='sail-boat' size={25} color={'#cf2a3a'}  />
                                    </View>
                                    <View style={{ flexDirection: 'column', alignItems: 'center' }}>
                                        <Text style={{ fontSize: 30, fontWeight: '900', color: '#cf2a3a' }}>{`${mobileCode.split('-')[1]}`}</Text>
                                        <Text style={{ fontSize: 10, color: '#cf2a3a', marginTop: -5 }}>{destination}</Text>
                                    </View>
                                </View>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Text style={{ fontSize: 13, color: '#000' }}>Vessel:</Text>
                                    <Text style={{ fontSize: 13, color: '#000' }}>{vessel}</Text>
                                </View>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Text style={{ fontSize: 13, color: '#000' }}>Trip Date:</Text>
                                    <Text style={{ fontSize: 13, color: '#000' }}>{tripDate}</Text>
                                </View>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Text style={{ fontSize: 13, color: '#000' }}>Depart Time:</Text>
                                    <Text style={{ fontSize: 13, color: '#000' }}>{time}</Text>
                                </View>
                            </View>
                            {passengers.length> 0 ? (
                                <>
                                    <View style={{ borderBottomWidth: 1, paddingBottom: 8, borderBottomColor: '#9B9B9B' }}>
                                        <View style={{ flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBlockColor: '#9B9B9B' }}>
                                            <Text style={{ fontWeight: '900', fontSize: 14, color: '#cf2a3a' }}>{refNumber}</Text>
                                            {refNumber && (
                                                <QRCode value={refNumber} size={120} backgroundColor='#fff' color='#000' />
                                            )}
                                        </View>
                                    
                                        <View style={{ paddingVertical: 5 }}>
                                            {passengers.some((p) => p?.accommodation == 'Business Class' || p?.accommodation == 'B-Class' || p?.accommodation == 'B Class' || p?.accommodation == 'Deluxe') && (
                                                <View style={{ marginTop: 5}}>
                                                    <Text style={{ fontSize: 14, fontWeight: '900', marginBottom: 5,color: '#000' }}>{passengers[0].accommodation}</Text>
                                                    {passengers.filter((p) => p?.accommodation == 'Business Class' || p?.accommodation == 'B-Class' || p?.accommodation == 'B Class' || p?.accommodation == 'Deluxe')
                                                    .map((p) => (
                                                        <View key={p.seatNumber} style={{ flexDirection: 'column', marginBottom: 15 }}>
                                                            <Text style={{ fontSize: 13, width: '40%', color: '#000' }}>{`Name: ${p.name?.split(',')[1]?.trim()} ${p.name?.split(',')[0]}`}</Text>
                                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                <Text style={{ fontSize: 13, width: 60, textAlign: 'center', color: '#000' }}>{`Type: ${p.passTypeCode}`}</Text>
                                                                <Text style={{ fontSize: 13, width: 60, textAlign: 'left', color: '#000' }}>{`Seat#: ${p.seatNumber}`}</Text>
                                                                <Text style={{ fontSize: 13, width: 100, textAlign: 'right', color: '#000' }}>Fare: ₱ {p?.fare?.toLocaleString('en-PH', { minimumFractionDigits: 2,  maximumFractionDigits: 2})}</Text>
                                                            </View>
                                                        </View>
                                                    ))}
                                                </View>
                                            )}
                                            {passengers.some((p) => p?.accommodation == 'Tourist' || p?.accommodation == 'Economy') && (
                                                <>
                                                    <Text style={{ fontSize: 14, fontWeight: '900', marginBottom: 5, color: '#000' }}>{passengers[0].accommodation}</Text>
                                                    {passengers.filter((p) => p?.accommodation == 'Tourist' || p?.accommodation == 'Economy')
                                                    .map((p) => (
                                                        <View key={p.seatNumber} style={{ flexDirection: 'column', marginBottom: 15 }}>
                                                            <Text style={{ fontSize: 13, width: '40%', color: '#000' }}>{`Name: ${p.name?.split(',')[1]?.trim()} ${p.name?.split(',')[0]}`}</Text>
                                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                <Text style={{ fontSize: 13, width: 60, textAlign: 'center', color: '#000' }}>{`Type: ${p.passTypeCode}`}</Text>
                                                                <Text style={{ fontSize: 13, width: 60, textAlign: 'left', color: '#000' }}>{`Seat#: ${p.seatNumber}`}</Text>
                                                                <Text style={{ fontSize: 13, width: 100, textAlign: 'right', color: '#000' }}>Fare: ₱ {p?.fare?.toLocaleString('en-PH', { minimumFractionDigits: 2,  maximumFractionDigits: 2})}</Text>
                                                            </View>
                                                        </View>
                                                    ))}
                                                </>
                                            )}
                                            {passengers.some((p) => p?.accommodation == null) && (
                                                <>
                                                    <Text style={{ fontSize: 14, fontWeight: '900', marginTop: 5, marginBottom: 5, color: '#000' }}>Passes</Text>
                                                    {passengers.filter((p) => p.passType == 'Passes')
                                                    .map((p, index) => (
                                                        <View key={index} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                                            <Text style={{ fontSize: 13, width: '40%' }}>{`Name: ${p.name?.split(',')[1]?.trim()} ${p.name?.split(',')[0]}`}</Text>
                                                            <Text style={{ fontSize: 13, width: 50, textAlign: 'left', color: '#000' }}>{p.passTypeCode}</Text>
                                                            <Text style={{ fontSize: 13, width: 50, textAlign: 'left', color: '#000' }}>{`Seat#: ${'N/A'}`}</Text>
                                                            <Text style={{ fontSize: 13, width: 70, textAlign: 'right', color: '#000' }}>Fare: ₱ {p?.fare?.toLocaleString('en-PH', { minimumFractionDigits: 2,  maximumFractionDigits: 2})}</Text>
                                                        </View>
                                                    ))}
                                                </>
                                            )}
                                            {passengers.map((p, passIndex) => 
                                                p.hasInfant && p.infant?.map((i, index) => (
                                                    <View key={`${passIndex}-${index}`} style={{ marginBottom: 3 }}>
                                                        <View style={{ flexDirection: 'column' }}>
                                                            <Text style={{ fontSize: 13, width: '40%', color: '#000' }}>{`Name: ${i.name?.split(',')[1]?.trim()} ${i.name?.split(',')[0]}`}</Text>
                                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                <Text style={{ fontSize: 13, width: 60, textAlign: 'center', color: '#000' }}>Type: I</Text>
                                                                <Text style={{ fontSize: 13, width: 80, textAlign: 'center', color: '#000' }}>Seat#: N/A</Text>
                                                                <Text style={{ fontSize: 13, width: 100, textAlign: 'right', color: '#000' }}>Fare: ₱ 00.00</Text>
                                                            </View>
                                                        </View>
                                                    </View>
                                                ))
                                            )}
                                        </View>
                                    </View>
                                    {passengers.some(p => p.hasCargo) && (
                                        <View style={{ borderBottomColor: '#9B9B9B', borderBottomWidth: 1, paddingVertical: 10 }}>
                                            <View style={{ width: '100%', flexDirection: 'column' }}>
                                                <Text style={{ fontSize: 14, fontWeight: '900', flexDirection: 'column', color: '#000' }}>Cargo</Text>
                                                {passengers.flatMap(p => p.hasCargo ? 
                                                    p.cargo.map(c => (
                                                        <View key={`${c?.id}-${c.cargoBrand}`} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                                            <View style={{ flexDirection: 'row', gap: 3 }}>
                                                                <Text style={{ fontSize: 13, color: '#4b4b4bff' }}>{`${c.quantity}x`}</Text>
                                                                <Text style={{ fontSize: 13, color: '#4b4b4bff' }}>
                                                                    { c.cargoType == 'Rolling Cargo' ? `${c.cargoSpecification}` : c.parcelCategory}
                                                                </Text>
                                                                <Text style={{ fontSize: 13, color: '#4b4b4bff' }}>{`(${c.cargoType})`}</Text>
                                                            </View>
                                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                                                                <Text style={{ fontSize: 13, color: '#000' }}>₱ </Text>
                                                                <Text style={{ fontSize: 13, color: '#000' }}>{c?.cargoAmount?.toLocaleString('en-PH', { minimumFractionDigits: 2,  maximumFractionDigits: 2})}</Text>
                                                            </View>
                                                        </View>
                                                    )) : []
                                                )}
                                            </View>
                                        </View>
                                    )}
                                </>
                            ) : (
                                <View style={{ borderBottomColor: '#9B9B9B', borderBottomWidth: 1, paddingVertical: 10 }}>
                                    <View style={{ width: '100%', flexDirection: 'column' }}>
                                        <Text style={{ fontSize: 14, fontWeight: '900', flexDirection: 'column', color: '#000' }}>Cargo</Text>
                                        {paxCargoProperty.map((cargo: any) => (
                                            <View key={`${cargo?.id}-${cargo.cargoBrand}`} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginLeft: 15, }}>
                                                <View style={{ flexDirection: 'row', gap: 3 }}>
                                                    <Text style={{ fontSize: 12, color: '#4b4b4bff' }}>{`${cargo.quantity}x`}</Text>
                                                    <Text style={{ fontSize: 12, color: '#4b4b4bff' }}>
                                                        { cargo.cargoType == 'Rolling Cargo' ? `${cargo.cargoSpecification}CC` : cargo.parcelCategory}
                                                    </Text>
                                                    <Text style={{ fontSize: 12, color: '#4b4b4bff' }}>{`(${cargo.cargoType})`}</Text>
                                                </View>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                                                    <Text style={{ fontSize: 12, color: '#4b4b4bff' }}>₱ </Text>
                                                    <Text style={{ fontSize: 12, color: '#4b4b4bff' }}>{cargo?.cargoAmount?.toLocaleString('en-PH', { minimumFractionDigits: 2,  maximumFractionDigits: 2})}</Text>
                                                </View>
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            )}
                            <View style={{ borderBottomColor: note ? '#9B9B9B' : 'transparent', borderBottomWidth: note ? 1 : 0, paddingVertical: 10 }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Text style={{ fontSize: 14, color: '#000', fontWeight: '900' }}>Total Amount:</Text>
                                    <Text style={{ fontSize: 14, fontWeight: '900', color: '#cf2a3a' }}>₱ {totalFare?.toLocaleString('en-PH', { minimumFractionDigits: 2,  maximumFractionDigits: 2 })}</Text>
                                </View>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Text style={{ fontSize: 13, color: '#000' }}>Cash Tendered:</Text>
                                    <Text style={{ fontSize: 13, color: '#000' }}>₱ {cashTendered?.toLocaleString('en-PH', { minimumFractionDigits: 2,  maximumFractionDigits: 2 })}</Text>
                                </View>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Text style={{ fontSize: 13, color: '#000' }}>Change:</Text>
                                    <Text style={{ fontSize: 13, color: '#000' }}>₱ {fareChange?.toLocaleString('en-PH', { minimumFractionDigits: 2,  maximumFractionDigits: 2 })?? '0.00'}</Text>
                                </View>
                            </View>
                            {note &&(
                                <View style={{ paddingVertical: 10, borderColor: '#9B9B9B', borderWidth: 1, marginTop: 5 }}>
                                    <Text style={{ textAlign: 'center', color: '#000' }}>{note}</Text>
                                </View>
                            )}
                        </View>
                    </ScrollView>
                </View>
            </View>

            <View style={{ width: '90%', alignSelf: 'center', gap: 10, zIndex: 5, top: -90 }}>
                <TouchableOpacity
                    onPress={() =>printViaBluetooth(false)}
                    disabled={bleLoading}
                    style={{ backgroundColor: '#cf2a3a', borderRadius: 8, paddingVertical: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                        <Ionicons name="print" size={20} color="#fff" />
                        <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#fff' }}>
                            {connectedDevice != null ? `Print` : 'Connect & Print'}
                        </Text>
                    </View>
                </TouchableOpacity>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <TouchableOpacity
                        onPress={() =>printViaBluetooth(true)}
                        disabled={bleLoading}
                        style={{ backgroundColor: '#FCCA03', borderRadius: 8, paddingVertical: 12, width: '49%' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                            <Ionicons name='copy' size={20} color="#000" />
                            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#000' }}>
                               Print Copy
                            </Text>
                        </View>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => clearAll()} style={{ borderRadius: 8, paddingVertical: 12, width: '49%', backgroundColor: '#25AD76', flexDirection: 'row', alignItems: 'center', gap: 5, justifyContent: 'center' }}>
                        <Ionicons name={'checkmark'} color={'#fff'} size={24} />
                        <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 18 }}>Done</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}