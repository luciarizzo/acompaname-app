import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { HomePage } from './pages/HomePage';
import { FlowPage } from './pages/FlowPage';
import { OtherRequestPage } from './pages/OtherRequestPage';
import { CinemaFlow } from './pages/CinemaFlow';
import { TripFlow } from './pages/TripFlow';
import { TasksPage } from './pages/TasksPage';
import { WelcomePage } from './pages/WelcomePage';
import { EntryPage } from './pages/EntryPage';
import { LoginPage } from './pages/LoginPage';
import { getCurrentSession, signOut } from './services/account';
import { activateAccount, deactivateAccount } from './services/accountData';
import type { Session } from '@supabase/supabase-js';
import { OnboardingPage } from './pages/OnboardingPage';
import { BrandHeader } from './components/BrandHeader';
import { TrustedContactsDialog } from './components/TrustedContactsDialog';
import { BottomNav } from './components/BottomNav';
import { FirstUseGuide } from './components/FirstUseGuide';
import { ProfileSettingsPage } from './pages/ProfileSettingsPage';
import { cancelBookedTask, deleteSavedTask, getSavedTasks, saveTask, updateSavedTask } from './utils/storage';
import { getOnboardingProfile, saveOnboardingProfile, type OnboardingProfile } from './utils/profile';
import type { FlowKind, SavedTask } from './types';
import { PhoneCall } from 'lucide-react';
import { returnFromLogin, shouldResumeSuggestion, type LoginOrigin } from './utils/loginReturn';
import { loadFlowDraft } from './utils/flowDraft';
import { shouldConfirmLeavingFlow } from './utils/navigationExit';
import './styles.css';
function App() {
 const [guideSeen, setGuideSeen] = useState(() => localStorage.getItem('acompaname-guide-v1-seen') === 'true');
 const [guideOpen, setGuideOpen] = useState(false);
 const [welcomeSeen,setWelcomeSeen]=useState(()=>localStorage.getItem('acompaname-v1-welcome-seen')==='true'); const [profile,setProfile]=useState<OnboardingProfile>(getOnboardingProfile); const [view,setView]=useState<'entry'|'login'|'welcome'|'onboarding'|'home'|'tasks'|'settings'>('entry'); const [loginOrigin,setLoginOrigin]=useState<LoginOrigin>('entry'); const [hasSession,setHasSession]=useState(false); const [authReady,setAuthReady]=useState(false); const [flow,setFlow]=useState<FlowKind|null>(null); const [prompt,setPrompt]=useState(''); const [largeText,setLargeText]=useState(profile.largerText); const [highContrast,setHighContrast]=useState(profile.highContrast); const [textPanel,setTextPanel]=useState(false); const [showTrustedContacts,setShowTrustedContacts]=useState(false); const [speaking,setSpeaking]=useState(false); const [tasks,setTasks]=useState<SavedTask[]>(getSavedTasks()); const [liveText,setLiveText]=useState('');
 useEffect(()=>{document.documentElement.classList.toggle('large-text',largeText);document.documentElement.classList.toggle('high-contrast',highContrast);},[largeText,highContrast]);
 const readScreen=()=>{if(!('speechSynthesis' in window)){setLiveText('La lectura en voz alta no está disponible en este navegador.');return;}if(speaking){window.speechSynthesis.cancel();setSpeaking(false);return;}const text=document.querySelector('main')?.innerText||'Acompáñame';const utterance=new SpeechSynthesisUtterance(text);utterance.lang='es-AR';utterance.rate=0.9;utterance.onend=()=>setSpeaking(false);utterance.onerror=()=>setSpeaking(false);window.speechSynthesis.cancel();window.speechSynthesis.speak(utterance);setSpeaking(true);setLiveText('Leyendo esta pantalla en voz alta.');};
 const readCurrentScreen=()=>{if(!profile.readScreens||!('speechSynthesis' in window))return;window.speechSynthesis.cancel();window.setTimeout(()=>{const text=document.querySelector('main')?.innerText;if(!text)return;const utterance=new SpeechSynthesisUtterance(text);utterance.lang='es-AR';utterance.rate=0.9;utterance.onend=()=>setSpeaking(false);utterance.onerror=()=>setSpeaking(false);window.speechSynthesis.speak(utterance);setSpeaking(true);},180);};
 // La navegación de Sasha avisa antes de salir, pero el borrador ya se guarda automáticamente.
 // Una sola confirmación compartida evita que el usuario reciba dos diálogos seguidos.
 const canLeaveFlow = () => {
   if (!flow || flow === 'other') return true;
   const hasDraft = Boolean(loadFlowDraft(flow));
   return !shouldConfirmLeavingFlow(flow, hasDraft) || window.confirm('¿Querés volver al inicio? Guardamos tu progreso para que puedas retomarlo después.');
 };
 const home = () => { if (!canLeaveFlow()) return; setFlow(null); setView('home'); };
 const refreshFromStorage=()=>{const next=getOnboardingProfile();setProfile(next);setLargeText(next.largerText);setHighContrast(next.highContrast);setTasks(getSavedTasks());};
 const enterAccount=async(session:Session)=>{const {configured}=await activateAccount(session);refreshFromStorage();setHasSession(true);setFlow(null);if(configured){setWelcomeSeen(true);setView('home');}else{setWelcomeSeen(false);setView('welcome');}return configured;};
 useEffect(()=>{void getCurrentSession().then(async session=>{if(session)await enterAccount(session);setAuthReady(true);});},[]);
 const logout=async()=>{await signOut();deactivateAccount();refreshFromStorage();setWelcomeSeen(localStorage.getItem('acompaname-v1-welcome-seen')==='true');setHasSession(false);setFlow(null);setView('entry');};
 const continueFromEntry=()=>{const hasSeenWelcome=localStorage.getItem('acompaname-v1-welcome-seen')==='true';setView(hasSeenWelcome?(profile.trustedContactsSetup?'home':'onboarding'):'welcome');};
 const finishWelcome=()=>{localStorage.setItem('acompaname-v1-welcome-seen','true');setWelcomeSeen(true);setView('home');};
 const skipOnboarding=()=>{const configuredProfile={...profile,trustedContactsSetup:true};saveOnboardingProfile(configuredProfile);setProfile(configuredProfile);finishWelcome();};
 const continueWelcome=()=>setView(welcomeSeen?'home':'onboarding');
 const completeOnboarding=(nextProfile:OnboardingProfile)=>{const contacts=nextProfile.trustedContacts.filter(contact=>contact.name.trim()&&contact.phone.trim()).slice(0,2).map(contact=>({...contact,name:contact.name.trim(),phone:contact.phone.trim()}));const configuredProfile={...nextProfile,city:nextProfile.city.trim(),trustedContacts:contacts,trustedContactsSetup:true};saveOnboardingProfile(configuredProfile);setProfile(configuredProfile);setLargeText(configuredProfile.largerText);setHighContrast(configuredProfile.highContrast);finishWelcome();};
 const updateLargeText=(enabled:boolean)=>{setLargeText(enabled);const next={...profile,largerText:enabled};setProfile(next);saveOnboardingProfile(next);};
 const updateContrast=()=>{setHighContrast(value=>{const nextValue=!value;const next={...profile,highContrast:nextValue};setProfile(next);saveOnboardingProfile(next);return nextValue;});};
 const completeSettings=(updated:OnboardingProfile)=>{saveOnboardingProfile(updated);setProfile(updated);setLargeText(updated.largerText);setHighContrast(updated.highContrast);setView('home');setLiveText('Guardamos los cambios de tu configuración.');};
 const cancelSettings=()=>{setLargeText(profile.largerText);setHighContrast(profile.highContrast);setView('home');};
 const previewPreferences=(preferences:Pick<OnboardingProfile,'largerText'|'highContrast'>)=>{setLargeText(preferences.largerText);setHighContrast(preferences.highContrast);};
 useEffect(()=>{if(!guideOpen && (guideSeen || view !== 'home') && (view==='home'||view==='tasks'||view==='settings'))readCurrentScreen();},[view,profile.readScreens,guideOpen,guideSeen]);
 useEffect(()=>{if(authReady && view === 'home' && !flow && welcomeSeen && !guideSeen) setGuideOpen(true);},[authReady,view,flow,welcomeSeen,guideSeen]);
 const closeGuide = () => {localStorage.setItem('acompaname-guide-v1-seen','true');setGuideSeen(true);setGuideOpen(false);};
 const selectFlow=(kind:FlowKind,text='')=>{setFlow(kind);setPrompt(text);setView('home');};
 const changeView=(next:'home'|'tasks'|'settings')=>{if (!canLeaveFlow()) return; setFlow(null);setView(next);if(next==='tasks')setTasks(getSavedTasks());};
 return <div className="app-shell"><a className="skip-link" href="#main">Saltar al contenido</a><BrandHeader onSettings={view !== 'entry' && view !== 'login' && view !== 'welcome' && view !== 'onboarding' ? () => changeView('settings') : undefined} onTasks={view !== 'entry' && view !== 'login' && view !== 'welcome' && view !== 'onboarding' ? () => changeView('tasks') : undefined} currentSection={flow ? null : view === 'home' || view === 'tasks' || view === 'settings' ? view : null} onHome={()=>view==='entry'||view==='login'?undefined:view==='welcome'?finishWelcome():view==='onboarding'?setView('welcome'):home()} onText={()=>setTextPanel(!textPanel)} onRead={readScreen} speaking={speaking} highContrast={highContrast} onToggleContrast={updateContrast}/>
  {textPanel&&<div className="text-panel" role="dialog" aria-label="Tamaño del texto"><strong>Tamaño del texto</strong><button onClick={()=>{updateLargeText(false);setTextPanel(false)}} aria-pressed={!largeText}>Normal</button><button onClick={()=>{updateLargeText(true);setTextPanel(false)}} aria-pressed={largeText}>Grande</button><button className="panel-close" onClick={()=>setTextPanel(false)} aria-label="Cerrar">×</button></div>}
  {view!=='entry'&&view!=='login'&&view!=='welcome'&&view!=='onboarding'&&<button data-guide="trusted-call" className="trusted-launcher" type="button" onClick={()=>setShowTrustedContacts(true)} aria-label="Pedir ayuda: elegir a quién llamar" title="Elegir un contacto de confianza"><PhoneCall size={21}/><span>Pedir ayuda</span></button>}
  {showTrustedContacts&&<TrustedContactsDialog contacts={profile.trustedContacts} onContactsChange={contacts=>{const next={...profile,trustedContacts:contacts};setProfile(next);saveOnboardingProfile(next);}} onClose={()=>setShowTrustedContacts(false)}/>}
  <div className="sr-only" aria-live="polite">{liveText}</div>
  {flow==='cinema'?<CinemaFlow key={flow} city={profile.city} preferredPaymentMethod={profile.preferredPaymentMethod} onPaymentMethodChange={method=>{const next={...profile,preferredPaymentMethod:method};setProfile(next);saveOnboardingProfile(next);}} onBack={()=>setFlow(null)} onHome={home} onSaved={()=>{setTasks(getSavedTasks());setFlow(null);setView('tasks')}} onStepChange={readCurrentScreen}/>:flow==='trip'?<TripFlow key={flow} city={profile.city} addresses={profile.savedAddresses} onAddressesChange={list=>{const next={...profile,savedAddresses:list};setProfile(next);saveOnboardingProfile(next);}} onSave={task=>{saveTask(task);}} onBack={()=>setFlow(null)} onHome={home} onSaved={()=>{setTasks(getSavedTasks());setFlow(null);setView('tasks')}} onStepChange={readCurrentScreen}/>:flow==='other'?<OtherRequestPage key={flow+prompt} initialPrompt={prompt} onChoose={kind=>selectFlow(kind)} onHome={home} onLogin={()=>{setLoginOrigin('suggestion');setFlow(null);setView('login');}}/>:flow?<FlowPage key={flow+prompt} kind={flow} initialPrompt={prompt} city={profile.city} onLogin={()=>{setLoginOrigin('home');setFlow(null);setView('login');}} onBack={()=>setFlow(null)} onHome={home} onSaved={()=>{setTasks(getSavedTasks());setFlow(null);setView('tasks')}} onStepChange={readCurrentScreen}/>:view==='entry'?(authReady?<EntryPage onGuest={continueFromEntry} onLogin={()=>{setLoginOrigin('entry');setView('login');}}/>:null):view==='login'?<LoginPage returnToSuggestion={loginOrigin==='suggestion'} returnToHome={loginOrigin==='home'} onBack={()=>{const previous=returnFromLogin(loginOrigin);setView(previous.view);setFlow(previous.flow);}} onSuccess={async()=>{const session=await getCurrentSession();if(session){const configured=await enterAccount(session);if(shouldResumeSuggestion(loginOrigin,configured)){setFlow('other');setView('home');}}}}/>:view==='welcome'?<WelcomePage onContinue={continueWelcome} onSkip={skipOnboarding} continueLabel={welcomeSeen?'Volver al inicio':'Continuar'}/>:view==='onboarding'?<OnboardingPage initialProfile={profile} initialStep={welcomeSeen?4:0} onComplete={completeOnboarding} onCancel={()=>{setLargeText(profile.largerText);setHighContrast(profile.highContrast);if(welcomeSeen)skipOnboarding();else setView('welcome');}} onStepChange={readCurrentScreen} onPreferencesPreview={previewPreferences}/>:view==='home'?<HomePage onSelect={selectFlow} largeText={largeText} displayName={profile.name} onHowItWorks={()=>setGuideOpen(true)} onTasks={()=>changeView('tasks')} signedIn={hasSession} onAccountAction={()=>{if(hasSession){void logout();}else{setLoginOrigin('home');setView('login');}}}/>:view==='settings'?<ProfileSettingsPage profile={profile} onSave={completeSettings} onCancel={cancelSettings} onPreferencesPreview={previewPreferences}/>:<TasksPage items={tasks} onHome={home} onUpdate={async task=>{const updated=await updateSavedTask(task);setTasks(updated);}} onDelete={async id=>{const updated=await deleteSavedTask(id);setTasks(updated);}} onCancelBooking={async task=>{const updated=await cancelBookedTask(task);setTasks(updated);}}/>}
  {guideOpen && view === 'home' && !flow && <FirstUseGuide onFinish={closeGuide}/>}
  {view!=='entry'&&view!=='login'&&view!=='welcome'&&view!=='onboarding'&&<BottomNav view={flow ? null : view === 'settings' || view === 'home' || view === 'tasks' ? view : null} onChange={changeView}/>}
  {view!=='entry'&&view!=='login'&&view!=='welcome'&&view!=='onboarding'&&<footer className="site-footer"><span>Hecho con cuidado, para acompañarte.</span></footer>}
 </div>;
}

if ('serviceWorker' in navigator) window.addEventListener('load', () => {
  void navigator.serviceWorker.register('/sw.js').then(async () => {
    const registration = await navigator.serviceWorker.ready;
    const assets = performance.getEntriesByType('resource').map((entry) => entry.name).filter((url) => url.startsWith(window.location.origin));
    registration.active?.postMessage({ type: 'CACHE_APP_ASSETS', urls: assets });
  });
});

createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
