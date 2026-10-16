import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { HomePage } from './pages/HomePage';
import { FlowPage } from './pages/FlowPage';
import { TasksPage } from './pages/TasksPage';
import { WelcomePage } from './pages/WelcomePage';
import { OnboardingPage } from './pages/OnboardingPage';
import { BrandHeader } from './components/BrandHeader';
import { BottomNav } from './components/BottomNav';
import { getSavedTasks } from './utils/storage';
import { getOnboardingProfile, saveOnboardingProfile, type OnboardingProfile } from './utils/profile';
import type { FlowKind, SavedTask } from './types';
import './styles.css';
function App() {
 const [welcomeSeen,setWelcomeSeen]=useState(()=>localStorage.getItem('acompaname-v1-welcome-seen')==='true'); const [profile,setProfile]=useState<OnboardingProfile>(getOnboardingProfile); const [view,setView]=useState<'welcome'|'onboarding'|'home'|'tasks'>(()=>localStorage.getItem('acompaname-v1-welcome-seen')==='true'?'home':'welcome'); const [flow,setFlow]=useState<FlowKind|null>(null); const [prompt,setPrompt]=useState(''); const [largeText,setLargeText]=useState(profile.largerText); const [highContrast,setHighContrast]=useState(profile.highContrast); const [textPanel,setTextPanel]=useState(false); const [speaking,setSpeaking]=useState(false); const [tasks,setTasks]=useState<SavedTask[]>(getSavedTasks()); const [liveText,setLiveText]=useState('');
 useEffect(()=>{document.documentElement.classList.toggle('large-text',largeText);document.documentElement.classList.toggle('high-contrast',highContrast);},[largeText,highContrast]);
 const readScreen=()=>{if(!('speechSynthesis' in window)){setLiveText('La lectura en voz alta no está disponible en este navegador.');return;}if(speaking){window.speechSynthesis.cancel();setSpeaking(false);return;}const text=document.querySelector('main')?.innerText||'Acompáñame';const utterance=new SpeechSynthesisUtterance(text);utterance.lang='es-AR';utterance.rate=0.9;utterance.onend=()=>setSpeaking(false);utterance.onerror=()=>setSpeaking(false);window.speechSynthesis.cancel();window.speechSynthesis.speak(utterance);setSpeaking(true);setLiveText('Leyendo esta pantalla en voz alta.');};
 const readCurrentScreen=()=>{if(!profile.readScreens||!('speechSynthesis' in window))return;window.speechSynthesis.cancel();window.setTimeout(()=>{const text=document.querySelector('main')?.innerText;if(!text)return;const utterance=new SpeechSynthesisUtterance(text);utterance.lang='es-AR';utterance.rate=0.9;utterance.onend=()=>setSpeaking(false);utterance.onerror=()=>setSpeaking(false);window.speechSynthesis.speak(utterance);setSpeaking(true);},180);};
 const home=()=>{setFlow(null);setView('home');};
 const finishWelcome=()=>{localStorage.setItem('acompaname-v1-welcome-seen','true');setWelcomeSeen(true);setView('home');};
 const continueWelcome=()=>setView(welcomeSeen?'home':'onboarding');
 const completeOnboarding=(nextProfile:OnboardingProfile)=>{saveOnboardingProfile(nextProfile);setProfile(nextProfile);setLargeText(nextProfile.largerText);setHighContrast(nextProfile.highContrast);finishWelcome();};
 const updateLargeText=(enabled:boolean)=>{setLargeText(enabled);const next={...profile,largerText:enabled};setProfile(next);saveOnboardingProfile(next);};
 const updateContrast=()=>{setHighContrast(value=>{const nextValue=!value;const next={...profile,highContrast:nextValue};setProfile(next);saveOnboardingProfile(next);return nextValue;});};
 const previewPreferences=(preferences:Pick<OnboardingProfile,'largerText'|'highContrast'>)=>{setLargeText(preferences.largerText);setHighContrast(preferences.highContrast);};
 useEffect(()=>{if(view==='home'||view==='tasks')readCurrentScreen();},[view,profile.readScreens]);
 const selectFlow=(kind:FlowKind,text='')=>{setFlow(kind);setPrompt(text);setView('home');};
 const changeView=(next:'home'|'tasks')=>{setFlow(null);setView(next);if(next==='tasks')setTasks(getSavedTasks());};
 return <div className="app-shell"><a className="skip-link" href="#main">Saltar al contenido</a><BrandHeader onHome={()=>view==='welcome'?finishWelcome():view==='onboarding'?setView('welcome'):home()} onText={()=>setTextPanel(!textPanel)} onRead={readScreen} speaking={speaking} highContrast={highContrast} onToggleContrast={updateContrast}/>
  {textPanel&&<div className="text-panel" role="dialog" aria-label="Tamaño del texto"><strong>Tamaño del texto</strong><button onClick={()=>{updateLargeText(false);setTextPanel(false)}} aria-pressed={!largeText}>Normal</button><button onClick={()=>{updateLargeText(true);setTextPanel(false)}} aria-pressed={largeText}>Grande</button><button className="panel-close" onClick={()=>setTextPanel(false)} aria-label="Cerrar">×</button></div>}
  <div className="sr-only" aria-live="polite">{liveText}</div>
  {flow?<FlowPage key={flow+prompt} kind={flow} initialPrompt={prompt} onBack={()=>setFlow(null)} onHome={home} onSaved={()=>{setTasks(getSavedTasks());setFlow(null);setView('tasks')}} onStepChange={readCurrentScreen}/>:view==='welcome'?<WelcomePage onContinue={continueWelcome} onSkip={finishWelcome} continueLabel={welcomeSeen?'Volver al inicio':'Continuar'}/>:view==='onboarding'?<OnboardingPage onComplete={completeOnboarding} onCancel={()=>{setLargeText(profile.largerText);setHighContrast(profile.highContrast);setView('welcome');}} onStepChange={readCurrentScreen} onPreferencesPreview={previewPreferences}/>:view==='home'?<HomePage onSelect={selectFlow} largeText={largeText} displayName={profile.name} onHowItWorks={()=>setView('welcome')}/>:<TasksPage items={tasks} onHome={home}/>}
  {!flow&&view!=='welcome'&&view!=='onboarding'&&<BottomNav view={view} onChange={changeView}/>}
  {view!=='welcome'&&view!=='onboarding'&&<footer className="site-footer"><span>Hecho con cuidado, para acompañarte.</span><button onClick={home}>Inicio</button><button onClick={()=>changeView('tasks')}>Mis gestiones</button>{view==='home'&&<button onClick={()=>setView('welcome')}>Cómo funciona</button>}</footer>}
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
