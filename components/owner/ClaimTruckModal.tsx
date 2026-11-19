'use client';

import { useState, useRef } from 'react';
import Link from '@/components/navigation/IntentLink';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mail, CheckCircle2, AlertCircle, Loader2, ArrowLeft, MessageSquare } from 'lucide-react';
import { captureOwnerFunnelEvent } from '@/lib/analytics/trackClient';
import { buildClaimStarted } from '@/lib/analytics/funnel';
import {
  buildContactSupportUrl,
  buildSendCodeBody,
  buildVerifyCodeBody,
  parseApiErrorMessage,
  parseVerificationCodeInput,
  validateVerificationCode,
  VERIFICATION_CODE_LENGTH,
} from '@/lib/claim/claimVerification';

interface ClaimTruckModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly truckId: string;
  readonly truckName: string;
}

type VerificationStep = 'idle' | 'sending' | 'code-entry' | 'verifying' | 'success';

const SIGN_IN_REQUIRED_MESSAGE =
  'Log in or create an account to claim this truck.';

export function ClaimTruckModal({ isOpen, onClose, truckId, truckName }: ClaimTruckModalProps) {
  const [step, setStep] = useState<VerificationStep>('idle');
  const [verificationCode, setVerificationCode] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [requiresSignIn, setRequiresSignIn] = useState(false);
  const claimStartedTrackedRef = useRef(false);

  const handleSendCode = async () => {
    if (!claimStartedTrackedRef.current) {
      claimStartedTrackedRef.current = true;
      const { event, properties } = buildClaimStarted('verification_code');
      captureOwnerFunnelEvent(event, properties);
    }
    setStep('sending');
    setErrorMessage('');

    try {
      const response = await fetch('/api/auth/claim/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: buildSendCodeBody(truckId),
      });

      if (response.ok) {
        setRequiresSignIn(false);
        setStep('code-entry');
      } else if (response.status === 401) {
        setStep('idle');
        setRequiresSignIn(true);
        setErrorMessage(SIGN_IN_REQUIRED_MESSAGE);
      } else {
        let errorMsg = 'Unable to send code. Please contact support.';
        try {
          const data = await response.json();
          errorMsg = parseApiErrorMessage(data, errorMsg);
        } catch {}
        setStep('idle');
        setRequiresSignIn(false);
        setErrorMessage(errorMsg);
      }
    } catch {
      setStep('idle');
      setRequiresSignIn(false);
      setErrorMessage('Network error. Please try again.');
    }
  };

  const handleVerifyCode = async () => {
    const validationError = validateVerificationCode(verificationCode);
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setStep('verifying');
    setErrorMessage('');

    try {
      const response = await fetch('/api/auth/claim/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: buildVerifyCodeBody(truckId, verificationCode),
      });

      if (response.ok) {
        setRequiresSignIn(false);
        setStep('success');
        const data = await response.json();
        setTimeout(() => {
          globalThis.location.href = data.trialStarted
            ? '/owner-dashboard?trial_started=true'
            : '/owner-dashboard';
        }, 2000);
      } else if (response.status === 401) {
        setStep('idle');
        setRequiresSignIn(true);
        setErrorMessage(SIGN_IN_REQUIRED_MESSAGE);
      } else {
        let errorMsg = 'Invalid code';
        try {
          const data = await response.json();
          errorMsg = parseApiErrorMessage(data, errorMsg);
        } catch {}
        setStep('code-entry');
        setRequiresSignIn(false);
        setErrorMessage(errorMsg);
      }
    } catch {
      setStep('code-entry');
      setRequiresSignIn(false);
      setErrorMessage('Network error');
    }
  };

  const handleContactSupport = () => {
    globalThis.location.href = buildContactSupportUrl(truckName, truckId);
  };

  const resetForm = () => {
    setStep('idle');
    setVerificationCode('');
    setErrorMessage('');
    setRequiresSignIn(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md p-0 gap-0 overflow-hidden w-[calc(100%-2rem)] rounded-lg">
        {/* Animated city-night lightscape background */}
        <div className="absolute inset-0 opacity-60 pointer-events-none overflow-hidden">
          <div className="absolute -top-20 -right-20 w-80 h-80 bg-gradient-to-bl from-blue-600/40 to-indigo-500/30 rounded-full blur-3xl animate-blob-vertical animation-delay-3000"></div>
          <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-gradient-to-tr from-amber-500/30 to-yellow-400/20 rounded-full blur-3xl animate-blob-vertical animation-delay-1000"></div>
          <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-fuchsia-500/20 to-purple-600/20 rounded-full blur-3xl animate-blob"></div>
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-teal-500/20 to-cyan-500/20 rounded-full blur-3xl animate-blob animation-delay-2000"></div>
          <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-gradient-to-t from-orange-500/15 to-rose-500/15 rounded-full blur-3xl animate-blob animation-delay-4000"></div>
        </div>

        <style>{`
          @keyframes blob {
            0%,
            100% {
              transform: translate(0, 0) scale(1);
            }
            33% {
              transform: translate(30px, -50px) scale(1.1);
            }
            66% {
              transform: translate(-20px, 20px) scale(0.9);
            }
          }
          @keyframes blob-vertical {
            0%,
            100% {
              transform: translate(0, 0) scale(1);
            }
            33% {
              transform: translate(20px, -80px) scale(1.05);
            }
            66% {
              transform: translate(-15px, 70px) scale(0.95);
            }
          }
          .animate-blob {
            animation: blob 7s infinite;
          }
          .animate-blob-vertical {
            animation: blob-vertical 8s infinite;
          }
          .animation-delay-1000 {
            animation-delay: 1s;
          }
          .animation-delay-2000 {
            animation-delay: 2s;
          }
          .animation-delay-3000 {
            animation-delay: 3s;
          }
          .animation-delay-4000 {
            animation-delay: 4s;
          }
        `}</style>

        {/* Header */}
        <div className="relative z-10 px-4 pt-4 pb-2">
          <DialogTitle className="text-lg font-bold bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent">
            Claim Your Truck
          </DialogTitle>
          <DialogDescription className="text-xs mt-1">
            Verify ownership of <strong className="text-foreground">{truckName}</strong>
          </DialogDescription>
        </div>

        {/* Success State */}
        {step === 'success' ? (
          <div className="relative z-10 p-4 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-2" />
            <p className="font-semibold">Truck Claimed!</p>
            <p className="text-xs text-muted-foreground">Redirecting to dashboard...</p>
          </div>
        ) : (
          <div className="relative z-10">
            <Tabs defaultValue="email" className="w-full">
              <TabsList className="grid w-full grid-cols-2 h-10 p-1 rounded-none border-y border-white/10 bg-black/20">
                <TabsTrigger
                  value="email"
                  className="text-xs gap-1 rounded-md data-[state=active]:bg-green-500/60 data-[state=active]:text-white"
                >
                  <Mail className="h-3 w-3" />
                  Email
                </TabsTrigger>
                <TabsTrigger
                  value="support"
                  className="text-xs gap-1 rounded-md data-[state=active]:bg-amber-500/60 data-[state=active]:text-white"
                >
                  <MessageSquare className="h-3 w-3" />
                  Support
                </TabsTrigger>
              </TabsList>

              {/* Email Tab */}
              <TabsContent value="email" className="p-4 pb-2 m-0 space-y-2">
                {step === 'idle' && (
                  <>
                    {requiresSignIn ? (
                      <>
                        <Alert className="py-2 border-amber-500/30 bg-amber-500/10 text-amber-100">
                          <AlertCircle className="h-3 w-3 text-amber-300" />
                          <AlertDescription className="text-xs text-amber-100">
                            {errorMessage}
                          </AlertDescription>
                        </Alert>
                        <div className="backdrop-blur-md bg-gradient-to-br from-green-500/10 to-cyan-500/10 border border-green-500/20 rounded p-3">
                          <p className="text-xs text-muted-foreground">
                            Log in or create an account to claim this truck. If your email matches the one we have on file, we&apos;ll claim it for you automatically.
                          </p>
                        </div>
                        <Button
                          asChild
                          size="sm"
                          className="w-full bg-gradient-to-r from-green-500 to-cyan-500 hover:from-green-600 hover:to-cyan-600"
                        >
                          <Link href="/login?next=/claim-your-truck">Sign In to Continue</Link>
                        </Button>
                      </>
                    ) : (
                      <>
                        <div className="backdrop-blur-md bg-gradient-to-br from-green-500/10 to-cyan-500/10 border border-green-500/20 rounded p-3">
                          <p className="text-xs text-muted-foreground">
                            We&apos;ll send a <strong className="text-green-400">6-digit code</strong> to the email on file for this truck.
                          </p>
                        </div>
                        {errorMessage && (
                          <Alert variant="destructive" className="py-2">
                            <AlertCircle className="h-3 w-3" />
                            <AlertDescription className="text-xs">{errorMessage}</AlertDescription>
                          </Alert>
                        )}
                        <Button
                          size="sm"
                          className="w-full bg-gradient-to-r from-green-500 to-cyan-500 hover:from-green-600 hover:to-cyan-600"
                          onClick={handleSendCode}
                        >
                          <Mail className="h-3 w-3 mr-1" />
                          Send Code
                        </Button>
                      </>
                    )}
                    <div className="flex justify-end">
                      <Button variant="ghost" size="sm" onClick={handleClose}>
                        Cancel
                      </Button>
                    </div>
                  </>
                )}

                {step === 'sending' && (
                  <div className="py-4 text-center">
                    <Loader2 className="h-6 w-6 text-green-400 mx-auto animate-spin" />
                    <p className="text-xs text-muted-foreground mt-2">Sending...</p>
                  </div>
                )}

                {step === 'code-entry' && (
                  <>
                    <div className="backdrop-blur-md bg-gradient-to-br from-green-500/10 to-cyan-500/10 border border-green-500/20 rounded p-2">
                      <p className="text-xs text-white">
                        ✓ Code sent! Check spam & add support@truckfull.food to contacts.
                      </p>
                    </div>
                    <Input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="000000"
                      value={verificationCode}
                      onChange={(e) =>
                        setVerificationCode(parseVerificationCodeInput(e.target.value))
                      }
                      className="text-center text-xl font-mono tracking-widest h-10"
                      // eslint-disable-next-line jsx-a11y/no-autofocus -- Auto-focusing verification code input is intentional UX
                      autoFocus
                    />
                    {errorMessage && (
                      <Alert variant="destructive" className="py-2">
                        <AlertCircle className="h-3 w-3" />
                        <AlertDescription className="text-xs">{errorMessage}</AlertDescription>
                      </Alert>
                    )}
                    <Button
                      size="sm"
                      className="w-full bg-gradient-to-r from-green-500 to-cyan-500 hover:from-green-600 hover:to-cyan-600"
                      onClick={handleVerifyCode}
                      disabled={verificationCode.length !== VERIFICATION_CODE_LENGTH}
                    >
                      Verify & Claim
                    </Button>
                    <div className="flex justify-between text-xs">
                      <button
                        onClick={() => {
                          setStep('idle');
                          setRequiresSignIn(false);
                          setErrorMessage('');
                        }}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <ArrowLeft className="h-3 w-3 inline mr-1" />
                        Back
                      </button>
                      <button
                        onClick={handleSendCode}
                        className="text-muted-foreground hover:text-foreground underline"
                      >
                        Resend
                      </button>
                    </div>
                  </>
                )}

                {step === 'verifying' && (
                  <div className="py-4 text-center">
                    <Loader2 className="h-6 w-6 text-green-400 mx-auto animate-spin" />
                    <p className="text-xs text-muted-foreground mt-2">Verifying...</p>
                  </div>
                )}
              </TabsContent>

              {/* Support Tab */}
              <TabsContent value="support" className="p-4 pb-2 m-0 space-y-2">
                <div className="backdrop-blur-md bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded p-3">
                  <p className="text-xs text-muted-foreground">
                    Can&apos;t verify via email? We&apos;ll help verify ownership manually.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onClick={handleContactSupport}
                >
                  <MessageSquare className="h-3 w-3 mr-1" />
                  Email Support
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  Response within 24-48 hours
                </p>
                <div className="flex justify-end">
                  <Button variant="ghost" size="sm" onClick={handleClose}>
                    Cancel
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
