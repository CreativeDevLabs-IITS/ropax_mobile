import { FetchExpenses } from "@/api/expenses";
import { FetchCategories } from "@/api/fetchCategories";
import { UpdateExpense } from "@/api/updateExpense";
import { useExpense } from "@/context/expense";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Dimensions, Modal, RefreshControl, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Dropdown } from "react-native-element-dropdown";

type ExpenseProps = {
    id: number;
    tripSchedID: number;
    trip: string;
    description: string;
    amount: number;
    date: string;
    category: {
        id: number;
        name: string;
        created_at?: string;
        updated_at?: string;
    }
}

type EditExpenseProps = {
    id: number;
    tripSchedID: number;
    trip: string;
    description: string;
    amount: number;
    date: string;
    category: {
        id: number;
        name: string;
        created_at?: string;
        updated_at?: string;
    }
}

type CategoryProps = {
    categoryID: number;
    name: string;
}

type PropPath = 
    | { key: Exclude<keyof EditExpenseProps, 'category'>; value: EditExpenseProps[keyof EditExpenseProps] }
    | { key: 'category'; subKey: keyof EditExpenseProps['category']; value: EditExpenseProps['category'][keyof EditExpenseProps['category']] }

const { height } = Dimensions.get('screen');

export default function Expenses() {
    const { setExpenses } = useExpense();
    const [fetchedExpenses, setFetchedExpenses] = useState<ExpenseProps[]>([]);
    const [expenseToUpdate, setExpenseToUpdate] = useState<EditExpenseProps | null>(null)
    const [categories, setCategories] = useState<CategoryProps[] | null>([])
    const [addDisable, setAddDisable] = useState(false);
    const [totalAmount, setTotalAmount] = useState('');
    const [contentLoading, setContentLoading] = useState(false);
    const [date, setDate] = useState('');
    const [refresh, setRefresh] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [updateLoading, setUpdateLoading] = useState(false);

    useEffect(() => {
        const getDate = new Date();
        const today = getDate.toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
        const date = new Date(today);
        const options: Intl.DateTimeFormatOptions = {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            timeZone: 'Asia/Manila'
        }

        const formattedDate = date.toLocaleDateString('en-US', options);
        const fulldate = `${formattedDate}`;

        setDate(fulldate);
        handleFetchDependencies()
    }, []);

    useFocusEffect(
        useCallback(() => {
            handleFetchDependencies();
            setExpenses([]);
        }, [])
    )

    const handleFetchDependencies = async () => {
        try {
            const [fetchedCategories, expensesfetch] = await Promise.all([
                FetchCategories(),
                FetchExpenses(),
            ]);

            if(!fetchedCategories.error) {
                const categories: CategoryProps[] = fetchedCategories.categories.map((c: any) => ({
                    categoryID: c.id,
                    name: c.name
                }))

                setCategories(categories);
            }

            if(!expensesfetch.error) {
                const expense: ExpenseProps[] = expensesfetch.expenses.map((e: any) => ({
                    id: e.id,
                    tripSchedID: e?.trip_schedule_id,
                    trip: `${e?.trip_schedule?.trip?.route.mobile_code} ${e?.trip_schedule?.trip?.vessel.name}`,
                    description: e.description,
                    amount: String(e.amount),
                    date: new Date(e.created_at).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                        timeZone: 'Asia/Manila'
                    }),
                    category: e.category
                }));
    
                setTotalAmount(expensesfetch.totalAmount)
                setFetchedExpenses(expense)
            }
        }finally {
            setContentLoading(false);
        }
    }



    const handleRefresh = () => {
        setRefresh(true);
        
        setTimeout(() => {
            const getDate = new Date();
            const today = getDate.toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
            const date = new Date(today);
            const options: Intl.DateTimeFormatOptions = {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                timeZone: 'Asia/Manila'
            }
    
            const formattedDate = date.toLocaleDateString('en-US', options);
            const fulldate = `${formattedDate}`;
    
            setDate(fulldate);
            handleFetchDependencies()
            setRefresh(false);
        }, 500);
    }

    const addExpenses = () => {
        setAddDisable(true);
            ([]);
        setExpenses(prev => [...prev, { id: 1, trip_schedule_id: 0, description: '', amount: 0, expense_category_id: 0, image_uri: null }]);
        router.push('/addExpenses');
    }

    const handleExpenseToUpdate = (expense: ExpenseProps) => {
        setExpenseToUpdate(expense);
        setModalVisible(true);
    }

    const handleExpensePropUpdate = (prop: PropPath) => {
        setExpenseToUpdate(prev => {
            if(!prev) return prev;

            if(prop.key == 'category') {
                return {
                    ...prev,
                    category: { ...prev.category, [prop.subKey]: prop.value }
                }
            }

            return { ...prev, [prop.key]: prop.value }
        })
    }

    const handleSaveExpenseUpdate = async (expense: EditExpenseProps) => {
        setUpdateLoading(true);
        if(expenseToUpdate.amount == 0 || expenseToUpdate.category.id == 0 || !expense.description.trim() || expenseToUpdate.tripSchedID == 0) {
            Alert.alert('Invalid', 'Failed to save update. Please fill out the form.');
            return;
        }

        try {
            const saveUpdate = await UpdateExpense(expenseToUpdate.id, expenseToUpdate.tripSchedID, expenseToUpdate.description, expenseToUpdate.amount, expenseToUpdate.category.id);

            if(!saveUpdate.error) {
                
                Alert.alert('Success', saveUpdate.success, [{
                    text: 'Ok',
                    onPress: () => {handleFetchDependencies(), setModalVisible(false)}
                }])
            }
        }catch(error: any) {
            Alert.alert('Error', error.message);
        }finally {
            setUpdateLoading(false);
        }
    }

    return (
        <View style={{ flex: 1, backgroundColor: '#fff' }}>
            <Modal transparent animationType={'slide'} onRequestClose={() => setModalVisible(false)} visible={modalVisible}>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
                    <View style={{ width: '92%', backgroundColor: '#fff', padding: 20, borderRadius: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4 }}>
                        <Text style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 10, color: '#000' }}>Update Expense</Text>
                        <View>
                            <View>
                                <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#545454' }}>Description</Text>
                                <View style={{ borderColor: '#B3B3B3', borderWidth: 1, borderRadius: 5 }}>
                                    <TextInput onChangeText={(text) => handleExpensePropUpdate({ key: 'description', value: text })} value={expenseToUpdate?.description} placeholder='e.g. Vessel Oil' style={{ fontSize: 13, color: '#000' }} />
                                </View>
                            </View>
                            <View style={{ marginTop: 5, flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
                                <View style={{ width: '25%' }}>
                                    <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#545454' }}>Amount:</Text>
                                    <View style={{ borderColor: '#B3B3B3', borderWidth: 1, borderRadius: 5, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 5 }}>
                                        <Text style={{ fontWeight: 'bold', fontSize: 16, marginTop: -5, color: '#000' }}>₱</Text>
                                        <TextInput onChangeText={(text) => handleExpensePropUpdate({ key: 'amount', value: Number(text) })} value={String(Number(expenseToUpdate?.amount).toLocaleString('en-PH', { minimumFractionDigits: 2 }))} keyboardType='numeric' placeholder='00.00' style={{ fontSize: 13, textAlign: 'right', color: '#000' }} />
                                    </View>
                                </View>
                                <View style={{ width: '72.5%' }}>
                                    <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#545454' }}>Category</Text>
                                    <View style={{ borderColor: '#B3B3B3', borderWidth: 1, borderRadius: 5, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Dropdown onChange={item =>  handleExpensePropUpdate({ key: 'category', subKey: 'id', value: item.categoryID })} value={expenseToUpdate?.category.id || undefined} data={categories} labelField="name" valueField="categoryID" placeholder="Select Category" 
                                            style={{ height: 40, width: '100%', paddingHorizontal: 10 }}
                                            containerStyle={{
                                                alignSelf: 'flex-start',
                                                width: '58%',
                                            }}
                                            selectedTextStyle={{ fontWeight: '500', fontSize: 12, lineHeight: 35, color: '#000' }}
                                            renderRightIcon={() => (
                                                <Ionicons name="chevron-down" size={15} />
                                            )}
                                            dropdownPosition="bottom"
                                            renderItem={(item) => (
                                                <View style={{ width: '80%', padding: 8 }}>
                                                <Text style={{ color: '#000' }}>{item.name}</Text>
                                                </View>
                                            )}
                                        />
                                    </View>
                                </View>
                            </View>
                        </View>
                        <TouchableOpacity disabled={updateLoading} onPress={() => handleSaveExpenseUpdate(expenseToUpdate)} style={{ marginTop: 30, padding: 10, backgroundColor: '#CF2A3A', borderRadius: 5 }}>
                            {updateLoading == false ? (
                                <Text style={{ color: '#fff', textAlign: 'center' }}>Update</Text>
                            ): (
                                <ActivityIndicator size={'small'} color={'#fff'} />
                            )}
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setModalVisible(false)} style={{ marginTop: 10, padding: 10, borderRadius: 5, borderColor: '#cf2a3a', borderWidth: 1 }}>
                            <Text style={{ color: '#cf2a3a', textAlign: 'center' }}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
            
            <View style={{ paddingTop: 30, height: 100, backgroundColor: '#cf2a3a', paddingLeft: 20, paddingRight: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ color: '#fff', fontSize: 20, fontWeight: 'bold' }}>Daily Expenses</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <TouchableOpacity onPress={addExpenses}>
                        <Ionicons name="add" size={35} color={'#fff'} />
                    </TouchableOpacity>
                </View>
            </View>

            <>
            {contentLoading ? (
                <View style={{ height: height - 120, justifyContent: 'center' }}>
                    <ActivityIndicator size={'large'} color={'#cf2a3a'} />
                </View>
            ) : (
                <View style={{ paddingBottom: 15 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#cf2a3b18', borderBottomColor: '#CF2A3A', borderBottomWidth: 1, paddingVertical: 10, paddingHorizontal: 15 }}>
                        <View style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                            <Text style={{ fontSize: 10, color: '#000' }}>Date:</Text>
                            <Text style={{ color: '#CF2A3A', fontSize: 15, fontWeight: '900' }}>{date}</Text>
                        </View>
                        <View style={{ flexDirection: 'column', alignItems: 'flex-end' }}>
                            <Text style={{ fontSize: 10, color: '#000' }}>Total Expenses:</Text>
                            <View style={{ flexDirection: 'row', gap: 3, alignItems: 'center' }}>
                                <Text style={{ fontWeight: 'bold', fontSize: 14, color: '#cf2a3a', marginTop: -1 }}>₱</Text>
                                <Text style={{ fontSize: 15, color: '#cf2a3a', fontWeight: '900' }}>
                                    {Number(totalAmount).toLocaleString('en-PH', {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                    })}
                                </Text>
                            </View>
                        </View>
                    </View>

                    <View style={{ height: height - 215 }}>
                        {fetchedExpenses && fetchedExpenses.length > 0 ? (
                            <ScrollView refreshControl={ <RefreshControl refreshing={refresh} onRefresh={handleRefresh} colors={['#cf2a3a']} /> }>
                                {fetchedExpenses.map((e) => (
                                    <TouchableOpacity onPress={() => handleExpenseToUpdate(e)} key={e.id} style={{ paddingHorizontal: 15, paddingVertical: 15, backgroundColor: '#fff', borderBottomColor: '#FFC1C5', borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <View style={{ width: '70%' }}>
                                            <Text style={{ fontWeight: '900', fontSize: 15 , color: '#cf2a3a' }}>{e.description}</Text>
                                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                <Text style={{ fontWeight: 'bold', fontSize: 10, color: '#9B9B9B' }}>{e.trip}</Text>
                                                <Text style={{ fontWeight: 'bold', fontSize: 10, color: '#9B9B9B' }}>  |  </Text>
                                                <Text style={{ fontWeight: 'bold', fontSize: 10, color: '#9B9B9B' }}>{e.category.name}</Text>
                                            </View>
                                        </View>
                                        <View style={{ flexDirection: 'row', gap: 3, alignItems: 'center' }}>
                                            <Text style={{ fontWeight: 'bold', fontSize: 19, color: '#FF636D', marginTop: -1 }}>₱</Text>
                                            <Text style={{ fontSize: 18, color: '#FF636D' }}>
                                                {Number(e.amount).toLocaleString('en-PH', {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2,
                                                })}
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                            ) : (
                                <View style={{ height: height / 2, justifyContent: 'center' }}>
                                    <Text style={{ color: '#7A7A85', textAlign: 'center' }}>No Expense Record</Text>
                                </View>
                            )}

                    </View>
                </View>
            )}
            </>
            
        </View>
    )
}