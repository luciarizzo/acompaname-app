import { AlertCircle, CheckCircle2, Info, LoaderCircle } from 'lucide-react';
export function StatusMessage({ kind, children }: { kind: 'loading' | 'error' | 'info' | 'success'; children: React.ReactNode }) {
 const Icon = kind === 'loading' ? LoaderCircle : kind === 'error' ? AlertCircle : kind === 'success' ? CheckCircle2 : Info;
 return <div className={`status-message ${kind}`} role={kind === 'error' ? 'alert' : 'status'}><Icon size={22} className={kind === 'loading' ? 'spin' : ''}/><span>{children}</span></div>;
}
