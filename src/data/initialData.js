// Initial data for Zavera application

export const initialBranches = [
    {
        id: 'br-001',
        name: 'Zavera Grand Hotel Jakarta',
        hotelPartner: 'Grand Hotel Jakarta',
        location: 'Jakarta Pusat',
        profitSharingPercent: 30, // SPA gets 30%, hotel gets 70%
        isActive: true
    },
    {
        id: 'br-002',
        name: 'Zavera Bali Resort',
        hotelPartner: 'Bali Paradise Resort',
        location: 'Nusa Dua, Bali',
        profitSharingPercent: 35,
        isActive: true
    },
    {
        id: 'br-003',
        name: 'Zavera Bandung Boutique',
        hotelPartner: 'Boutique Hotel Bandung',
        location: 'Dago, Bandung',
        profitSharingPercent: 40,
        isActive: true
    },
    {
        id: 'br-004',
        name: 'Zavera Surabaya Plaza',
        hotelPartner: 'Plaza Hotel Surabaya',
        location: 'Tunjungan, Surabaya',
        profitSharingPercent: 30,
        isActive: true
    },
    {
        id: 'br-005',
        name: 'Zavera Yogyakarta Heritage',
        hotelPartner: 'Heritage Hotel Yogyakarta',
        location: 'Malioboro, Yogyakarta',
        profitSharingPercent: 35,
        isActive: true
    },
    {
        id: 'br-006',
        name: 'Zavera Lombok Beach',
        hotelPartner: 'Lombok Beach Resort',
        location: 'Senggigi, Lombok',
        profitSharingPercent: 40,
        isActive: true
    }
];

export const initialServices = [
    {
        id: 'svc-001',
        name: 'Traditional Balinese Massage',
        category: 'Massage',
        durationMinutes: 60,
        price: 350000,
        description: 'Teknik pijat tradisional Bali yang menenangkan',
        isActive: true
    },
    {
        id: 'svc-002',
        name: 'Swedish Massage',
        category: 'Massage',
        durationMinutes: 90,
        price: 500000,
        description: 'Pijat relaksasi dengan teknik Swedish',
        isActive: true
    },
    {
        id: 'svc-003',
        name: 'Deep Tissue Massage',
        category: 'Massage',
        durationMinutes: 60,
        price: 400000,
        description: 'Pijat untuk mengatasi ketegangan otot dalam',
        isActive: true
    },
    {
        id: 'svc-004',
        name: 'Aromatherapy Session',
        category: 'Therapy',
        durationMinutes: 75,
        price: 450000,
        description: 'Terapi aromaterapi dengan essential oil pilihan',
        isActive: true
    },
    {
        id: 'svc-005',
        name: 'Facial Treatment Premium',
        category: 'Facial',
        durationMinutes: 90,
        price: 550000,
        description: 'Perawatan wajah lengkap dengan produk premium',
        isActive: true
    },
    {
        id: 'svc-006',
        name: 'Body Scrub & Wrap',
        category: 'Body Treatment',
        durationMinutes: 120,
        price: 600000,
        description: 'Lulur tradisional dengan body wrap',
        isActive: true
    },
    {
        id: 'svc-007',
        name: 'Hot Stone Massage',
        category: 'Massage',
        durationMinutes: 90,
        price: 550000,
        description: 'Pijat dengan batu panas untuk relaksasi maksimal',
        isActive: true
    },
    {
        id: 'svc-008',
        name: 'Reflexology',
        category: 'Massage',
        durationMinutes: 45,
        price: 250000,
        description: 'Pijat refleksi kaki untuk kesehatan',
        isActive: true
    }
];

export const initialTherapists = [
    { id: 'th-001', name: 'Sari Wijaya', specialization: 'Massage', hourlyIncentive: 50000 },
    { id: 'th-002', name: 'Dewi Lestari', specialization: 'Facial', hourlyIncentive: 55000 },
    { id: 'th-003', name: 'Putri Amelia', specialization: 'Massage', hourlyIncentive: 50000 },
    { id: 'th-004', name: 'Maya Kusuma', specialization: 'Body Treatment', hourlyIncentive: 60000 },
    { id: 'th-005', name: 'Rina Saraswati', specialization: 'Massage', hourlyIncentive: 50000 },
    { id: 'th-006', name: 'Ayu Puspita', specialization: 'Therapy', hourlyIncentive: 55000 }
];

// Sample bookings for demonstration
export const sampleBookings = [
    {
        id: 'bk-001',
        branchId: 'br-001',
        serviceId: 'svc-001',
        therapistId: 'th-001',
        customerName: 'John Smith',
        date: new Date().toISOString().split('T')[0],
        time: '10:00',
        status: 'completed',
        notes: 'Tamu hotel, kamar 205'
    },
    {
        id: 'bk-002',
        branchId: 'br-001',
        serviceId: 'svc-005',
        therapistId: 'th-002',
        customerName: 'Sarah Johnson',
        date: new Date().toISOString().split('T')[0],
        time: '11:00',
        status: 'completed',
        notes: ''
    },
    {
        id: 'bk-003',
        branchId: 'br-001',
        serviceId: 'svc-003',
        therapistId: 'th-003',
        customerName: 'Michael Chen',
        date: new Date().toISOString().split('T')[0],
        time: '14:00',
        status: 'confirmed',
        notes: 'Repeat customer'
    }
];

export const initialInventory = [
    {
        id: 'inv-001',
        name: 'Aromatherapy Essential Oil - Lavender',
        category: 'Oil & Aromatherapy',
        unit: 'bottle',
        currentStock: 25,
        minStock: 10,
        pricePerUnit: 150000
    },
    {
        id: 'inv-002',
        name: 'Massage Oil - Premium Blend',
        category: 'Oil & Aromatherapy',
        unit: 'liter',
        currentStock: 15,
        minStock: 8,
        pricePerUnit: 200000
    },
    {
        id: 'inv-003',
        name: 'Face Mask - Collagen',
        category: 'Facial Products',
        unit: 'pack',
        currentStock: 8,
        minStock: 12,
        pricePerUnit: 75000
    },
    {
        id: 'inv-004',
        name: 'Body Scrub - Coffee',
        category: 'Body Products',
        unit: 'kg',
        currentStock: 20,
        minStock: 10,
        pricePerUnit: 120000
    },
    {
        id: 'inv-005',
        name: 'Hot Stone Set',
        category: 'Equipment',
        unit: 'set',
        currentStock: 5,
        minStock: 3,
        pricePerUnit: 500000
    },
    {
        id: 'inv-006',
        name: 'Towels - Premium White',
        category: 'Linen',
        unit: 'piece',
        currentStock: 50,
        minStock: 30,
        pricePerUnit: 50000
    },
    {
        id: 'inv-007',
        name: 'Facial Cleanser',
        category: 'Facial Products',
        unit: 'bottle',
        currentStock: 12,
        minStock: 15,
        pricePerUnit: 180000
    }
];
