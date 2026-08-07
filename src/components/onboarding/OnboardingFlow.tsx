import { useRef, useState } from 'react';
import { getSettings, saveSettings } from '../../db/settings';
import { useAuth } from '../../state/AuthContext';
import { Button } from '../ui/Button';
import { Logo } from '../ui/Logo';
import { PinPad } from '../lock/PinPad';

type Step = 'welcome' | 'profile' | 'credentials' | 'security' | 'done';
const STEP_ORDER: Step[] = ['welcome', 'profile', 'credentials', 'security', 'done'];

export function OnboardingFlow() {
  const { completeOnboarding, setupPin, setupBiometric, biometricSupported, pinConfigured, biometricConfigured } = useAuth();
  const [step, setStep] = useState<Step>('welcome');
  const [advisorName, setAdvisorName] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [agencyName, setAgencyName] = useState('');
  const [contact, setContact] = useState('');
  const [licenses, setLicenses] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const stepIndex = STEP_ORDER.indexOf(step);
  const goTo = (s: Step) => setStep(s);
  const next = () => goTo(STEP_ORDER[Math.min(STEP_ORDER.length - 1, stepIndex + 1)]);

  const saveProfileStep = async () => {
    const settings = await getSettings();
    settings.advisorName = advisorName.trim();
    if (photo) settings.photo = photo;
    await saveSettings(settings);
    next();
  };

  const saveCredentialsStep = async () => {
    const settings = await getSettings();
    settings.registrationNumber = registrationNumber.trim();
    settings.companyName = companyName.trim();
    settings.agencyName = agencyName.trim();
    settings.contact = contact.trim();
    settings.licenses = licenses.trim();
    await saveSettings(settings);
    next();
  };

  const handlePhoto = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => setPhoto(reader.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-[90] flex flex-col bg-slate-50">
      <div className="flex items-center justify-between px-6 pt-6">
        <div className="flex gap-1.5">
          {STEP_ORDER.slice(0, 4).map((s, i) => (
            <div key={s} className={`h-1.5 w-8 rounded-full ${i <= stepIndex ? 'bg-indigo-600' : 'bg-slate-200'}`} />
          ))}
        </div>
        {step !== 'done' && (
          <button onClick={completeOnboarding} className="text-sm font-semibold text-slate-400 hover:text-slate-600">
            Skip setup
          </button>
        )}
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-6 py-8">
        {step === 'welcome' && (
          <div className="flex max-w-md flex-col items-center gap-6 text-center">
            <Logo size={80} rounded="rounded-2xl" />
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Welcome to A.L.F.R.E.D.</h1>
              <p className="text-sm font-medium text-indigo-600">Assets, Liabilities, Financial Review &amp; Evaluation Directory</p>
              <p className="mt-2 text-slate-500">
                Let's set up your profile — takes about a minute. Everything is optional and you can edit it anytime in Settings.
              </p>
            </div>
            <Button onClick={next} className="w-full max-w-xs">Get Started</Button>
          </div>
        )}

        {step === 'profile' && (
          <div className="flex w-full max-w-md flex-col gap-5">
            <div className="text-center">
              <h2 className="text-xl font-bold text-slate-800">Your Profile</h2>
              <p className="text-slate-500">This appears on your Home page and Quarterly Reports.</p>
            </div>
            <div className="flex flex-col items-center gap-3">
              <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl bg-slate-200">
                {photo ? <img src={photo} alt="" className="h-full w-full object-cover" /> : <span className="text-slate-400">Photo</span>}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handlePhoto(e.target.files[0])}
              />
              <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>Upload Photo</Button>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600">Full name</label>
              <input value={advisorName} onChange={(e) => setAdvisorName(e.target.value)} className="input" placeholder="e.g. Alex Tan" autoFocus />
            </div>
            <Button onClick={saveProfileStep}>Continue</Button>
          </div>
        )}

        {step === 'credentials' && (
          <div className="flex w-full max-w-md flex-col gap-4">
            <div className="text-center">
              <h2 className="text-xl font-bold text-slate-800">Your Credentials</h2>
              <p className="text-slate-500">Registration details for client-facing reports.</p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600">Registration / credential no.</label>
              <input value={registrationNumber} onChange={(e) => setRegistrationNumber(e.target.value)} className="input" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-600">Company</label>
                <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="input" placeholder="e.g. Great Eastern" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-600">Agency</label>
                <input value={agencyName} onChange={(e) => setAgencyName(e.target.value)} className="input" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600">Contact details</label>
              <input value={contact} onChange={(e) => setContact(e.target.value)} className="input" placeholder="Phone / email" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600">Licenses held</label>
              <input value={licenses} onChange={(e) => setLicenses(e.target.value)} className="input" placeholder="M5, M8, M9, M9A, HI…" />
            </div>
            <Button onClick={saveCredentialsStep}>Continue</Button>
          </div>
        )}

        {step === 'security' && (
          <SecurityStep
            pinConfigured={pinConfigured}
            biometricConfigured={biometricConfigured}
            biometricSupported={biometricSupported}
            setupPin={setupPin}
            setupBiometric={() => setupBiometric(advisorName)}
            onDone={next}
          />
        )}

        {step === 'done' && (
          <div className="flex max-w-md flex-col items-center gap-6 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-4xl">✓</div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">You're all set!</h1>
              <p className="mt-2 text-slate-500">
                You can update your profile, credentials, or app lock anytime from Settings.
              </p>
            </div>
            <Button onClick={completeOnboarding} className="w-full max-w-xs">Go to Dashboard</Button>
          </div>
        )}
      </div>
    </div>
  );
}

