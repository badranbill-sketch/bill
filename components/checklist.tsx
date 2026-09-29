"use client";
import { useState } from "react";
import type { Language } from "@/lib/business";
import { questions, discussionTopics, type Answer } from "@/lib/checklist";
import { MeetingLink } from "./shell-link";
export function Checklist({ lang }: { lang: Language }) {
  const fr = lang === "fr";
  const [answers, setAnswers] = useState<Answer[]>([
    null,
    null,
    null,
    null,
    null,
  ]);
  const [agenda, setAgenda] = useState("");
  const [edited, setEdited] = useState(false);
  const unanswered = answers.filter((a) => a === null).length;
  function answer(i: number, value: Answer) {
    const next = answers.map((a, j) => (i === j ? value : a));
    setAnswers(next);
    if (!edited)
      setAgenda(
        discussionTopics(next, lang)
          .map((x) => "• " + x)
          .join("\n"),
      );
  }
  const reset = () => {
    setAnswers([null, null, null, null, null]);
    setAgenda("");
    setEdited(false);
  };
  return (
    <section
      className="section ivory checklist"
      id="preparation"
      aria-labelledby="check-title"
    >
      <div className="wrap">
        <div className="section-head">
          <p className="eyebrow">
            {fr ? "Où en êtes-vous?" : "Where do you stand?"}
          </p>
          <h2 id="check-title">
            {fr
              ? "Cinq questions pour tester votre plan de retraite."
              : "Five questions to test your retirement plan."}
          </h2>
          <p>
            {fr
              ? "Chaque «\u00a0non\u00a0» ou «\u00a0je ne sais pas\u00a0» devient un sujet pour votre première rencontre. Vos réponses restent dans cette page\u00a0: rien n’est envoyé ni enregistré."
              : "Every “no” or “I’m not sure” becomes a topic for your first meeting. Your answers stay in this page: nothing is sent or saved."}
          </p>
        </div>
        <div className="check-grid">
          <div>
            {questions[lang].map((q, i) => (
              <fieldset className="question-field" key={q}>
                <legend>
                  <span>{String(i + 1).padStart(2, "0")}</span>
                  {q}
                </legend>
                <div className="choices">
                  {(["yes", "no", "unsure"] as const).map((v, j) => (
                    <label className="choice" key={v}>
                      <input
                        type="radio"
                        name={`question-${i}`}
                        value={v}
                        checked={answers[i] === v}
                        onChange={() => answer(i, v)}
                      />
                      {
                        (fr
                          ? ["Oui", "Non", "Je ne sais pas"]
                          : ["Yes", "No", "I’m not sure"])[j]
                      }
                    </label>
                  ))}
                </div>
                {answers[i] === null && (
                  <div className="unanswered">
                    {fr ? "Sans réponse" : "Unanswered"}
                  </div>
                )}
              </fieldset>
            ))}
          </div>
          <aside className="agenda">
            <h3>{fr ? "Votre liste de discussion" : "Your discussion list"}</h3>
            <p aria-live="polite">
              {fr
                ? `${unanswered} question${unanswered > 1 ? "s" : ""} sans réponse.`
                : `${unanswered} unanswered question${unanswered !== 1 ? "s" : ""}.`}
            </p>
            <label htmlFor="agenda">
              {fr
                ? "Sujets à discuter — modifiables"
                : "Topics to discuss — editable"}
            </label>
            <textarea
              id="agenda"
              value={agenda}
              onChange={(e) => {
                setAgenda(e.target.value);
                setEdited(true);
              }}
              placeholder={
                fr
                  ? "Les «\u00a0non\u00a0» et «\u00a0je ne sais pas\u00a0» ajoutent des sujets ici."
                  : "“No” and “I’m not sure” add topics here."
              }
            />
            <div className="print-agenda">
              {agenda || (fr ? "Aucun sujet ajouté." : "No topics added.")}
            </div>
            {edited && (
              <button
                className="plain-button"
                onClick={() => {
                  setEdited(false);
                  setAgenda(
                    discussionTopics(answers, lang)
                      .map((x) => "• " + x)
                      .join("\n"),
                  );
                }}
              >
                {fr
                  ? "Recréer la liste à partir des réponses"
                  : "Rebuild list from answers"}
              </button>
            )}
            <p>
              {fr
                ? "Même cinq «\u00a0oui\u00a0» ne permettent pas de conclure que vous êtes prêt à la retraite. Cette liste sert à amorcer la conversation."
                : "Even five “yes” answers do not establish retirement readiness. Use this list to start the conversation."}
            </p>
            <div className="actions">
              <button className="plain-button" onClick={reset}>
                {fr ? "Réinitialiser" : "Reset"}
              </button>
              <button className="plain-button" onClick={() => window.print()}>
                {fr ? "Imprimer la liste" : "Print list"}
              </button>
            </div>
            <MeetingLink lang={lang} />
          </aside>
        </div>
        <noscript>
          <p>
            {fr
              ? "Activez JavaScript pour composer une liste interactive, ou notez ces questions sur papier."
              : "Enable JavaScript to create an interactive list, or write down these questions."}
          </p>
        </noscript>
      </div>
    </section>
  );
}
