import { Head, useForm, Link } from '@inertiajs/react';
import { useState } from 'react';

export default function ForgotPassword({ status }) {
    const { data, setData, post, processing, errors } = useForm({
        email: '',
    });

    const [emailSent, setEmailSent] = useState(false);

    const submit = (e) => {
        e.preventDefault();
        post(route('password.email'), {
            onSuccess: () => setEmailSent(true),
        });
    };

    return (
        <>
            <Head title="Forgot Password - SIMSR" />

            {/* Background Image Full Screen - SAMA DENGAN LOGIN */}
            <div 
                className="min-h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat relative"
                style={{
                    backgroundImage: "url('/images/coba.jpg')",
                }}
            >
                {/* Overlay tipis */}
                <div className="absolute inset-0 bg-black bg-opacity-20"></div>
                
                {/* Card Forgot Password */}
                <div className="relative z-10 w-full max-w-md">
                    
                    {/* Card dengan background putih semi transparan */}
                    <div className="bg-white/90 backdrop-blur-sm shadow-2xl rounded-2xl p-10 border border-white/20">
                        
                        {/* LOGO - SAMA DENGAN LOGIN */}
                        <div className="flex justify-between items-center mb-6">
                            <img
                                src="/images/jai.jpg"
                                className="h-10 max-w-[90px] object-contain"
                                alt="JAI Logo"
                            />
                            <img
                                src="/images/kampus.png"
                                className="h-10"
                                alt="Kampus Logo"
                            />
                        </div>

                        {/* TITLE */}
                        <div className="text-center mb-4">
                            <h1 className="text-2xl font-bold text-gray-800">
                                Forgot Password?
                            </h1>
                            <p className="text-gray-600 text-sm mt-2">
                                No problem! Enter your email and we'll send you a reset link.
                            </p>
                        </div>

                        {/* Description Card */}
                        <div className="bg-blue-50 border-l-4 border-[#1D6F42] p-4 mb-6 rounded-r-lg">
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    <svg className="h-5 w-5 text-[#1D6F42]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div className="ml-3">
                                    <p className="text-sm text-gray-700">
                                        You'll receive an email with a password reset link. Check your spam folder if you don't see it.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Status Message */}
                        {status && (
                            <div className="mb-4 text-sm font-medium text-green-600 bg-green-50 p-3 rounded-lg">
                                {status}
                            </div>
                        )}

                        {/* Success Message */}
                        {emailSent && (
                            <div className="mb-4 text-sm font-medium text-green-600 bg-green-50 p-3 rounded-lg">
                                Reset link has been sent to your email!
                            </div>
                        )}

                        <form onSubmit={submit}>
                            {/* EMAIL dengan icon - SAMA DENGAN LOGIN */}
                            <div className="mb-6">
                                <label className="text-sm text-gray-700 block mb-2 font-medium">
                                    Email Address
                                </label>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-gray-500 pointer-events-none">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.57 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                                        </svg>
                                    </span>
                                    <input
                                        id="email"
                                        type="email"
                                        value={data.email}
                                        onChange={(e) => setData('email', e.target.value)}
                                        className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1D6F42] focus:border-[#1D6F42] transition-all shadow-sm"
                                        placeholder="Enter your email"
                                        required
                                    />
                                </div>
                                {errors.email && (
                                    <p className="text-red-500 text-sm mt-2">{errors.email}</p>
                                )}
                            </div>

                            {/* BUTTON SEND RESET LINK */}
                            <button
                                type="submit"
                                disabled={processing}
                                className="w-full bg-[#1D6F42] hover:bg-green-800 text-white py-3 rounded-xl font-semibold transition disabled:opacity-60 shadow-lg shadow-[#1D6F42]/30 mb-4"
                            >
                                {processing ? (
                                    <span className="flex items-center justify-center">
                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Sending...
                                    </span>
                                ) : 'Send Reset Link'}
                            </button>

                            {/* LINK KEMBALI KE LOGIN */}
                            <div className="text-center">
                                <Link
                                    href={route('login')}
                                    className="inline-flex items-center text-sm text-[#1D6F42] hover:text-[#166035] font-medium hover:underline transition-all"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                                    </svg>
                                    Back to Login
                                </Link>
                            </div>
                        </form>

                        {/* FOOTER - SAMA DENGAN LOGIN */}
                        {/*<p className="text-center text-xs text-gray-500 mt-6">
                            SIMSR • PT Jatim Autocomp Indonesia
                        </p>*/}

                    </div>
                </div>
            </div>
        </>
    );
}