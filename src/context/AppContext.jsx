import React, { createContext, useContext, useState, useEffect } from 'react';
import {
    initialBranches,
    initialServices,
    initialTherapists,
    sampleBookings,
    initialInventory
} from '../data/initialData';
import { readData, writeData } from '../utils/storageSync';

const AppContext = createContext();

export const useAppContext = () => {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useAppContext must be used within AppProvider');
    }
    return context;
};

export const AppProvider = ({ children }) => {
    const [isInitialized, setIsInitialized] = useState(false);

    // Authentication state
    const [isAuthenticated, setIsAuthenticated] = useState(() => {
        return localStorage.getItem('spacity_auth') === 'true';
    });

    const login = (username, password) => {
        if (username === 'superuser' && password === 'password123') {
            setIsAuthenticated(true);
            localStorage.setItem('spacity_auth', 'true');
            return true;
        }
        return false;
    };

    const logout = () => {
        setIsAuthenticated(false);
        localStorage.removeItem('spacity_auth');
    };

    // Load from localStorage or use initial data
    const [branches, setBranches] = useState(() => {
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

    const [therapists, setTherapists] = useState(() => {
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

    const [rekaps, setRekaps] = useState(() => {
        const saved = localStorage.getItem('spacity_rekaps');
        return saved ? JSON.parse(saved) : [];
    });

    const [pembukuan, setPembukuan] = useState(() => {
        const saved = localStorage.getItem('spacity_pembukuan');
        return saved ? JSON.parse(saved) : [];
    });

    const [expenses, setExpenses] = useState(() => {
        const saved = localStorage.getItem('spacity_expenses');
        return saved ? JSON.parse(saved) : [];
    });

    const [slotStatuses, setSlotStatuses] = useState(() => {
        const saved = localStorage.getItem('spacity_slot_statuses');
        return saved ? JSON.parse(saved) : {};
    });

    const [selectedSlots, setSelectedSlots] = useState(() => {
        const saved = localStorage.getItem('spacity_selected_slots');
        return saved ? JSON.parse(saved) : {};
    });

    const [manualCompletedMinutes, setManualCompletedMinutes] = useState(() => {
        const saved = localStorage.getItem('spacity_manual_completed_minutes');
        return saved ? JSON.parse(saved) : {};
    });

    // Load all data from Supabase asynchronously on mount
    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const [
                    dbBranches,
                    dbSelectedBranchId,
                    dbServices,
                    dbTherapists,
                    dbBookings,
                    dbInventory,
                    dbTherapistStatuses,
                    dbRekaps,
                    dbPembukuan,
                    dbExpenses,
                    dbSlotStatuses,
                    dbSelectedSlots,
                    dbManualCompletedMinutes
                ] = await Promise.all([
                    readData('branches'),
                    readData('selectedBranch'),
                    readData('services'),
                    readData('therapists'),
                    readData('bookings'),
                    readData('inventory'),
                    readData('therapistStatuses'),
                    readData('rekaps'),
                    readData('pembukuan'),
                    readData('expenses'),
                    readData('slotStatuses'),
                    readData('selectedSlots'),
                    readData('manualCompletedMinutes')
                ]);

                if (dbBranches) setBranches(dbBranches);
                if (dbSelectedBranchId) setSelectedBranchId(dbSelectedBranchId);
                if (dbServices) setServices(dbServices);
                if (dbTherapists) setTherapists(dbTherapists);
                if (dbBookings) setBookings(dbBookings);
                if (dbInventory) setInventory(dbInventory);
                if (dbTherapistStatuses) setTherapistStatuses(dbTherapistStatuses);
                if (dbRekaps) setRekaps(dbRekaps);
                if (dbPembukuan) setPembukuan(dbPembukuan);
                if (dbExpenses) setExpenses(dbExpenses);
                if (dbSlotStatuses) setSlotStatuses(dbSlotStatuses);
                if (dbSelectedSlots) setSelectedSlots(dbSelectedSlots);
                if (dbManualCompletedMinutes) setManualCompletedMinutes(dbManualCompletedMinutes);
            } catch (error) {
                console.error('Error loading initial data from Supabase:', error);
            } finally {
                setIsInitialized(true);
            }
        };

        loadInitialData();
    }, []);

    // Save to localStorage AND Supabase whenever data changes (only after initialized)
    useEffect(() => {
        if (isInitialized) writeData('branches', branches);
    }, [branches, isInitialized]);

    useEffect(() => {
        if (isInitialized) writeData('selectedBranch', selectedBranchId);
    }, [selectedBranchId, isInitialized]);

    useEffect(() => {
        if (isInitialized) writeData('services', services);
    }, [services, isInitialized]);

    useEffect(() => {
        if (isInitialized) writeData('therapists', therapists);
    }, [therapists, isInitialized]);

    useEffect(() => {
        if (isInitialized) writeData('bookings', bookings);
    }, [bookings, isInitialized]);

    useEffect(() => {
        if (isInitialized) writeData('inventory', inventory);
    }, [inventory, isInitialized]);

    useEffect(() => {
        if (isInitialized) writeData('therapistStatuses', therapistStatuses);
    }, [therapistStatuses, isInitialized]);

    useEffect(() => {
        if (isInitialized) writeData('rekaps', rekaps);
    }, [rekaps, isInitialized]);

    useEffect(() => {
        if (isInitialized) writeData('pembukuan', pembukuan);
    }, [pembukuan, isInitialized]);

    useEffect(() => {
        if (isInitialized) writeData('expenses', expenses);
    }, [expenses, isInitialized]);

    useEffect(() => {
        if (isInitialized) writeData('slotStatuses', slotStatuses);
    }, [slotStatuses, isInitialized]);

    useEffect(() => {
        if (isInitialized) writeData('selectedSlots', selectedSlots);
    }, [selectedSlots, isInitialized]);

    useEffect(() => {
        if (isInitialized) writeData('manualCompletedMinutes', manualCompletedMinutes);
    }, [manualCompletedMinutes, isInitialized]);

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

    // Branch management
    const addBranch = (branchData) => {
        const newBranch = {
            ...branchData,
            id: `br-${Date.now()}`,
            isActive: true
        };
        setBranches([...branches, newBranch]);
    };

    const updateBranch = (id, updates) => {
        setBranches(branches.map(b => b.id === id ? { ...b, ...updates } : b));
    };

    const deleteBranch = (id) => {
        if (branches.length > 1) {
            setBranches(branches.filter(b => b.id !== id));
            if (selectedBranchId === id) {
                setSelectedBranchId(branches.find(b => b.id !== id)?.id);
            }
        }
    };

    const value = {
        branches: branches,
        addBranch: addBranch,
        updateBranch: updateBranch,
        deleteBranch: deleteBranch,
        selectedBranchId: selectedBranchId,
        setSelectedBranchId: setSelectedBranchId,
        selectedBranch: selectedBranch,

        services: services,
        addService: addService,
        updateService: updateService,
        deleteService: deleteService,

        therapists: therapists,
        setTherapists: setTherapists,

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
        getDailyServiceTotals: getDailyServiceTotals,

        rekaps: rekaps,
        setRekaps: setRekaps,
        pembukuan: pembukuan,
        setPembukuan: setPembukuan,
        expenses: expenses,
        setExpenses: setExpenses,
        slotStatuses: slotStatuses,
        setSlotStatuses: setSlotStatuses,
        selectedSlots: selectedSlots,
        setSelectedSlots: setSelectedSlots,
        manualCompletedMinutes: manualCompletedMinutes,
        setManualCompletedMinutes: setManualCompletedMinutes,
        isInitialized: isInitialized,

        isAuthenticated: isAuthenticated,
        login: login,
        logout: logout
    };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
