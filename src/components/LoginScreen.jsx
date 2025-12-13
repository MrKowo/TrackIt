import React, { useState } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInAnonymously 
} from 'firebase/auth';
import { auth } from '../lib/firebase'; // Importing from our new firebase file
import { Activity, Loader2 } from 'lucide-react';

export const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      try {
        // Try to sign in
        await signInWithEmailAndPassword(auth, email, password);
      } catch (loginErr) {
        // If user not found, try to sign up (Auto-creation logic you had)
        if (loginErr.code === 'auth/user-not-found' || loginErr.code === 'auth/invalid-credential') {
            await createUserWithEmailAndPassword(auth, email, password);
        } else {
            throw loginErr;
        }
      }
    } catch (err) {
      console.error(err);
      setError(err.message.replace('Firebase:', '').trim());
      setLoading(false);
    }
  };

  const handleGuest = async () => {
    setLoading(true);
    try {
      await signInAnonymously(auth);
    } catch (err) {
      console.error(err);
      setError("Could not sign in as guest.");
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-zinc-50 dark:bg-zinc-900">
        <div className="rounded-2xl shadow-2xl p-8 w-full max-w-md border bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700">
            <div className="text-center mb-8">
                <div className="bg-blue-600 w-16 h-16 rounded-2xl mx-auto flex items-center justify-center mb-6 shadow-lg shadow-blue-600/30">
                    <Activity className="text-white w-8 h-8" />
                </div>
                <h2 className="text-3xl font-bold mb-2 text-zinc-900 dark:text-white">TrackIt</h2>
                <p className="text-zinc-500 dark:text-zinc-400">Sign in to sync your progress</p>
            </div>
            
            <form onSubmit={handleAuth} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Email</label>
                    <input 
                        type="email" 
                        required 
                        className="w-full px-4 py-3 rounded-xl outline-none transition-all focus:ring-2 focus:ring-blue-500 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 dark:text-white"
                        value={email} 
                        onChange={(e) => setEmail(e.target.value)} 
                        placeholder="hello@example.com" 
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Password</label>
                    <input 
                        type="password" 
                        required 
                        className="w-full px-4 py-3 rounded-xl outline-none transition-all focus:ring-2 focus:ring-blue-500 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 dark:text-white"
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)} 
                        placeholder="••••••••" 
                    />
                </div>
                
                {error && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg text-sm">
                        {error}
                    </div>
                )}
                
                <button 
                    type="submit" 
                    disabled={loading} 
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium shadow-lg shadow-blue-600/20 transition-all transform active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center"
                >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Continue'}
                </button>
            </form>
            
            <div className="mt-8 text-center">
                <button 
                    type="button" 
                    onClick={handleGuest} 
                    disabled={loading} 
                    className="w-full py-3 mt-4 border-2 border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all"
                >
                    Or continue as Guest
                </button>
            </div>
        </div>
    </div>
  );
};