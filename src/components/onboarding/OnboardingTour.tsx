import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";
import { useOnboarding } from "../../hooks/useOnboarding";

export function OnboardingTour() {
  const { open, stepIndex, steps, dismiss, next, back } = useOnboarding();
  const step = steps[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === steps.length - 1;
  const total = steps.length;

  if (!step) return null;

  return (
    <Modal
      open={open}
      title={step.title}
      onClose={dismiss}
      size="lg"
      footer={
        <div className="flex w-full items-center justify-between gap-2">
          <div>
            {!isLast ? (
              <Button type="button" variant="ghost" onClick={dismiss}>
                Pular
              </Button>
            ) : null}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={back} disabled={isFirst}>
              Voltar
            </Button>
            {isLast ? (
              <Button type="button" onClick={dismiss}>
                Começar
              </Button>
            ) : (
              <Button type="button" onClick={next}>
                Próximo
              </Button>
            )}
          </div>
        </div>
      }
    >
      <ul className="flex flex-col gap-2">
        {step.body.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-ink-muted text-xs">
          {stepIndex + 1} / {total}
        </p>
        <div className="flex gap-1" aria-hidden="true">
          {steps.map((item, index) => (
            <span
              key={item.id}
              className={`h-1.5 w-1.5 rounded-full ${index === stepIndex ? "bg-brand" : "bg-surface-2"}`}
            />
          ))}
        </div>
      </div>
    </Modal>
  );
}
