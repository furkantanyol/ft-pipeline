import { SetupWizard } from "@/components/setup-wizard";

export default function SetupPage() {
  return (
    <div className="py-8">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Create a project
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Set up your fine-tuning project in a few steps
        </p>
      </div>
      <SetupWizard />
    </div>
  );
}
