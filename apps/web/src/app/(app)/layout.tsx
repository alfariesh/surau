import type { ReactNode } from "react";

import { SurauShell } from "../../components/shell/surau-shell";

export default function AppGroupLayout({ children }: { children: ReactNode }) {
  return <SurauShell>{children}</SurauShell>;
}