function SecurityStep({
  pinConfigured,
  biometricConfigured,
  biometricSupported,
  setupPin,
  setupBiometric,
  onDone,
}: {
  pinConfigured: boolean;
  biometricConfigured: boolean;
  biometricSupported: boolean;
  setupPin: (pin: string) => Promise<void>;
  setupBiometric: () => Promise<void>;
  onDone: () => void;
}) {
  const [firstPin, setFirstPin] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [settingUpBiometric, setSettingUpBiometric] = useState(false);

  const handlePinEntry = async (pin: string) => {
    if (!firstPin) {
      setFirstPin(pin);
      setError(null);
      return;
    }
    if (pin !== firstPin) {
      setError('PINs did not match. Start again.');
      setFirstPin(null);
      return;
    }
    await setupPin(pin);
  };

  const enableBiometric = async () => {
    setSettingUpBiometric(true);
    try {
      await setupBiometric();
    } catch {
      // user cancelled or unsupported — safe to ignore, PIN remains the fallback
    }
    setSettingUpBiometric(false);
  };

  return (
    <div className="flex w-full max-w-md flex-col items-center gap-5">
      <div className="text-center">
        <h2 className="text-xl font-bold text-slate-800">Secure the App</h2>
        <p className="text-slate-500">
          Set a PIN so client data stays private if this iPad is left unattended mid-meeting.
        </p>
      </div>

      {!pinConfigured ? (
        <>
          <p className="text-sm font-medium text-slate-600">{firstPin ? 'Confirm your 6-digit PIN' : 'Choose a 6-digit PIN'}</p>
          <PinPad onSubmit={handlePinEntry} error={error} />
          <button onClick={onDone} className="text-sm font-semibold text-slate-400 hover:text-slate-600">
            I'll set this up later
          </button>
        </>
      ) : (
        <div className="flex w-full flex-col items-center gap-4">
          <p className="font-medium text-emerald-600">✓ PIN configured</p>
          {biometricSupported && !biometricConfigured && (
            <Button variant="secondary" onClick={enableBiometric} disabled={settingUpBiometric}>
              {settingUpBiometric ? 'Setting up…' : '🔒 Also enable Face ID / Touch ID'}
            </Button>
          )}
          {biometricConfigured && <p className="text-sm text-emerald-600">✓ Face ID / Touch ID enabled</p>}
          <Button onClick={onDone} className="w-full max-w-xs">Continue</Button>
        </div>
      )}
    </div>
  );
}
