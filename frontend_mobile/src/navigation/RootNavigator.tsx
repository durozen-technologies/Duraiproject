import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LayoutGrid, ShoppingCart, Tag, Users, Receipt } from 'lucide-react-native';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from '../context/AuthContext';

import DashboardScreen from '../screens/DashboardScreen';
import PartiesScreen from '../screens/PartiesScreen';
import PurchasesScreen from '../screens/PurchasesScreen';
import SalesScreen from '../screens/SalesScreen';
import NewPurchaseScreen from '../screens/NewPurchaseScreen';
import NewSaleScreen from '../screens/NewSaleScreen';
import NewPartyScreen from '../screens/NewPartyScreen';
import ExpensesScreen from '../screens/ExpensesScreen';
import ExpenseCategoriesScreen from '../screens/ExpenseCategoriesScreen';
import CollectionPaymentScreen from '../screens/CollectionPaymentScreen';
import ReportsScreen from '../screens/ReportsScreen';
import LoginScreen from '../screens/LoginScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

export const linking = {
  prefixes: [],
  config: {
    screens: {
      Login: 'login',
      MainTabs: {
        path: '',
        screens: {
          Dashboard: 'dashboard',
          Purchases: 'purchases',
          Sales: 'sales',
          Parties: 'parties',
          Expenses: 'expenses',
        }
      },
      NewParty: 'parties/new',
      NewPurchase: 'purchases/new',
      NewSale: 'sales/new',
      Expenses: 'expenses/all',
      ExpenseCategories: 'expenses/categories',
      CollectionPayment: 'collections/new',
      Reports: 'reports'
    }
  }
};

function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#006948',
        tabBarInactiveTintColor: '#4b5563',
        tabBarStyle: { height: 60, paddingBottom: 10, paddingTop: 10 },
        headerShown: false,
      }}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={DashboardScreen} 
        options={{
          tabBarIcon: ({ color }) => <LayoutGrid color={color} size={24} />,
        }}
      />
      <Tab.Screen 
        name="Purchases" 
        component={PurchasesScreen} 
        options={{
          tabBarIcon: ({ color }) => <ShoppingCart color={color} size={24} />,
        }}
      />
      <Tab.Screen 
        name="Sales" 
        component={SalesScreen} 
        options={{
          tabBarIcon: ({ color }) => <Tag color={color} size={24} />,
        }}
      />
      <Tab.Screen 
        name="Parties" 
        component={PartiesScreen} 
        options={{
          tabBarIcon: ({ color }) => <Users color={color} size={24} />,
        }}
      />
      <Tab.Screen 
        name="Expenses" 
        component={ExpensesScreen} 
        options={{
          tabBarIcon: ({ color }) => <Receipt color={color} size={24} />,
        }}
      />
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  const { isLoading, userToken } = useAuth();

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#006948" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {userToken == null ? (
        <Stack.Screen name="Login" component={LoginScreen} />
      ) : (
        <>
          <Stack.Screen name="MainTabs" component={MainTabNavigator} />
          <Stack.Screen name="NewParty" component={NewPartyScreen} />
          <Stack.Screen name="NewPurchase" component={NewPurchaseScreen} />
          <Stack.Screen name="NewSale" component={NewSaleScreen} />
          <Stack.Screen name="Expenses" component={ExpensesScreen} />
          <Stack.Screen name="ExpenseCategories" component={ExpenseCategoriesScreen} />
          <Stack.Screen name="CollectionPayment" component={CollectionPaymentScreen} />
          <Stack.Screen name="Reports" component={ReportsScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}
