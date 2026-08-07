import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppModeProvider } from './state/AppModeContext';
import { AuthProvider, useAuth } from './state/AuthContext';
import { ThemeProvider } from './state/ThemeContext';
import { AppShell } from './components/layout/AppShell';
import { AdvisorOnlyRoute, ClientModeRestrictedRoute } from './components/layout/ClientModeGuard';
import { LockScreen } from './components/lock/LockScreen';
import { OnboardingFlow } from './components/onboarding/OnboardingFlow';
import { UpdatePrompt } from './components/layout/UpdatePrompt';
import { ErrorBoundary } from './components/layout/ErrorBoundary';

const Home = lazy(() => import('./pages/Home'));
const Tasks = lazy(() => import('./pages/Tasks'));
const Commission = lazy(() => import('./pages/Commission'));
const Goals = lazy(() => import('./pages/Goals'));
const Settings = lazy(() => import('./pages/Settings'));
const ClientList = lazy(() => import('./pages/clients/ClientList'));
const ClientProfile = lazy(() => import('./pages/clients/ClientProfile'));
const BasicInfoTab = lazy(() => import('./pages/clients/BasicInfoTab'));
const MeetingLogTab = lazy(() => import('./pages/clients/MeetingLogTab'));
const FactFindTab = lazy(() => import('./pages/clients/FactFindTab'));
const PortfolioTab = lazy(() => import('./pages/clients/PortfolioTab'));
const HouseholdTab = lazy(() => import('./pages/clients/HouseholdTab'));
const ReportTab = lazy(() => import('./pages/clients/ReportTab'));
const Whiteboard = lazy(() => import('./pages/Whiteboard'));
const CalculatorsHome = lazy(() => import('./pages/calculators/CalculatorsHome'));
const CompoundInterestCalc = lazy(() => import('./pages/calculators/CompoundInterestCalc'));
const TvmCalc = lazy(() => import('./pages/calculators/TvmCalc'));
const RoiCalc = lazy(() => import('./pages/calculators/RoiCalc'));
const TaxCalc = lazy(() => import('./pages/calculators/TaxCalc'));
const CpfCalc = lazy(() => import('./pages/calculators/CpfCalc'));
const SalaryCalc = lazy(() => import('./pages/calculators/SalaryCalc'));
const RetirementCalc = lazy(() => import('./pages/calculators/RetirementCalc'));
const GoalSavingsCalc = lazy(() => import('./pages/calculators/GoalSavingsCalc'));
const PremiumFinancingCalc = lazy(() => import('./pages/calculators/PremiumFinancingCalc'));
const News = lazy(() => import('./pages/News'));
const FundTools = lazy(() => import('./pages/FundTools'));
const Knowledge = lazy(() => import('./pages/Knowledge'));
const NotFound = lazy(() => import('./pages/NotFound'));

function Gate({ children }: { children: React.ReactNode }) {
  const { loading, locked, onboardingComplete } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center text-slate-400">Loading…</div>;
  if (locked) return <LockScreen />;
  if (!onboardingComplete) return <OnboardingFlow />;
  return <>{children}</>;
}

function PageLoading() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600" />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
    <AuthProvider>
      <AppModeProvider>
        <UpdatePrompt />
        <ErrorBoundary>
        <BrowserRouter>
          <Gate>
            <Suspense fallback={<PageLoading />}>
              <Routes>
                <Route element={<AppShell />}>
                  <Route index element={<AdvisorOnlyRoute><Home /></AdvisorOnlyRoute>} />
                  <Route path="tasks" element={<AdvisorOnlyRoute><Tasks /></AdvisorOnlyRoute>} />
                  <Route path="commission" element={<AdvisorOnlyRoute><Commission /></AdvisorOnlyRoute>} />
                  <Route path="goals" element={<AdvisorOnlyRoute><Goals /></AdvisorOnlyRoute>} />
                  <Route path="settings" element={<AdvisorOnlyRoute><Settings /></AdvisorOnlyRoute>} />
                  <Route path="clients" element={<AdvisorOnlyRoute><ClientList /></AdvisorOnlyRoute>} />
                  <Route path="whiteboard" element={<Whiteboard />} />
                  <Route path="calculators" element={<AdvisorOnlyRoute><CalculatorsHome /></AdvisorOnlyRoute>} />
                  <Route path="calculators/compound-interest" element={<AdvisorOnlyRoute><CompoundInterestCalc /></AdvisorOnlyRoute>} />
                  <Route path="calculators/tvm" element={<AdvisorOnlyRoute><TvmCalc /></AdvisorOnlyRoute>} />
                  <Route path="calculators/roi" element={<AdvisorOnlyRoute><RoiCalc /></AdvisorOnlyRoute>} />
                  <Route path="calculators/tax" element={<AdvisorOnlyRoute><TaxCalc /></AdvisorOnlyRoute>} />
                  <Route path="calculators/cpf" element={<AdvisorOnlyRoute><CpfCalc /></AdvisorOnlyRoute>} />
                  <Route path="calculators/salary" element={<AdvisorOnlyRoute><SalaryCalc /></AdvisorOnlyRoute>} />
                  <Route path="calculators/retirement" element={<AdvisorOnlyRoute><RetirementCalc /></AdvisorOnlyRoute>} />
                  <Route path="calculators/goal-savings" element={<AdvisorOnlyRoute><GoalSavingsCalc /></AdvisorOnlyRoute>} />
                  <Route path="calculators/premium-financing" element={<AdvisorOnlyRoute><PremiumFinancingCalc /></AdvisorOnlyRoute>} />
                  <Route path="news" element={<AdvisorOnlyRoute><News /></AdvisorOnlyRoute>} />
                  <Route path="fund-tools" element={<AdvisorOnlyRoute><FundTools /></AdvisorOnlyRoute>} />
                  <Route path="knowledge" element={<AdvisorOnlyRoute><Knowledge /></AdvisorOnlyRoute>} />
                  <Route
                    path="clients/:clientId"
                    element={
                      <ClientModeRestrictedRoute>
                        <ClientProfile />
                      </ClientModeRestrictedRoute>
                    }
                  >
                    <Route index element={<Navigate to="basic-info" replace />} />
                    <Route path="basic-info" element={<BasicInfoTab />} />
                    <Route path="meetings" element={<MeetingLogTab />} />
                    <Route path="fact-find" element={<FactFindTab />} />
                    <Route path="portfolio" element={<PortfolioTab />} />
                    <Route path="household" element={<HouseholdTab />} />
                    <Route path="report" element={<ReportTab />} />
                  </Route>
                  <Route path="*" element={<NotFound />} />
                </Route>
              </Routes>
            </Suspense>
          </Gate>
        </BrowserRouter>
        </ErrorBoundary>
      </AppModeProvider>
    </AuthProvider>
    </ThemeProvider>
  );
}
