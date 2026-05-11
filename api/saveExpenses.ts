import { ExpenseProps } from '@/context/expense';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';


export async function SaveExpenses(expenses: ExpenseProps[], station_id: string) {
    const extras = Constants.expoConfig?.extra ?? {};
    const API_KEY = extras.API_KEY as string;
    const API_URL = extras.API_URL as string;
    const ORIGIN  = extras.ORIGIN  as string;

    try {
        const token = await AsyncStorage.getItem('token');
        

        if (!token) {
            throw new Error('No token found. Please login again.');
        }

        const formData = new FormData();

        expenses.forEach((expense, index) => {
            formData.append(`expenses[${index}][trip_schedule_id]`,    String(expense.trip_schedule_id));
            formData.append(`expenses[${index}][description]`,         String(expense.description));
            formData.append(`expenses[${index}][amount]`,              String(expense.amount));
            formData.append(`expenses[${index}][expense_category_id]`, String(expense.expense_category_id));
            formData.append(`expenses[${index}][station_id]`,          String(station_id));

            if (expense.image_uri) {
                const fileName = expense.image_uri.split('/').pop() || `photo_${Date.now()}.jpg`;
                formData.append(`expenses[${index}][image]`, {
                    uri:  expense.image_uri,
                    name: fileName,
                    type: 'image/jpeg',
                } as any);
            }
        });

        const res = await fetch(`${API_URL}save/expenses`, {
            method: 'POST',
            headers: {
                'Accept':        'application/json',
                'x-api-key':     API_KEY,
                'Origin':        ORIGIN,
                'Authorization': token,
            },
            body: formData,
        });

        const response = await res.json();

        if (!res.ok) {
            throw new Error(response.message);
        }

        return response;
    } catch (error: any) {
        throw error;
    }
}