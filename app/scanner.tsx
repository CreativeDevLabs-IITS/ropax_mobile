import { ValidateQr } from '@/api/validateQr';
import PreLoader from '@/components/preloader';
import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer } from 'expo-audio';
import { BarcodeScanningResult, CameraType, CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Dimensions, Easing, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';


const { height, width } = Dimensions.get('screen');
const FRAME_SIZE = width * 0.65;

const frameLeft = (width - FRAME_SIZE) / 2;
const frameTop = (height - FRAME_SIZE) / 2;

export default function QRScanner() {
    const [permission, requestPermission] = useCameraPermissions();
    const [screenLoading, setScreenLoading] = useState(false);
    const [scanned, setScanned] = useState(false);
    const [cameraType, setCameraType] = useState<CameraType>('back');
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const mp3 = require('../assets/audio/beep.wav');
    const audio = useAudioPlayer(mp3)

    useEffect(() => {
        const breathe = () => {
            Animated.sequence([
                Animated.timing(scaleAnim, {
                    toValue: 1.04,
                    duration: 800,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true
                }),
                Animated.timing(scaleAnim, {
                    toValue: 1,
                    duration: 800,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
            ]).start(breathe);
        }

        breathe();
    }, [])
    
    const handleOnScan = (result: BarcodeScanningResult) => {
        if (scanned) return;
        
        const code = result.data;
        const points = result.cornerPoints;
        
        if(!points || points.length < 4) return;

        const centerX = points.reduce((sum, p) => sum + p.x, 0) / points.length;
        const centerY = points.reduce((sum, p) => sum + p.y, 0) / points.length;

        const buffer = FRAME_SIZE * 0.4; 


        const frameLeft = (width - FRAME_SIZE) / 2;
        const frameRigt = frameLeft + FRAME_SIZE;
        const frameTop = (height - FRAME_SIZE) / 2;
        const frameBottom = frameTop + FRAME_SIZE;

        const isInnFrame = centerX >= frameLeft - buffer &&
                            centerX <= frameRigt + buffer &&
                            centerY >= frameTop - buffer && 
                            centerY <= frameBottom + buffer;
        
        if(isInnFrame) {
            setScanned(true);
            audio.seekTo(0);
            audio.play();

            setScreenLoading(true);
            handleValidateQr(code)
        }
    }

    const toggleCameraType = () => {
        setCameraType(current => (current == 'back' ? 'front' : 'back'));
    }

    const handleValidateQr = async (code: string) => {
        try {
            const response = await ValidateQr(code);
            
            if(!response.error) {
                const bookingId = response.data.id
                const paxId = response.data.passengers[0].id
                const refNum = response.data.reference_no;
                
                router.replace(`/bookingInfo?bookingId=${bookingId}&paxId=${paxId}&refNum=${refNum}`)
            }
        }catch(error: any) {
            Alert.alert('Error', error.message)
            setScanned(false);
        }finally{
            setScreenLoading(false)
        }
    }


    if(!permission) {
        return (
            <View />
        )
    }

    if(!permission.granted) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: '#00000088', position: 'relative' }]}>
                <View style={{ backgroundColor: '#fff',width: '90%', alignSelf: 'center', padding: 20, borderRadius: 20, position: 'absolute', bottom: 50 }}>
                    <Text style={styles.permissionText}>
                        We need access to your camera to scan QR codes.
                    </Text>
                    <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
                        <Text style={styles.permissionButtonText}>Grant Permission</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => router.back()} style={{ paddingVertical: 15, alignSelf: 'center' }}>
                        <Text style={{ color: '#5a5a5a' }}>Decline</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }
    

    return (
        <View style={styles.container}>
            {permission.granted && (
                <>
                    <PreLoader loading={screenLoading} />

                    <View style={styles.header}>
                        <Text style={{ color: '#fff', fontSize: 20, fontWeight: 'bold' }}>QR Scanner</Text>
                         <TouchableOpacity onPress={toggleCameraType} >
                            <Ionicons name='camera-reverse-outline' size={30} color={'#fff'} />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.overlay}>
                        <CameraView style={StyleSheet.absoluteFill} onBarcodeScanned={handleOnScan} facing={cameraType} 
                            barcodeScannerSettings={{ barcodeTypes: ['qr'] }} />
                        <View style={[styles.mask, { top: 0, height: frameTop }]} />
                        <View style={[styles.mask, { top: frameTop + FRAME_SIZE, height: height - (frameTop + FRAME_SIZE) }]} />
                        <View style={[styles.mask, { top: frameTop, height: FRAME_SIZE, left: 0, width: frameLeft }]} />
                        <View style={[styles.mask, { top: frameTop, height: FRAME_SIZE, left: frameLeft + FRAME_SIZE, width: frameLeft }]} />

                        <Animated.View  style={[styles.cutout, { transform: [{ scale: scaleAnim }] }]}>
                            <View style={[styles.corner, styles.topLeft]} />
                            <View style={[styles.corner, styles.topRight]} />
                            <View style={[styles.corner, styles.bottomLeft]} />
                            <View style={[styles.corner, styles.bottomRight]} />
                        </Animated.View>
                    </View>
                    <TouchableOpacity onPress={() => router.back()} style={{ position: 'absolute', bottom: 50, backgroundColor: '#cf2a3a', paddingVertical: 15, borderRadius: 8, alignSelf: 'center', width: '90%' }}>
                        <Text style={{ color: '#fff', fontWeight: '700', textAlign: 'center', fontSize: 16 }}>Go Back</Text>
                    </TouchableOpacity>
                </>
            )}
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        position: 'relative',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center'
    },
    permissionText: {
        fontSize: 16,
        marginBottom: 20,
        textAlign: 'center',
    },
     permissionButton: {
        backgroundColor: '#cf2a3a',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    permissionButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'center'
    },
    header: {
        backgroundColor: '#cf2a3a',
        height: 90,
        width,
        paddingTop: 40,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 5
    },
    mask: {
        position: 'absolute',
        backgroundColor: 'rgba(0, 0, 0, 0.26)',
        width,
    },
     cutout: {
        top: frameTop,
        width: FRAME_SIZE,
        height: FRAME_SIZE,
    },
    corner: {
        position: 'absolute',
        width: 50,
        height: 50,
        borderColor: '#cf2a3a',
    },
    topLeft: {
        top: 0,
        left: 0,
        borderTopWidth: 4,
        borderLeftWidth: 4,
        borderRadius: 4,
    },

    topRight: {
        top: 0,
        right: 0,
        borderTopWidth: 4,
        borderRightWidth: 4,
        borderRadius: 4,
    },

    bottomLeft: {
        bottom: 0,
        left: 0,
        borderBottomWidth: 4,
        borderLeftWidth: 4,
        borderRadius: 4,
    },

    bottomRight: {
        bottom: 0,
        right: 0,
        borderBottomWidth: 4,
        borderRightWidth: 4,
        borderRadius: 4,
    },
})