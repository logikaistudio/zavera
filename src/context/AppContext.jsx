import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import {
    initialBranches,
    initialServices,
    initialTherapists,
    sampleBookings,
    initialInventory
} from '../data/initialData';
import { readData, writeData } from '../utils/storageSync';
import { loginUser, getAllRoles } from '../utils/userAuth';

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

    const [currentUser, setCurrentUser] = useState(() => {
        const saved = localStorage.getItem('spacity_current_user');
        return saved ? JSON.parse(saved) : null;
    });

    const login = async (username, password) => {
        const user = await loginUser(username, password);
        if (user) {
            setIsAuthenticated(true);
            setCurrentUser(user);
            localStorage.setItem('spacity_auth', 'true');
            localStorage.setItem('spacity_current_user', JSON.stringify(user));
            return true;
        }
        return false;
    };

    const logout = () => {
        setIsAuthenticated(false);
        setCurrentUser(null);
        localStorage.removeItem('spacity_auth');
        localStorage.removeItem('spacity_current_user');
    };

    const [roles, setRoles] = useState([]);

    useEffect(() => {
        const fetchRoles = async () => {
            const data = await getAllRoles();
            setRoles(data);
        };
        if (isAuthenticated) {
            fetchRoles();
        }
    }, [isAuthenticated]);

    const hasPermission = (permission) => {
        if (!currentUser) return false;
        // superadmin and superuser have full unrestricted access
        if (currentUser.role === 'superadmin' || currentUser.role === 'superuser') return true;
        const userRole = (roles || []).find(r => r.name === currentUser.role);
        if (!userRole) return false;
        return userRole.permissions?.includes(permission);
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




    const [logo, setLogo] = useState(() => {
        return localStorage.getItem('zavera_logo') || null;
    });

    const [systemSettings, setSystemSettings] = useState(() => {
        const saved = localStorage.getItem('spacity_system_settings');
        return saved ? JSON.parse(saved) : { maxBranches: 6, maxTherapists: 50 };
    });

    const [approvals, setApprovals] = useState(() => {
        const saved = localStorage.getItem('spacity_approvals');
        return saved ? JSON.parse(saved) : [];
    });

    const [customers, setCustomers] = useState(() => {
        const saved = localStorage.getItem('spacity_customers');
        return saved ? JSON.parse(saved) : [];
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
                    dbSystemSettings,
                    dbApprovals,
                    dbLogo,
                    dbCustomers
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
                    readData('systemSettings'),
                    readData('approvals'),
                    readData('logo'),
                    readData('customers')
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
                if (dbSystemSettings) setSystemSettings(dbSystemSettings);
                if (dbApprovals) setApprovals(dbApprovals);
                if (dbLogo) setLogo(dbLogo);
                if (dbCustomers) setCustomers(dbCustomers);
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
        if (isInitialized) writeData('systemSettings', systemSettings);
    }, [systemSettings, isInitialized]);

    useEffect(() => {
        if (isInitialized) writeData('approvals', approvals);
    }, [approvals, isInitialized]);

    useEffect(() => {
        if (isInitialized) writeData('logo', logo);
    }, [logo, isInitialized]);

    useEffect(() => {
        if (isInitialized) writeData('customers', customers);
    }, [customers, isInitialized]);

    // Get current branch
    const selectedBranch = useMemo(() => {
        return (branches || []).find(b => b.id === selectedBranchId);
    }, [branches, selectedBranchId]);

    // Filter bookings by selected branch
    const branchBookings = useMemo(() => {
        return (bookings || []).filter(b => b.branchId === selectedBranchId);
    }, [bookings, selectedBranchId]);

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

    // Customer database management & sync
    useEffect(() => {
        if (isInitialized && (customers || []).length === 0 && bookings && bookings.length > 0) {
            const uniqueCustomers = [];
            bookings.forEach(b => {
                if (b.customerName) {
                    const cleanedName = b.customerName.trim();
                    const cleanedPhone = (b.customerPhone || '').trim();
                    const cleanedAddress = (b.address || '').trim();
                    const cleanedNotes = (b.notes || '').trim();

                    const exists = uniqueCustomers.some(c => 
                        (cleanedPhone && c.phone === cleanedPhone) || 
                        (!cleanedPhone && c.name.toLowerCase() === cleanedName.toLowerCase())
                    );
                    if (!exists) {
                        uniqueCustomers.push({
                            id: `cust-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                            name: cleanedName,
                            phone: cleanedPhone,
                            address: cleanedAddress,
                            notes: cleanedNotes,
                            createdAt: b.createdAt || new Date().toISOString()
                        });
                    }
                }
            });
            if (uniqueCustomers.length > 0) {
                setCustomers(uniqueCustomers);
            }
        }
    }, [isInitialized, bookings]);

    const syncCustomerFromBooking = (bookingData) => {
        if (!bookingData.customerName) return;
        const cleanedName = bookingData.customerName.trim();
        const cleanedPhone = (bookingData.customerPhone || '').trim();
        const cleanedAddress = (bookingData.address || '').trim();
        const cleanedNotes = (bookingData.notes || '').trim();

        setCustomers(prev => {
            const list = prev || [];
            let matchIndex = -1;
            if (cleanedPhone) {
                matchIndex = list.findIndex(c => c.phone === cleanedPhone);
            } else {
                matchIndex = list.findIndex(c => c.name.toLowerCase() === cleanedName.toLowerCase());
            }

            const updated = [...list];
            if (matchIndex !== -1) {
                updated[matchIndex] = {
                    ...updated[matchIndex],
                    name: cleanedName,
                    phone: cleanedPhone || updated[matchIndex].phone,
                    address: cleanedAddress || updated[matchIndex].address,
                    notes: cleanedNotes || updated[matchIndex].notes
                };
            } else {
                updated.push({
                    id: `cust-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    name: cleanedName,
                    phone: cleanedPhone,
                    address: cleanedAddress,
                    notes: cleanedNotes,
                    createdAt: new Date().toISOString()
                });
            }
            return updated;
        });
    };

    const addCustomer = (customer) => {
        const newCustomer = {
            ...customer,
            id: `cust-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            createdAt: new Date().toISOString()
        };
        setCustomers(prev => [...(prev || []), newCustomer]);
        return newCustomer;
    };

    const updateCustomer = (id, updates) => {
        setCustomers(prev => (prev || []).map(c => c.id === id ? { ...c, ...updates } : c));
    };

    const deleteCustomer = (id) => {
        setCustomers(prev => (prev || []).filter(c => c.id !== id));
    };

    // Booking management
    const addBooking = (booking) => {
        const newBooking = {
            ...booking,
            id: `bk-${Date.now()}`,
            branchId: selectedBranchId
        };
        setBookings([...bookings, newBooking]);
        syncCustomerFromBooking(newBooking);
        return newBooking;
    };

    const updateBooking = (id, updates) => {
        setBookings(bookings.map(b => b.id === id ? { ...b, ...updates } : b));
        const currentBooking = bookings.find(b => b.id === id);
        if (currentBooking) {
            syncCustomerFromBooking({ ...currentBooking, ...updates });
        }
    };

    const deleteBooking = (idOrIds) => {
        const idsToDelete = Array.isArray(idOrIds) ? idOrIds : [idOrIds];
        
        // Find bookings we are about to delete
        const bookingsToDelete = (bookings || []).filter(b => idsToDelete.includes(b.id));

        // Filter bookings
        setBookings(prev => prev.filter(b => !idsToDelete.includes(b.id)));
        
        // Find associated rekaps to delete
        const rekapsToDelete = (rekaps || []).filter(r => idsToDelete.includes(r.bookingId));
        const rekapIdsToDelete = rekapsToDelete.map(r => r.id);
        
        if (rekapIdsToDelete.length > 0) {
            // Filter rekaps
            setRekaps(prev => prev.filter(r => !rekapIdsToDelete.includes(r.id)));
            // Filter pembukuan
            setPembukuan(prev => prev.filter(p => !rekapIdsToDelete.includes(p.rekapId)));
        }

        // Reset therapist statuses if their in-service booking was deleted
        let updatedStatuses = [...(therapistStatuses || [])];
        let statusesChanged = false;
        bookingsToDelete.forEach(b => {
            if (b.status === 'in-service') {
                const otherInService = (bookings || []).some(x => 
                    x.id !== b.id && 
                    !idsToDelete.includes(x.id) &&
                    x.therapistId === b.therapistId && 
                    x.date === b.date && 
                    x.status === 'in-service'
                );
                if (!otherInService) {
                    const existingIndex = updatedStatuses.findIndex(s => s.therapistId === b.therapistId && s.branchId === selectedBranchId && s.date === b.date);
                    if (existingIndex !== -1) {
                        updatedStatuses[existingIndex] = { ...updatedStatuses[existingIndex], status: 'on-duty' };
                        statusesChanged = true;
                    }
                }
            }
        });
        if (statusesChanged) {
            setTherapistStatuses(updatedStatuses);
        }
    };

    // Therapist status management (on-duty, off-duty, in-service)
    const setTherapistStatus = (therapistId, status, date = new Date().toISOString().split('T')[0], note = '', startTime = '09:00', endTime = '17:00') => {
        const existingIndex = therapistStatuses.findIndex(s => s.therapistId === therapistId && s.branchId === selectedBranchId && s.date === date);
        if (existingIndex !== -1) {
            const updated = [...therapistStatuses];
            updated[existingIndex] = { ...updated[existingIndex], status, note, startTime, endTime };
            setTherapistStatuses(updated);
            return updated[existingIndex];
        }

        const newStatus = {
            id: `ts-${Date.now()}`,
            branchId: selectedBranchId,
            therapistId,
            date,
            status,
            note,
            startTime,
            endTime
        };
        setTherapistStatuses([...therapistStatuses, newStatus]);
        return newStatus;
    };

    const getTherapistStatus = (therapistId, date = new Date().toISOString().split('T')[0]) => {
        return therapistStatuses.find(s => s.therapistId === therapistId && s.branchId === selectedBranchId && s.date === date) || null;
    };

    const bulkSetTherapistStatuses = (entries) => {
        setTherapistStatuses(prev => {
            const updated = [...prev];
            entries.forEach((entry, idx) => {
                const existingIndex = updated.findIndex(s => s.therapistId === entry.therapistId && s.branchId === selectedBranchId && s.date === entry.date);
                if (existingIndex !== -1) {
                    updated[existingIndex] = {
                        ...updated[existingIndex],
                        status: entry.status,
                        startTime: entry.startTime || '09:00',
                        endTime: entry.endTime || '17:00',
                        note: entry.note || ''
                    };
                } else {
                    updated.push({
                        id: `ts-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 9)}`,
                        branchId: selectedBranchId,
                        therapistId: entry.therapistId,
                        date: entry.date,
                        status: entry.status,
                        note: entry.note || '',
                        startTime: entry.startTime || '09:00',
                        endTime: entry.endTime || '17:00'
                    });
                }
            });
            return updated;
        });
    };

    // Service timing helpers: mark start and finish on bookings and update therapist status
    const startService = (bookingId) => {
        const now = new Date().toISOString();
        setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'in-service', serviceStartTime: now } : b));
        const b = bookings.find(x => x.id === bookingId);
        if (b) setTherapistStatus(b.therapistId, 'in-service', b.date);
    };

    const finishService = (bookingId) => {
        const now = new Date().toISOString();
        setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'completed', serviceEndTime: now } : b));
        const b = bookings.find(x => x.id === bookingId);
        if (b) {
            setTherapistStatus(b.therapistId, 'on-duty', b.date);
            const therapist = therapists.find(t => t.id === b.therapistId);
            const bookedServices = services.filter(s => (b.serviceIds || [b.serviceId]).includes(s.id));
            
            if (bookedServices.length > 0 && therapist) {
                // Create a rekap for each service in the booking, or group them
                // Here we create one rekap per service so incentives are calculated individually
                const newRekaps = bookedServices.map((svc, index) => ({
                    id: `rk-${Date.now()}-${index}`,
                    bookingId: bookingId,
                    therapistId: therapist.id,
                    therapistName: therapist.name,
                    minutes: svc.durationMinutes || 0,
                    amount: svc.price || 0,
                    serviceIds: [svc.id],
                    status: 'unpaid',
                    createdAt: now
                }));
                setRekaps(prev => [...newRekaps, ...prev]);
            }
        }
    };

    const getServiceRemainingMinutes = (booking) => {
        if (!booking || !booking.serviceStartTime) return null;
        const bookedServices = services.filter(s => (booking.serviceIds || [booking.serviceId]).includes(s.id));
        if (bookedServices.length === 0) return null;
        
        const totalDuration = booking.durationMinutes || bookedServices.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
        
        const start = new Date(booking.serviceStartTime);
        const elapsed = (Date.now() - start.getTime()) / 60000; // minutes
        const remaining = Math.max(0, totalDuration - Math.floor(elapsed));
        return remaining;
    };

    const getDailyServiceTotals = (date = new Date().toISOString().split('T')[0], therapistId = null) => {
        const filtered = bookings.filter(b => b.date === date && (therapistId ? b.therapistId === therapistId : true) && (b.status === 'completed' || b.status === 'in-service'));
        const totalCount = filtered.length;
        const totalMinutes = filtered.reduce((sum, b) => {
            const bookedServices = services.filter(s => (b.serviceIds || [b.serviceId]).includes(s.id));
            const duration = b.durationMinutes || bookedServices.reduce((sSum, s) => sSum + (s.durationMinutes || 0), 0);
            return sum + duration;
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

    // Therapist management
    const addTherapist = (therapistData) => {
        const newTherapist = {
            ...therapistData,
            id: `th-${Date.now()}`
        };
        setTherapists([...therapists, newTherapist]);
    };

    const updateTherapist = (id, updates) => {
        setTherapists(therapists.map(t => t.id === id ? { ...t, ...updates } : t));
    };

    const deleteTherapist = (id) => {
        setTherapists(therapists.filter(t => t.id !== id));
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

    // Approvals management
    const addApproval = (approvalData) => {
        const newApproval = {
            ...approvalData,
            id: `appr-${Date.now()}`
        };
        setApprovals(prev => [newApproval, ...prev]);
        return newApproval;
    };

    const updateApproval = (id, updates) => {
        setApprovals(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
    };

    const value = {
        branches: branches || [],
        addBranch: addBranch,
        updateBranch: updateBranch,
        deleteBranch: deleteBranch,
        selectedBranchId: selectedBranchId,
        setSelectedBranchId: setSelectedBranchId,
        selectedBranch: selectedBranch,

        services: services || [],
        addService: addService,
        updateService: updateService,
        deleteService: deleteService,

        therapists: therapists || [],
        setTherapists: setTherapists,
        addTherapist: addTherapist,
        updateTherapist: updateTherapist,
        deleteTherapist: deleteTherapist,

        bookings: bookings || [],
        branchBookings: branchBookings || [],
        addBooking: addBooking,
        updateBooking: updateBooking,
        deleteBooking: deleteBooking,

        inventory: inventory || [],
        addInventoryItem: addInventoryItem,
        updateInventoryItem: updateInventoryItem,
        deleteInventoryItem: deleteInventoryItem,

        therapistStatuses: therapistStatuses || [],
        setTherapistStatus: setTherapistStatus,
        getTherapistStatus: getTherapistStatus,
        bulkSetTherapistStatuses: bulkSetTherapistStatuses,
        startService: startService,
        finishService: finishService,
        getServiceRemainingMinutes: getServiceRemainingMinutes,
        getDailyServiceTotals: getDailyServiceTotals,

        rekaps: rekaps || [],
        setRekaps: setRekaps,
        pembukuan: pembukuan || [],
        setPembukuan: setPembukuan,
        expenses: expenses || [],
        setExpenses: setExpenses,
        systemSettings: systemSettings,
        updateSystemSettings: (newSettings) => setSystemSettings(prev => ({ ...prev, ...newSettings })),
        isInitialized: isInitialized,

        isAuthenticated: isAuthenticated,
        currentUser: currentUser,
        roles: roles || [],
        fetchRoles: async () => setRoles(await getAllRoles()),
        hasPermission: hasPermission,
        login: login,
        logout: logout,

        approvals: approvals || [],
        addApproval: addApproval,
        updateApproval: updateApproval,
        logo: logo,
        setLogo: setLogo,
        customers: customers || [],
        addCustomer: addCustomer,
        updateCustomer: updateCustomer,
        deleteCustomer: deleteCustomer
    };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
