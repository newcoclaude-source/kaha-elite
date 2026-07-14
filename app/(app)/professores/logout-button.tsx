"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function LogoutButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  function sair() {
    startTransition(async () => {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.replace("/login");
      router.refresh();
    });
  }
  return (
    <button
      type="button"
      onClick={sair}
      disabled={pending}
      className="text-xs font-medium uppercase tracking-wide text-muted-2 transition-colors hover:text-muted disabled:opacity-60"
    >
      {pending ? "Saindo…" : "Sair"}
    </button>
  );
}
