import { UserLogin } from '@/api/userLogin';
import { usePassesType } from '@/context/passes';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from "expo-router";
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Image, KeyboardAvoidingView, Platform, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const { height, width } = Dimensions.get('screen');
const logo_icon = require('@/assets/images/logo_icon.png');
const logo_text = require('@/assets/images/logo.png');
const redWave = require('@/assets/images/red_wave.png');
const yellowWave = require('@/assets/images/yellow_wave.png');

export default function Login() {
    const { passesTypeLoading } = usePassesType();
    const [loading, setLoading] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [emailFocused, setEmailFocused] = useState(false);
    const [passwordFocused, setPasswordFocused] = useState(false);
    const [isPasswordVissible, setPasswordVissible] = useState(false);
    const [loginSpinner, setLoginSpinner] = useState(false);

    useEffect(() => {
        const checkToken = async () => {
        const token = await AsyncStorage.getItem('token');

        setTimeout(() => {
            if(token) {
            router.replace('/(tabs)/manual-booking');
            }

            setLoading(false);
        }, 600)
        } 

        checkToken();
    }, []);

    const handleLogin = async () => {
        setLoginSpinner(true);

        if(!email.trim() || !password.trim()) {
            setLoginSpinner(false);
            Alert.alert('Invalid', 'Email and password are reqiuired.');
            return;
        }

        try {
            const response = await UserLogin(email, password);

            if (!response?.token) {
                throw new Error("Invalid login response");
            }

            if(response.token) {
                AsyncStorage.setItem('token', response.token);
                AsyncStorage.setItem('userID', String(response.user.id));
                AsyncStorage.setItem('name', response.user.name);
                AsyncStorage.setItem('image', response.user.profile_picture ?? '');
                AsyncStorage.setItem('role', response.user.assigned_role.name);

                router.replace('/(tabs)/manual-booking');
            }
        }catch(error: any) {
            Alert.alert('Login Failed', error.message);
        }finally{
            setLoginSpinner(false);
        }

    }

    return (
        <View style={{ flex: 1, backgroundColor: '#fff' }}>
            {loading == true ? (
                <View style={{ alignItems: 'center', paddingTop: 400, height }}>
                    <ActivityIndicator size={'large'} color={'#cf2a3a'} />
                </View>
            ) : (
                <>
                    <StatusBar barStyle={'dark-content'} backgroundColor={'transparent'} translucent />
                    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }} >
                        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
                            <View style={{ justifyContent: 'center', paddingTop: 300, paddingHorizontal: 20 }}>
                                <View style={{ flexDirection: 'column', alignItems: 'center', marginBottom: 60, gap: 10, marginTop: -120 }}>
                                    <Image source={logo_icon} style={{ width: 50, height: 49 }} />
                                    <Image source={logo_text} style={{ height: 25, width: 105 }} />
                                </View>
                                <View>
                                    <Text style={{ fontSize: 13, fontWeight: 'bold' }}>Email or Username</Text>
                                    <TextInput
                                        placeholder="Email or Username"
                                        value={email}
                                        onChangeText={(text) => setEmail(text)}
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                        onFocus={() => setEmailFocused(true)}
                                        onBlur={() => setEmailFocused(false)}
                                        style={[styles.input, emailFocused && styles.inputFocused, { color: '#000' }]}
                                    />
                                </View>
                                <View>
                                    <Text style={{ fontSize: 13, fontWeight: 'bold' }}>Password</Text>
                                    <View style={[styles.passwordInput, passwordFocused && styles.inputFocused]}>
                                        <TextInput
                                            placeholder="Password"
                                            value={password}
                                            onChangeText={(text) => setPassword(text)}
                                            autoCapitalize="none"
                                            secureTextEntry={!isPasswordVissible}
                                            onFocus={() => setPasswordFocused(true)}
                                            onBlur={() => setPasswordFocused(false)}
                                            style={{ width: '90%', color: '#000' }}
                                        />
                                        <TouchableOpacity onPress={() => setPasswordVissible(!isPasswordVissible)} style={{ paddingRight: 10 }}>
                                            {isPasswordVissible == true ? (
                                            <Ionicons name="lock-open" color={'#cf2a3a'} size={20} />
                                            ) : (
                                            <Ionicons name="lock-closed" color={'#6C6C6C'} size={20} />
                                            )}
                                        </TouchableOpacity>
                                    </View>
                                </View>
                                <TouchableOpacity disabled={loginSpinner} onPress={() => handleLogin()} style={[{backgroundColor: loginSpinner == true ? '#eb606eff' : '#cf2a3a'}, styles.button]} >
                                    {loginSpinner == true || passesTypeLoading == true ? (
                                    <ActivityIndicator size={'small'} color={'#FFC107'} style={{ alignSelf: 'center' }} />
                                    ) : (
                                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>Login</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </KeyboardAvoidingView>
                    <View style={{ position: 'absolute', bottom: 0 }}>
                        <Image source={redWave} style={{ height: 100, width: width, position: 'absolute', bottom: 0, zIndex: 2  }} /> 
                        <Image source={yellowWave} style={{ height: 100, width: width + 50, zIndex: 1 }} /> 
                    </View>
                </>
            )}
        </View>
    )
}


const styles = StyleSheet.create({
    input: {
        backgroundColor: '#D8DADF',
        padding: 10,
        borderRadius: 5,
        marginBottom: 5,
        borderWidth: 2,
        borderColor: 'transparent'
    },
    inputFocused: {
        borderColor: '#FFC107',
        borderWidth: 2,
    },
    passwordInput: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#D8DADF',
        paddingHorizontal: 5,
        borderRadius: 5,
        marginBottom: 15,
        borderWidth: 2,
        borderColor: 'transparent'
    },
    button: {
        paddingHorizontal: 5,
        paddingVertical: 13,
        borderRadius: 5,
        alignItems: 'center',
    },
})