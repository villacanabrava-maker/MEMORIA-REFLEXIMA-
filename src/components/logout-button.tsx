"use client";

import { useActionState } from "react";
import { logout } from "@/app/auth-actions";

export function LogoutButton() {
  const [state, action, pending] = useActionState(logout, { message: "" });
  return <form action={action} className="logout-form"><button type="submit" className="workspace-button neutral" disabled={pending}>{pending ? "Saindo…" : "Sair"}</button>{state.message ? <p role="alert">{state.message}</p> : null}</form>;
}
