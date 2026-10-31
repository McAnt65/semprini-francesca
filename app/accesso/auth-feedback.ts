export function authenticationFailure(error: unknown, acceptingInvite: boolean): string {
  const status = typeof error === "object" && error !== null && "status" in error ? Number(error.status) : 0;
  const code = status >= 400 && status <= 599 ? ` (codice ${status})` : "";
  if (acceptingInvite) {
    if (status === 422) return `Invito non accettato: il servizio ha rifiutato l’invito o la password${code}. Non ripetere l’invio: comunica questo messaggio per il controllo.`;
    if (status === 400 || status === 401 || status === 403 || status === 404) return `Invito non accettato${code}. Il collegamento potrebbe essere già utilizzato o non più valido. Apri la pagina di accesso per verificare l’account.`;
    return `Impossibile completare l’invito${code}. Potrebbe esserci un problema di connessione o del servizio. Non cambiare password per tentativi.`;
  }
  return `Accesso non riuscito${code}. Controlla le credenziali; se il problema continua, comunica questo messaggio.`;
}
