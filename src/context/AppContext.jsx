import React, { createContext, useContext, useState, useEffect } from 'react';
import {
    initialBranches,
    initialServices,
    initialTherapists,
    sampleBookings,
    initialInventory
} from '../data/initialData';

const AppContext = createContext();

export const useAppContext = () => {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useAppContext must be used within AppProvider');
    }
    return context;
};

export const AppProvider = ({ children }) => {
    // Load from localStorage or use initial data
    const [branches] = useState(() => {
        const saved = localStorage.getItem('spacity_branches');
        return saved ? JSON.parse(saved) : initialBranches;
    });

    const [selectedBranchId, setSelectedBranchId] = useState(() => {
        const saved = localStorage.getItem('spacity_selected_branch');
        return saved || branches[0]?.id;
    });

    const [services, setServices] = useState(() => {
        const saved = localStorage.getItem('spacity_services');
        return saved ? JSON.parse(saved) : initialServices;
    });

    const [therapists] = useState(() => {
        const saved = localStorage.getItem('spacity_therapists');
        return saved ? JSON.parse(saved) : initialTherapists;
    });

    const [bookings, setBookings] = useState(() => {
        const saved = localStorage.getItem('spacity_bookings');
        return saved ? JSON.parse(saved) : sampleBookings;
    });

    const [inventory, setInventory] = useState(() => {
        const saved = localStorage.getItem('spacity_inventory');
        return saved ? JSON.parse(saved) : initialInventory;
    });

    // Therapist statuses per branch and date
    const [therapistStatuses, setTherapistStatuses] = useState(() => {
        const saved = localStorage.getItem('spacity_therapist_statuses');
        return saved ? JSON.parse(saved) : []; // array of { id, branchId, therapistId, date, status, note }
    });

    // Save to localStorage whenever data changes
    useEffect(() => {
        localStorage.setItem('spacity_branches', JSON.stringify(branches));
    }, [branches]);

    useEffect(() => {
        localStorage.setItem('spacity_selected_branch', selectedBranchId);
    }, [selectedBranchId]);

    useEffect(() => {
        localStorage.setItem('spacity_services', JSON.stringify(services));
    }, [services]);

    useEffect(() => {
        localStorage.setItem('spacity_therapists', JSON.stringify(therapists));
    }, [therapists]);

    useEffect(() => {
        localStorage.setItem('spacity_bookings', JSON.stringify(bookings));
    }, [bookings]);

    useEffect(() => {
        localStorage.setItem('spacity_inventory', JSON.stringify(inventory));
    }, [inventory]);

    useEffect(() => {
        localStorage.setItem('spacity_therapist_statuses', JSON.stringify(therapistStatuses));
    }, [therapistStatuses]);

    // Get current branch
    const selectedBranch = branches.find(b => b.id === selectedBranchId);

    // Filter bookings by selected branch
    const branchBookings = bookings.filter(b => b.branchId === selectedBranchId);

    // Service management
    const addService = (service) => {
        const newService = {
            ...service,
            id: `svc-${Date.now()}`,
            isActive: true
        };
        setServices([...services, newService]);
        return newService;
    };

    const updateService = (id, updates) => {
        setServices(services.map(s => s.id === id ? { ...s, ...updates } : s));
    };

    const deleteService = (id) => {
        setServices(services.filter(s => s.id !== id));
    };

    // Booking management
    const addBooking = (booking) => {
        const newBooking = {
            ...booking,
            id: `bk-${Date.now()}`,
            branchId: selectedBranchId
        };
        setBookings([...bookings, newBooking]);
        return newBooking;
    };

    const updateBooking = (id, updates) => {
        setBookings(bookings.map(b => b.id === id ? { ...b, ...updates } : b));
    };

    const deleteBooking = (id) => {
        setBookings(bookings.filter(b => b.id !== id));
    };

    // Therapist status management (on-duty, off-duty, in-service)
    const setTherapistStatus = (therapistId, status, date = new Date().toISOString().split('T')[0], note = '') => {
        const existingIndex = therapistStatuses.findIndex(s => s.therapistId === therapistId && s.branchId === selectedBranchId && s.date === date);
        if (existingIndex !== -1) {
            const updated = [...therapistStatuses];
            updated[existingIndex] = { ...updated[existingIndex], status, note };
            setTherapistStatuses(updated);
            return updated[existingIndex];
        }

        const newStatus = {
            id: `ts-${Date.now()}`,
            branchId: selectedBranchId,
            therapistId,
            date,
            status,
            note
        };
        setTherapistStatuses([...therapistStatuses, newStatus]);
        return newStatus;
    };

    const getTherapistStatus = (therapistId, date = new Date().toISOString().split('T')[0]) => {
        return therapistStatuses.find(s => s.therapistId === therapistId && s.branchId === selectedBranchId && s.date === date) || null;
    };

    // Service timing helpers: mark start and finish on bookings and update therapist status
    const startService = (bookingId) => {
        const now = new Date().toISOString();
        setBookings(bookings.map(b => b.id === bookingId ? { ...b, status: 'in-service', serviceStartTime: now } : b));
        const b = bookings.find(x => x.id === bookingId);
        if (b) setTherapistStatus(b.therapistId, 'in-service', b.date);
    };

    const finishService = (bookingId) => {
        const now = new Date().toISOString();
        setBookings(bookings.map(b => b.id === bookingId ? { ...b, status: 'completed', serviceEndTime: now } : b));
        const b = bookings.find(x => x.id === bookingId);
        if (b) setTherapistStatus(b.therapistId, 'on-duty', b.date);
    };

    const getServiceRemainingMinutes = (booking) => {
        if (!booking || !booking.serviceStartTime) return null;
        const service = services.find(s => s.id === booking.serviceId);
        if (!service) return null;
        const start = new Date(booking.serviceStartTime);
        const elapsed = (Date.now() - start.getTime()) / 60000; // minutes
        const remaining = Math.max(0, service.durationMinutes - Math.floor(elapsed));
        return remaining;
    };

    const getDailyServiceTotals = (date = new Date().toISOString().split('T')[0], therapistId = null) => {
        const filtered = bookings.filter(b => b.date === date && (therapistId ? b.therapistId === therapistId : true) && (b.status === 'completed' || b.status === 'in-service'));
        const totalCount = filtered.length;
        const totalMinutes = filtered.reduce((sum, b) => {
            const svc = services.find(s => s.id === b.serviceId);
            return sum + (svc ? svc.durationMinutes : 0);
        }, 0);
        return { totalCount, totalMinutes };
    };

    // Inventory management
    const addInventoryItem = (item) => {
        const newItem = {
            ...item,
            id: `inv-${Date.now()}`
        };
        setInventory([...inventory, newItem]);
        return newItem;
    };

    const updateInventoryItem = (id, updates) => {
        setInventory(inventory.map(i => i.id === id ? { ...i, ...updates } : i));
    };

    const deleteInventoryItem = (id) => {
        setInventory(inventory.filter(i => i.id !== id));
    };

    const value = {
        branches: branches,
        selectedBranchId: selectedBranchId,
        setSelectedBranchId: setSelectedBranchId,
        selectedBranch: selectedBranch,

        services: services,
        addService: addService,
        updateService: updateService,
        deleteService: deleteService,

        therapists: therapists,

        bookings: bookings,
        branchBookings: branchBookings,
        addBooking: addBooking,
        updateBooking: updateBooking,
        deleteBooking: deleteBooking,

        inventory: inventory,
        addInventoryItem: addInventoryItem,
        updateInventoryItem: updateInventoryItem,
        deleteInventoryItem: deleteInventoryItem,

        therapistStatuses: therapistStatuses,
        setTherapistStatus: setTherapistStatus,
        getTherapistStatus: getTherapistStatus,
        startService: startService,
        finishService: finishService,
        getServiceRemainingMinutes: getServiceRemainingMinutes,
        getDailyServiceTotals: getDailyServiceTotals
    };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
