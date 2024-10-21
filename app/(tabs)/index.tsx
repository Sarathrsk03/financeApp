import 'expo-router/entry';
import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  ScrollView, 
  View, 
  Text, 
  TouchableOpacity, 
  Modal, 
  FlatList,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Image } from 'expo-image';
import * as FileSystem from 'expo-file-system';
import { StatusBar } from 'expo-status-bar';

// Constants
const API_BASE_URL = 'https://hcibackend.onrender.com';
const COMPANIES = [
  'AAPL', 'GOOG', 'MSFT', 'AMZN', 'META', 
  'TSLA', 'NFLX', 'ADBE', 'INTC', 'DELL',
] as const;

// Types
type Company = typeof COMPANIES[number];

interface CompanyDetails {
  industry: string;
  currentPrice: string;
  address1: string;
  city: string;
  state: string;
  country: string;
  zip: string;
  totalRevenue: string;
  marketCap: string;
  website: string;
  trailingPE: string;
  dividendYield: string;
  beta: string;
}

// Components
const LoadingSpinner = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color="#0000ff" />
  </View>
);

const CompanyDropdown = ({ 
  selectedCompany, 
  isVisible, 
  onSelect, 
  onClose 
}: {
  selectedCompany: Company;
  isVisible: boolean;
  onSelect: (company: Company) => void;
  onClose: () => void;
}) => (
  <Modal
    visible={isVisible}
    transparent={true}
    animationType="slide"
    onRequestClose={onClose}
  >
    <TouchableOpacity 
      style={styles.modalContainer} 
      activeOpacity={1} 
      onPress={onClose}
    >
      <View style={styles.dropdownList}>
        <FlatList
          data={COMPANIES}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.dropdownItem,
                item === selectedCompany && styles.selectedItem
              ]}
              onPress={() => onSelect(item)}
            >
              <Text style={item === selectedCompany ? styles.selectedText : null}>
                {item}
              </Text>
            </TouchableOpacity>
          )}
          keyExtractor={(item) => item}
        />
      </View>
    </TouchableOpacity>
  </Modal>
);

const CompanyDetails = ({ details }: { details: CompanyDetails }) => (
  <View style={styles.detailsContainer}>
    <Text style={styles.detailsTitle}>Company Details:</Text>
    {Object.entries({
      Industry: details.industry,
      'Current Price': `${details.currentPrice} $`,
      Headquarters: `${details.address1}, ${details.city}, ${details.state}, ${details.country}, ${details.zip}`,
      Revenue: `${details.totalRevenue} $`,
      'Market Cap': `${details.marketCap} $`,
      Website: details.website,
      'P/E Ratio': `${details.trailingPE}`,
      'Dividend Yield': details.dividendYield,
      Beta: details.beta
    }).map(([key, value]) => (
      <Text key={key} style={styles.detailRow}>
        <Text style={styles.detailLabel}>{key}: </Text>
        <Text style={styles.detailValue}>{value}</Text>
      </Text>
    ))}
  </View>
);

// Main App Component
export default function App() {
  const [selectedCompany, setSelectedCompany] = useState<Company>(COMPANIES[0]);
  const [companyDetails, setCompanyDetails] = useState<CompanyDetails | null>(null);
  const [companyImage, setCompanyImage] = useState<string | null>(null);
  const [isDropdownVisible, setIsDropdownVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCompanyData();
  }, [selectedCompany]);

  const loadCompanyData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      await Promise.all([
        fetchCompanyDetails(),
        fetchCompanyImage()
      ]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      Alert.alert('Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCompanyDetails = async () => {
    const response = await fetch(`${API_BASE_URL}/stockDetails/${selectedCompany}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch company details: ${response.statusText}`);
    }
    const data: CompanyDetails = await response.json();
    setCompanyDetails(data);
  };

  const fetchCompanyImage = async () => {
    const imageUrl = `${API_BASE_URL}/stockGraph/${selectedCompany}`;
    const fileName = `${FileSystem.cacheDirectory}${selectedCompany}.jpg`;
    const { uri } = await FileSystem.downloadAsync(imageUrl, fileName);
    setCompanyImage(uri);
  };

  const handleCompanySelect = (company: Company) => {
    setSelectedCompany(company);
    setIsDropdownVisible(false);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <StatusBar style="auto" />
      <Text style={styles.title}>Company Information</Text>

      <TouchableOpacity
        style={styles.dropdownButton}
        onPress={() => setIsDropdownVisible(true)}
      >
        <Text style={styles.dropdownButtonText}>{selectedCompany}</Text>
      </TouchableOpacity>

      <CompanyDropdown
        selectedCompany={selectedCompany}
        isVisible={isDropdownVisible}
        onSelect={handleCompanySelect}
        onClose={() => setIsDropdownVisible(false)}
      />

      {isLoading ? (
        <LoadingSpinner />
      ) : error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : (
        <>
          {companyDetails && <CompanyDetails details={companyDetails} />}
          {companyImage && (
            <Image
              source={{ uri: companyImage }}
              style={styles.image}
              contentFit="contain"
              transition={1000}
            />
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 40,
  },
  contentContainer: {
    padding: 20,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  dropdownButton: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    marginBottom: 20,
    backgroundColor: '#f8f8f8',
  },
  dropdownButtonText: {
    textAlign: 'center',
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  dropdownList: {
    width: '80%',
    maxHeight: 300,
    backgroundColor: '#fff',
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  dropdownItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  selectedItem: {
    backgroundColor: '#e3f2fd',
  },
  selectedText: {
    color: '#1976d2',
    fontWeight: 'bold',
  },
  detailsContainer: {
    marginBottom: 20,
    backgroundColor: '#f8f8f8',
    padding: 15,
    borderRadius: 8,
  },
  detailsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  detailRow: {
    marginBottom: 8,
  },
  detailLabel: {
    fontWeight: '600',
    color: '#666',
  },
  detailValue: {
    color: '#333',
  },
  image: {
    width: '100%',
    height: 200,
    marginBottom: 20,
    borderRadius: 8,

  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    padding: 10,
  },
});