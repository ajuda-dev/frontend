import type { ReactNode } from "react";
import { Link } from "react-router";
import { useAuth } from "../../context/useAuth";
import {
  EMAIL_VERIFICATION_REQUIRED_MESSAGE,
  isEmailVerified,
} from "../../utils/emailVerification";

export function EmailVerificationRequired() {
  return (
    <div role="status" className="border-warning bg-surface rounded-md border px-4 py-3">
      <p className="text-ink-muted text-sm">
        {EMAIL_VERIFICATION_REQUIRED_MESSAGE}{" "}
        <Link to="/confirmar-email" className="text-brand hover:underline">
          Confirmar e-mail
        </Link>
      </p>
    </div>
  );
}

export function EmailVerificationGate({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (isEmailVerified(user)) return children;
  return <EmailVerificationRequired />;
}
