"use client";
import { useRef, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { business, type Language } from "@/lib/business";
import { pathFor } from "@/lib/routes";
export function Inquiry({
  lang,
  enabled,
}: {
  lang: Language;
  enabled: boolean;
}) {
  const fr = lang === "fr",
    [status, setStatus] = useState(""),
    [pending, setPending] = useState(false),
    [accepted, setAccepted] = useState(false);
  const sending = useRef(false);
  const request = useRef({ body: "", id: "" });
  async function send(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (sending.current || accepted) return;
    sending.current = true;
    setPending(true);
    setStatus("");
    const form = new FormData(e.currentTarget);
    const fields = {
      name: form.get("name"),
      email: form.get("email"),
      topic: form.get("topic"),
      message: form.get("message"),
      website: form.get("website"),
      language: lang,
    };
    const key = JSON.stringify(fields);
    if (request.current.body !== key)
      request.current = { body: key, id: crypto.randomUUID() };
    try {
      const response = await fetch("/api/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...fields, requestId: request.current.id }),
        signal: AbortSignal.timeout(15000),
      });
      const result = await response.json();
      if (response.status === 202 && result.code === "accepted") {
        setAccepted(true);
        setStatus(
          fr
            ? "Votre demande a été acceptée par le service d’envoi. Cela ne confirme pas un rendez-vous ni la livraison dans la boîte de réception."
            : "Your request was accepted by the sending service. This does not confirm an appointment or inbox delivery.",
        );
      } else {
        const codes: Record<string, string> = {
          validation: fr
            ? "Vérifiez les champs, puis réessayez."
            : "Check the fields and try again.",
          rate_limited: fr
            ? "Trop de tentatives. Réessayez dans 10 minutes ou contactez Bill directement."
            : "Too many attempts. Try again in 10 minutes or contact Bill directly.",
        };
        setStatus(
          codes[result.code] ||
            (fr
              ? "L’envoi n’a pas été confirmé. Vos renseignements sont conservés dans ce formulaire. Réessayez ou utilisez le courriel ou le téléphone."
              : "Sending was not confirmed. Your entries remain in this form. Retry or use email or phone."),
        );
      }
    } catch {
      setStatus(
        fr
          ? "L’envoi n’a pas été confirmé. Vos renseignements sont conservés. Réessayez avec le même message ou contactez Bill directement."
          : "Sending was not confirmed. Your entries remain here. Retry with the same message or contact Bill directly.",
      );
    } finally {
      setPending(false);
      sending.current = false;
    }
  }
  return (
    <form className="inquiry" onSubmit={send}>
      <h3>
        {fr ? "Demander à Bill de vous contacter" : "Ask Bill to contact you"}
      </h3>
      {!enabled && (
        <div className="notice">
          {fr
            ? "Le formulaire est temporairement indisponible. Vous pouvez joindre Bill par "
            : "The form is currently unavailable. Reach Bill by "}
          <a href={`mailto:${business.email}`}>{fr ? "courriel" : "email"}</a>
          {fr ? " ou au " : " or at "}
          <a href={`tel:${business.tel}`}>{business.phone}</a>.
        </div>
      )}
      <fieldset
        disabled={!enabled || pending || accepted}
        style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}
      >
        <div className="field">
          <label htmlFor="name">{fr ? "Votre nom" : "Your name"}</label>
          <input
            id="name"
            name="name"
            autoComplete="name"
            required
            maxLength={100}
          />
        </div>
        <div className="field">
          <label htmlFor="email">{fr ? "Courriel" : "Email"}</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
          />
        </div>
        <div className="field">
          <label htmlFor="topic">{fr ? "Votre sujet" : "Your topic"}</label>
          <select id="topic" name="topic">
            <option value="retirement">
              {fr
                ? "Puis-je prendre ma retraite, et quand?"
                : "Can I retire, and when?"}
            </option>
            <option value="income">
              {fr
                ? "Revenu de retraite et impôts"
                : "Retirement income and taxes"}
            </option>
            <option value="investments">
              {fr
                ? "Mes placements avant et pendant la retraite"
                : "Investing before and during retirement"}
            </option>
            <option value="other">
              {fr
                ? "Autre chose (conjoint, succession, entreprise…)"
                : "Something else (spouse, estate, business…)"}
            </option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="message">
            {fr
              ? "Qu’aimeriez-vous clarifier?"
              : "What would you like to figure out?"}
          </label>
          <textarea
            id="message"
            name="message"
            required
            maxLength={2000}
            aria-describedby="message-hint"
          />
        </div>
        <div className="honeypot" aria-hidden="true">
          <label htmlFor="website">Website</label>
          <input id="website" name="website" tabIndex={-1} autoComplete="off" />
        </div>
        <p id="message-hint" className="form-hint">
          {fr
            ? "N’incluez ni numéros de compte ni relevés. Cet envoi ne vous inscrit à aucune liste."
            : "Please leave out account numbers and statements. Sending this doesn’t add you to any mailing list."}
        </p>
        <p className="form-hint">
          <Link href={pathFor(lang, "privacy")}>
            {fr
              ? "Utilisation de vos renseignements"
              : "How your information is used"}
          </Link>
        </p>
        <button className="button" type="submit">
          {pending
            ? fr
              ? "Envoi en cours…"
              : "Sending…"
            : accepted
              ? fr
                ? "Demande acceptée"
                : "Request accepted"
              : fr
                ? "Envoyer la demande"
                : "Send request"}
          <span aria-hidden="true">→</span>
        </button>
      </fieldset>
      <p
        className={`status ${status && !accepted ? "error" : ""}`}
        role="status"
        aria-live="polite"
      >
        {status}
      </p>
      <noscript>
        <p>
          {fr
            ? "Pour nous joindre sans JavaScript, utilisez le téléphone ou le courriel."
            : "Use phone or email to contact us without JavaScript."}
        </p>
      </noscript>
    </form>
  );
}
