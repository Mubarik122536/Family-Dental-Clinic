import { useState, useEffect } from 'react';
import Header from '../components/Header';
import { useAuth } from '../context/AuthContext';
import { getSettings, updateSettings, updateProfile, changePassword } from '../services/api';

export default function Settings() {
    const { user, refreshUser } = useAuth();
    const [activeTab, setActiveTab] = useState('clinic');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState('');

    // Clinic Settings State
    const [clinicName, setClinicName] = useState('');
    const [clinicEmail, setClinicEmail] = useState('');
    const [clinicPhone, setClinicPhone] = useState('');
    const [clinicAddress, setClinicAddress] = useState('');
    const [currency, setCurrency] = useState('USD');
    const [timeZone, setTimeZone] = useState('Africa/Nairobi');
    const [language, setLanguage] = useState('English');
    const [appointmentDuration, setAppointmentDuration] = useState('30');
    const [workingHoursStart, setWorkingHoursStart] = useState('08:00');
    const [workingHoursEnd, setWorkingHoursEnd] = useState('18:00');
    const [emailNotifications, setEmailNotifications] = useState(true);
    const [smsReminders, setSmsReminders] = useState(true);
    const [appointmentReminder, setAppointmentReminder] = useState(true);
    const [paymentAlerts, setPaymentAlerts] = useState(false);

    // Profile fields
    const [profileName, setProfileName] = useState(user?.name || '');
    
    // Security fields
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const tabs = [
        { key: 'clinic', label: 'Clinic Info', icon: 'business' },
        { key: 'profile', label: 'My Profile', icon: 'account_circle' },
        { key: 'schedule', label: 'Schedule', icon: 'schedule' },
        { key: 'notifications', label: 'Notifications', icon: 'notifications' },
        { key: 'security', label: 'Security', icon: 'shield' },
    ];

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const data = await getSettings();
            setClinicName(data.name || '');
            setClinicEmail(data.email || '');
            setClinicPhone(data.phone || '');
            setClinicAddress(data.address || '');
            setCurrency(data.currency || 'USD');
            setTimeZone(data.timezone || 'Africa/Nairobi');
            setLanguage(data.language || 'English');
            setAppointmentDuration(String(data.appointment_duration || 30));
            setWorkingHoursStart(data.working_hours_start || '08:00');
            setWorkingHoursEnd(data.working_hours_end || '18:00');
            setEmailNotifications(Boolean(data.email_notifications));
            setSmsReminders(Boolean(data.sms_reminders));
            setAppointmentReminder(Boolean(data.appointment_reminder));
            setPaymentAlerts(Boolean(data.payment_alerts));
        } catch (err) {
            setError('Failed to load clinic settings.');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        setError('');
        try {
            if (activeTab === 'profile') {
                await updateProfile({ name: profileName });
                await refreshUser();
            } else if (activeTab === 'clinic' || activeTab === 'schedule' || activeTab === 'notifications') {
                await updateSettings({
                    name: clinicName,
                    email: clinicEmail,
                    phone: clinicPhone,
                    address: clinicAddress,
                    currency,
                    timezone: timeZone,
                    language,
                    appointment_duration: parseInt(appointmentDuration),
                    working_hours_start: workingHoursStart,
                    working_hours_end: workingHoursEnd,
                    email_notifications: emailNotifications ? 1 : 0,
                    sms_reminders: smsReminders ? 1 : 0,
                    appointment_reminder: appointmentReminder ? 1 : 0,
                    payment_alerts: paymentAlerts ? 1 : 0
                });
            }
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (err) {
            setError(err.message || 'Failed to save changes.');
        } finally {
            setSaving(false);
        }
    };

    const handleUpdatePassword = async () => {
        if (newPassword !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }
        if (newPassword.length < 8) {
            setError('Password must be at least 8 characters long.');
            return;
        }
        if (!/\d/.test(newPassword)) {
            setError('Password must contain at least one number.');
            return;
        }
        setSaving(true);
        setError('');
        try {
            await changePassword({ currentPassword, newPassword });
            setSaved(true);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setTimeout(() => setSaved(false), 3000);
        } catch (err) {
            setError(err.message || 'Failed to update password.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
        <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
        </div>
    );

    return (
        <>
            <Header title="Settings">
                {activeTab !== 'security' && (
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="bg-primary hover:bg-primary-700 disabled:opacity-50 text-white px-5 py-2 rounded-lg flex items-center gap-2 text-sm font-bold shadow-lg shadow-primary/20 transition-all"
                    >
                        <span className="material-symbols-outlined text-[18px]">
                            {saving ? 'sync' : 'save'}
                        </span>
                        {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                )}
            </Header>

            <div className="p-4 md:p-8 flex-1 overflow-y-auto">
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-8">
                {/* Sidebar Tabs */}
                <div className="w-full md:w-56 shrink-0">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden transition-colors">
                        {tabs.map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => { setActiveTab(tab.key); setError(''); }}
                                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all border-l-4 ${activeTab === tab.key
                                    ? 'border-primary bg-primary/5 dark:bg-primary/10 text-primary font-semibold'
                                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:text-slate-700 dark:hover:text-slate-200'
                                    }`}
                            >
                                <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1">
                    {error && (
                        <div className="mb-4 p-4 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-xl text-red-600 dark:text-red-400 text-sm font-medium flex items-center gap-2">
                            <span className="material-symbols-outlined text-[18px]">error</span>
                            {error}
                        </div>
                    )}

                    {/* My Profile */}
                    {activeTab === 'profile' && (
                        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 p-6 space-y-5">
                            <div>
                                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-1">My Profile</h3>
                                <p className="text-xs text-slate-400 dark:text-slate-500">Update your basic profile information.</p>
                            </div>
                            <div className="flex items-center gap-5 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-600">
                                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold text-xl">
                                    {user?.name?.charAt(0) || 'U'}
                                </div>
                                <div>
                                    <p className="text-base font-bold text-slate-800 dark:text-slate-100">{user?.name}</p>
                                    <p className="text-sm text-slate-400 dark:text-slate-500 capitalize">{user?.role}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1.5">Display Name</label>
                                    <input value={profileName} onChange={e => setProfileName(e.target.value)} className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary" placeholder="Your full name" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-400 dark:text-slate-500 block mb-1.5">Email Address (Read-only)</label>
                                    <input disabled value={user?.email} className="w-full px-3 py-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-400 cursor-not-allowed" />
                                </div>
                            </div>
                        </div>
                    )}
                    {/* Clinic Info */}
                    {activeTab === 'clinic' && (
                        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 p-6 space-y-6">
                            <div>
                                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-1">Clinic Information</h3>
                                <p className="text-xs text-slate-400 dark:text-slate-500">Update your clinic's basic details and branding.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1.5">Clinic Name</label>
                                    <input value={clinicName} onChange={e => setClinicName(e.target.value)} className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1.5">Email Address</label>
                                    <input value={clinicEmail} onChange={e => setClinicEmail(e.target.value)} className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1.5">Phone Number</label>
                                    <input value={clinicPhone} onChange={e => setClinicPhone(e.target.value)} className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1.5">Currency</label>
                                    <select value={currency} onChange={e => setCurrency(e.target.value)} className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary">
                                        <option value="USD">USD ($)</option>
                                        <option value="EUR">EUR (€)</option>
                                        <option value="GBP">GBP (£)</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1.5">Address</label>
                                <input value={clinicAddress} onChange={e => setClinicAddress(e.target.value)} className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1.5">Time Zone</label>
                                    <select value={timeZone} onChange={e => setTimeZone(e.target.value)} className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary">
                                        <option value="Africa/Nairobi">East Africa Time (EAT)</option>
                                        <option value="UTC">Coordinated Universal Time (UTC)</option>
                                        <option value="America/New_York">Eastern Time (ET)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1.5">Language</label>
                                    <select value={language} onChange={e => setLanguage(e.target.value)} className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary">
                                        <option value="English">English</option>
                                        <option value="Spanish">Spanish</option>
                                        <option value="Somali">Somali</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Schedule */}
                    {activeTab === 'schedule' && (
                        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 p-6 space-y-6">
                            <div>
                                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-1">Schedule Settings</h3>
                                <p className="text-xs text-slate-400 dark:text-slate-500">Configure appointment durations and working hours.</p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1.5">Default Appointment Duration</label>
                                    <select value={appointmentDuration} onChange={e => setAppointmentDuration(e.target.value)} className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary">
                                        <option value="15">15 minutes</option>
                                        <option value="30">30 minutes</option>
                                        <option value="45">45 minutes</option>
                                        <option value="60">60 minutes</option>
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1.5">Working Hours Start</label>
                                        <input type="time" value={workingHoursStart} onChange={e => setWorkingHoursStart(e.target.value)} className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1.5">Working Hours End</label>
                                        <input type="time" value={workingHoursEnd} onChange={e => setWorkingHoursEnd(e.target.value)} className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Notifications */}
                    {activeTab === 'notifications' && (
                        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 p-6 space-y-6">
                            <div>
                                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-1">Notification Preferences</h3>
                                <p className="text-xs text-slate-400 dark:text-slate-500">Choose how you want to be notified about clinic activity.</p>
                            </div>
                            <div className="space-y-4">
                                {[
                                    { id: 'en', label: 'Email Notifications', desc: 'Receive email updates about clinic activity', value: emailNotifications, setter: setEmailNotifications },
                                    { id: 'sms', label: 'SMS Reminders', desc: 'Send SMS appointment reminders to patients', value: smsReminders, setter: setSmsReminders },
                                    { id: 'appt', label: 'Appointment Reminders', desc: 'Get notified before each appointment', value: appointmentReminder, setter: setAppointmentReminder },
                                    { id: 'pay', label: 'Payment Alerts', desc: 'Receive alerts for overdue payments', value: paymentAlerts, setter: setPaymentAlerts },
                                ].map((item) => (
                                    <div key={item.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700">
                                        <div>
                                            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{item.label}</p>
                                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{item.desc}</p>
                                        </div>
                                        <button
                                            onClick={() => item.setter(!item.value)}
                                            className={`w-11 h-6 rounded-full transition-all relative ${item.value ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-600'}`}
                                        >
                                            <div className={`w-5 h-5 bg-white rounded-full shadow-sm absolute top-0.5 transition-all ${item.value ? 'left-[22px]' : 'left-0.5'}`}></div>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Security */}
                    {activeTab === 'security' && (
                        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 p-6 space-y-6">
                            <div>
                                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-1">Security Settings</h3>
                                <p className="text-xs text-slate-400 dark:text-slate-500">Manage your password and account security.</p>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1.5">Current Password</label>
                                    <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="••••••••" className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1.5">New Password</label>
                                        <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="••••••••" className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                                        <p className="text-[10px] text-slate-400 mt-1">Min. 8 characters and at least one number.</p>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1.5">Confirm New Password</label>
                                        <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                                    </div>
                                </div>
                                <button
                                    onClick={handleUpdatePassword}
                                    disabled={saving || !newPassword}
                                    className="px-5 py-2.5 bg-primary disabled:opacity-50 text-white rounded-lg text-sm font-bold hover:bg-primary-700 transition-colors flex items-center gap-2"
                                >
                                    {saving && <span className="animate-spin text-[16px]">sync</span>}
                                    {saving ? 'Updating...' : 'Update Password'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>

            {/* Success toast */}
            {saved && (
                <div className="fixed bottom-6 right-6 bg-emerald-500 text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 text-sm font-semibold animate-bounce z-50">
                    <span className="material-symbols-outlined text-[18px]">check_circle</span>
                    Settings saved successfully!
                </div>
            )}
        </>
    );
}
