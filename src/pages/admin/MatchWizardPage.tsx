import { MatchWizard } from "@/components/match-wizard/MatchWizard";
import { MatchWizardProvider } from "@/context/MatchWizardContext";

const MatchWizardPage = () => (
  <MatchWizardProvider>
    <MatchWizard />
  </MatchWizardProvider>
);

export default MatchWizardPage;

